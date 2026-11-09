"""Resolvers GraphQL. Cada dominio llama solo a la API REST del servicio dueño del dato.

Los campos que agregan datos de otro servicio (autor, encuesta, cantidad de respuestas)
devuelven null si ese servicio falla: el chat sigue funcionando con un servicio caído.
"""
import asyncio
import logging
import os
import re
from typing import Any, Optional
from uuid import uuid4

from ariadne import MutationType, ObjectType, QueryType

from .upstream import SERVICES, UpstreamError

log = logging.getLogger("gateway.resolvers")

query = QueryType()
mutation = MutationType()
message_type = ObjectType("Message")
reply_type = ObjectType("Reply")
poll_type = ObjectType("Poll")

POLL_ID = re.compile(r"Poll ID:\s*([0-9a-fA-F-]{36})")


def _ctx(info):
    return info.context["up"], info.context["cache"]


async def _soft(coro, what: str) -> Any:
    """Ejecuta una lectura secundaria; si su servicio falla devuelve None."""
    try:
        return await coro
    except UpstreamError as exc:
        log.info("%s no disponible: %s", what, exc)
        return None


def _poll(data: dict) -> dict:
    """Adapta la representación de Polls (poll_id, option_id) a la del esquema (id)."""
    data = {**data, "id": data["poll_id"]}
    data["options"] = [{**o, "id": o["option_id"]}
                       for o in sorted(data.get("options", []), key=lambda o: o["position"])]
    return data


# ---------- estado ----------

@query.field("health")
def resolve_health(*_):
    return "ok"


@query.field("services")
async def resolve_services(_, info):
    up, _cache = _ctx(info)
    return await asyncio.gather(*(up.health(name) for name in SERVICES))


# ---------- chat base: users, channels, messages ----------

def _get_user(info, user_id: str):
    up, cache = _ctx(info)
    return cache.once(("user", user_id),
                      lambda: up.get("users", f"/api/v1/users/{user_id}", not_found_none=True))


@query.field("user")
async def resolve_user(_, info, id: str):
    return await _get_user(info, id)


@mutation.field("createUser")
async def resolve_create_user(_, info, display_name: str):
    up, _cache = _ctx(info)
    return await up.post("users", "/api/v1/users", {"display_name": display_name.strip()})


@query.field("channels")
async def resolve_channels(_, info):
    up, _cache = _ctx(info)
    return await up.get("channels", "/api/v1/channels")


@query.field("channel")
async def resolve_channel(_, info, id: str):
    up, _cache = _ctx(info)
    return await up.get("channels", f"/api/v1/channels/{id}", not_found_none=True)


@mutation.field("createChannel")
async def resolve_create_channel(_, info, name: str):
    up, _cache = _ctx(info)
    return await up.post("channels", "/api/v1/channels", {"name": name.strip()})


def _get_messages(info, channel_id: str):
    up, cache = _ctx(info)
    return cache.once(("messages", channel_id),
                      lambda: up.get("messages", f"/api/v1/channels/{channel_id}/messages"))


@query.field("messages")
async def resolve_messages(_, info, channel_id: str):
    messages = await _get_messages(info, channel_id)
    return sorted(messages, key=lambda m: m.get("created_at", ""))


@mutation.field("sendMessage")
async def resolve_send_message(_, info, channel_id: str, author_id: str, content: str):
    up, _cache = _ctx(info)
    message = await up.post("messages", f"/api/v1/channels/{channel_id}/messages",
                            {"author_id": author_id, "content": content})
    latex = parse_command(content)
    if BOT_ID and latex is not None and author_id != BOT_ID:
        # Respuesta en segundo plano: el cálculo puede tardar y el mensaje ya se envió.
        task = asyncio.create_task(_bot_reply(up, channel_id, latex))
        _bot_tasks.add(task)
        task.add_done_callback(_bot_tasks.discard)
    return message


# ---------- integralbot (respaldo sin eventos) ----------
# Donde `messages` no publica `chat.message.created` (clúster del curso), el gateway hace lo
# que haría el consumidor de integrals: calcula por REST y responde como `integralbot`.
# Se activa solo si INTEGRALBOT_ID está definido; en local responde el bot real por RabbitMQ.

BOT_ID = os.environ.get("INTEGRALBOT_ID") or None
USAGE = "Uso: /integralcalc <latex>. Ejemplo: /integralcalc \\int_0^1 x^2 \\, dx"
COMMAND = re.compile(r"^/(?:integralcalc|integral)(?=\s|$)\s*(.*)$", re.DOTALL)
_bot_tasks: set = set()


def parse_command(content: Any) -> Optional[str]:
    """LaTeX del comando, "" si falta, o None si no es un comando (igual que integrals)."""
    if not isinstance(content, str):
        return None
    match = COMMAND.match(content.strip())
    if match is None:
        return None
    latex = match.group(1).strip()
    if len(latex) >= 2 and latex.startswith("$") and latex.endswith("$"):
        latex = latex.strip("$").strip()
    return latex


def format_reply(integral: dict) -> str:
    if integral["status"] == "failed":
        return f"No pude calcular la integral: {integral['error']['message']}"[:4000]
    result = integral["result"]
    text = f"{integral['latex']} = {result['latex']}"
    if result["indefinite"]:
        text += " + C"
    if result.get("numeric") is not None:
        text += f" ≈ {result['numeric']:.10g}"
    return text[:4000]


async def _bot_reply(up, channel_id: str, latex: str) -> None:
    if latex == "":
        text = USAGE
    else:
        try:
            text = format_reply(await up.post("integrals", "/api/v1/integrals", {"latex": latex}))
        except UpstreamError as exc:
            text = f"No pude calcular la integral: {exc}"
    try:
        await up.post("messages", f"/api/v1/channels/{channel_id}/messages",
                      {"author_id": BOT_ID, "content": text})
    except UpstreamError as exc:
        log.warning("integralbot no pudo responder en %s: %s", channel_id, exc)


async def resolve_author(obj, info):
    return await _soft(_get_user(info, obj["author_id"]), "users")

message_type.set_field("author", resolve_author)
reply_type.set_field("author", resolve_author)
poll_type.set_field("author", resolve_author)


@message_type.field("pollId")
def resolve_message_poll_id(obj, _info):
    match = POLL_ID.search(obj.get("content", ""))
    return match.group(1).lower() if match else None


@message_type.field("poll")
async def resolve_message_poll(obj, info):
    poll_id = resolve_message_poll_id(obj, info)
    if poll_id is None:
        return None
    return await _soft(_get_poll(info, poll_id), "polls")


@message_type.field("replyCount")
async def resolve_reply_count(obj, info):
    replies = await _soft(_get_replies(info, obj["channel_id"], obj["id"]), "threads")
    return None if replies is None else len(replies)


# ---------- threads ----------

def _get_replies(info, channel_id: str, message_id: str):
    up, cache = _ctx(info)
    return cache.once(("replies", channel_id, message_id), lambda: up.get(
        "threads", f"/api/v1/channels/{channel_id}/messages/{message_id}/replies"))


@query.field("replies")
async def resolve_replies(_, info, channel_id: str, message_id: str):
    return await _get_replies(info, channel_id, message_id)


@mutation.field("createReply")
async def resolve_create_reply(_, info, channel_id: str, message_id: str,
                               author_id: str, content: str):
    up, _cache = _ctx(info)
    return await up.post("threads",
                         f"/api/v1/channels/{channel_id}/messages/{message_id}/replies",
                         {"author_id": author_id, "content": content})


# ---------- integrals ----------

@query.field("integrals")
async def resolve_integrals(_, info, limit: int = 20, offset: int = 0,
                            status: Optional[str] = None):
    up, _cache = _ctx(info)
    params = {"limit": limit, "offset": offset}
    if status:
        params["status"] = status
    return await up.get("integrals", "/api/v1/integrals", params=params)


@query.field("integral")
async def resolve_integral(_, info, id: str):
    up, _cache = _ctx(info)
    return await up.get("integrals", f"/api/v1/integrals/{id}", not_found_none=True)


@mutation.field("calculateIntegral")
async def resolve_calculate_integral(_, info, latex: str):
    up, _cache = _ctx(info)
    return await up.post("integrals", "/api/v1/integrals", {"latex": latex})


# ---------- polls ----------

async def _fetch_poll(up, poll_id: str):
    data = await up.get("polls", f"/api/v1/polls/{poll_id}", not_found_none=True)
    return None if data is None else _poll(data)


def _get_poll(info, poll_id: str):
    up, cache = _ctx(info)
    return cache.once(("poll", poll_id), lambda: _fetch_poll(up, poll_id))


@query.field("poll")
async def resolve_poll(_, info, id: str):
    return await _get_poll(info, id)


@query.field("polls")
async def resolve_polls(_, info, channel_id: str):
    messages = await _get_messages(info, channel_id)
    ids = list(dict.fromkeys(m.group(1).lower() for msg in messages
                             if (m := POLL_ID.search(msg.get("content", "")))))
    polls = await asyncio.gather(*(_get_poll(info, pid) for pid in ids))
    found = [p for p in polls if p and p["channel_id"] == channel_id]
    return sorted(found, key=lambda p: p["created_at"], reverse=True)


@mutation.field("createPoll")
async def resolve_create_poll(_, info, input: dict):
    up, _cache = _ctx(info)
    body = {
        "channel_id": input["channel_id"],
        "author_id": input["author_id"],
        "question": input["question"].strip(),
        "options": [o.strip() for o in input["options"] if o.strip()],
        "duration_minutes": input.get("duration_minutes") or 5,
    }
    data = await up.post("polls", "/api/v1/polls", body,
                         headers={"Idempotency-Key": str(uuid4())})
    return _poll(data)


@mutation.field("votePoll")
async def resolve_vote_poll(_, info, poll_id: str, voter_id: str, option_id: str):
    up, _cache = _ctx(info)
    await up.post("polls", f"/api/v1/polls/{poll_id}/votes",
                  {"voter_id": voter_id, "option_id": option_id})
    return await _fetch_poll(up, poll_id)


@mutation.field("closePoll")
async def resolve_close_poll(_, info, poll_id: str, author_id: str):
    up, _cache = _ctx(info)
    return _poll(await up.post("polls", f"/api/v1/polls/{poll_id}/close",
                               {"author_id": author_id}))


bindables = [query, mutation, message_type, reply_type, poll_type]
