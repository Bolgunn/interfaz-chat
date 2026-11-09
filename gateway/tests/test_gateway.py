"""Pruebas del gateway con servicios simulados (httpx.MockTransport, sin red)."""
import json

import httpx
import pytest
from fastapi.testclient import TestClient

from app.main import create_app

POLL_ID = "123e4567-e89b-12d3-a456-426614174000"
POLL = {
    "poll_id": POLL_ID, "channel_id": "c1", "author_id": "u1", "question": "¿Pizza?",
    "options": [
        {"option_id": "o2", "position": 1, "text": "No", "vote_count": 0},
        {"option_id": "o1", "position": 0, "text": "Sí", "vote_count": 2},
    ],
    "status": "open", "duration_minutes": 5, "closes_at": "2026-11-08T12:05:00Z",
    "created_at": "2026-11-08T12:00:00Z", "closed_at": None, "total_votes": 2,
    "creation_error": None,
}
MESSAGES = [
    {"id": "m2", "channel_id": "c1", "author_id": "u1", "created_at": "2026-11-08T12:00:02",
     "content": f"📊 Nueva encuesta: ¿Pizza?\nPoll ID: {POLL_ID}\nAlternativas:\n- Sí\n- No"},
    {"id": "m1", "channel_id": "c1", "author_id": "u1", "created_at": "2026-11-08T12:00:01",
     "content": "hola"},
]


def make_client(down: frozenset = frozenset(), calls: list | None = None):
    calls = calls if calls is not None else []

    def handler(request: httpx.Request) -> httpx.Response:
        host, path = request.url.host, request.url.path
        calls.append((request.method, str(request.url)))
        service = {8001: "users", 8002: "channels", 8003: "messages", 8004: "integrals",
                   8005: "threads", 8006: "polls"}[request.url.port]
        if service in down:
            raise httpx.ConnectError("down", request=request)
        if path == "/health":
            return httpx.Response(200, json={"status": "ok"})
        if service == "users" and path == "/api/v1/users/u1":
            return httpx.Response(200, json={"id": "u1", "display_name": "ana"})
        if service == "users" and request.method == "POST":
            body = json.loads(request.content)
            return httpx.Response(201, json={"id": "u9", **body})
        if service == "messages" and path == "/api/v1/channels/c1/messages":
            return httpx.Response(200, json=MESSAGES)
        if service == "threads" and path.endswith("/replies"):
            return httpx.Response(200, json=[{"id": "r1"}] if "/m1/" in path else [])
        if service == "polls" and path == f"/api/v1/polls/{POLL_ID}":
            return httpx.Response(200, json=POLL)
        if service == "polls" and path.endswith("/votes"):
            return httpx.Response(409, json={"detail": "Voter has already voted"})
        if service == "polls" and path == "/api/v1/polls":
            assert request.headers["Idempotency-Key"]
            return httpx.Response(201, json=POLL)
        if service == "integrals" and request.method == "POST":
            return httpx.Response(201, json={
                "id": "i1", "latex": "x", "status": "calculated",
                "result": {"latex": "\\frac{x^{2}}{2}", "numeric": None, "indefinite": True},
                "error": None, "source": {"kind": "rest"}, "duration_ms": 3,
                "created_at": "2026-11-08T12:00:00Z"})
        return httpx.Response(404, json={"detail": "Not found"})

    return TestClient(create_app(httpx.MockTransport(handler)))


def gql(client, query, variables=None):
    response = client.post("/graphql", json={"query": query, "variables": variables or {}})
    assert response.status_code == 200
    return response.json()


MESSAGES_QUERY = """query($c: ID!) { messages(channelId: $c) {
  id content author { displayName } pollId poll { id question options { id text voteCount } }
  replyCount } }"""


def test_messages_aggregate_author_poll_and_replies():
    with make_client() as client:
        body = gql(client, MESSAGES_QUERY, {"c": "c1"})
    assert "errors" not in body
    m1, m2 = body["data"]["messages"]
    assert m1["id"] == "m1" and m1["author"]["displayName"] == "ana"
    assert m1["replyCount"] == 1 and m1["poll"] is None
    assert m2["pollId"] == POLL_ID
    assert [o["text"] for o in m2["poll"]["options"]] == ["Sí", "No"]


def test_author_is_fetched_once_per_query():
    calls = []
    with make_client(calls=calls) as client:
        gql(client, MESSAGES_QUERY, {"c": "c1"})
    assert sum(1 for _, url in calls if url.endswith("/api/v1/users/u1")) == 1


def test_chat_survives_threads_users_and_polls_down():
    with make_client(down=frozenset({"threads", "users", "polls"})) as client:
        body = gql(client, MESSAGES_QUERY, {"c": "c1"})
    assert "errors" not in body
    for message in body["data"]["messages"]:
        assert message["author"] is None and message["replyCount"] is None
        assert message["poll"] is None


def test_service_down_is_a_graphql_error():
    with make_client(down=frozenset({"messages"})) as client:
        body = gql(client, MESSAGES_QUERY, {"c": "c1"})
    assert body["data"] is None
    ext = body["errors"][0]["extensions"]
    assert ext["code"] == "SERVICE_UNAVAILABLE" and ext["service"] == "messages"


def test_upstream_error_detail_is_forwarded():
    with make_client() as client:
        body = gql(client, """mutation { votePoll(pollId: "%s", voterId: "u1", optionId: "o1")
                   { id } }""" % POLL_ID)
    assert body["errors"][0]["message"] == "Voter has already voted"
    assert body["errors"][0]["extensions"]["status"] == 409


def test_mutations_translate_names():
    with make_client() as client:
        user = gql(client, 'mutation { createUser(displayName: " bea ") { id displayName } }')
        poll = gql(client, """mutation { createPoll(input: {channelId: "c1", authorId: "u1",
                   question: "¿Pizza?", options: ["Sí", "No", " "]}) { id status totalVotes } }""")
        integral = gql(client, 'mutation { calculateIntegral(latex: "x") '
                               '{ id durationMs result { latex indefinite } } }')
    assert user["data"]["createUser"] == {"id": "u9", "displayName": "bea"}
    assert poll["data"]["createPoll"] == {"id": POLL_ID, "status": "open", "totalVotes": 2}
    assert integral["data"]["calculateIntegral"]["durationMs"] == 3


def test_polls_of_channel_from_announcements():
    with make_client() as client:
        body = gql(client, 'query { polls(channelId: "c1") { id author { displayName } } }')
    assert body["data"]["polls"] == [{"id": POLL_ID, "author": {"displayName": "ana"}}]


def test_services_status():
    with make_client(down=frozenset({"polls"})) as client:
        body = gql(client, "{ services { name up } }")
    status = {s["name"]: s["up"] for s in body["data"]["services"]}
    assert status["polls"] is False and status["users"] is True and len(status) == 6


def test_circuit_breaker_skips_calls_to_a_down_service():
    calls = []
    with make_client(down=frozenset({"threads"}), calls=calls) as client:
        gql(client, MESSAGES_QUERY, {"c": "c1"})
        first = sum(1 for _, url in calls if ":8005/" in url)
        body = gql(client, MESSAGES_QUERY, {"c": "c1"})
    # La segunda consulta no vuelve a llamar a threads: falla al instante con null.
    assert first >= 1 and sum(1 for _, url in calls if ":8005/" in url) == first
    assert all(m["replyCount"] is None for m in body["data"]["messages"])
