"""Clientes HTTP hacia los microservicios. Solo el gateway conoce sus contratos REST."""
import asyncio
import logging
import os
from time import monotonic, perf_counter
from typing import Any, Optional

import httpx

log = logging.getLogger("gateway.upstream")

SERVICES = {
    "users": os.environ.get("USERS_URL", "http://localhost:8001"),
    "channels": os.environ.get("CHANNELS_URL", "http://localhost:8002"),
    "messages": os.environ.get("MESSAGES_URL", "http://localhost:8003"),
    "integrals": os.environ.get("INTEGRALS_URL", "http://localhost:8004"),
    "threads": os.environ.get("THREADS_URL", "http://localhost:8005"),
    "polls": os.environ.get("POLLS_URL", "http://localhost:8006"),
}
TIMEOUT = float(os.environ.get("UPSTREAM_TIMEOUT_SECONDS", "12"))  # integrals calcula hasta 10 s
CONNECT_TIMEOUT = 2.0
BREAKER_SECONDS = float(os.environ.get("BREAKER_SECONDS", "5"))


class UpstreamError(Exception):
    """Error de un microservicio. `extensions` llega al cliente en el error GraphQL."""

    def __init__(self, service: str, message: str, status: Optional[int] = None):
        super().__init__(message)
        self.service, self.status = service, status
        self.extensions = {
            "code": "SERVICE_UNAVAILABLE" if status is None else "UPSTREAM_ERROR",
            "service": service,
            "status": status,
        }


def _detail(response: httpx.Response) -> str:
    """Saca un mensaje legible de los distintos formatos de error de cada equipo."""
    try:
        body = response.json()
    except ValueError:
        return response.text[:200] or response.reason_phrase
    if isinstance(body, dict):
        detail = body.get("detail", body.get("message"))
        if isinstance(detail, list):  # validación de FastAPI
            return "; ".join(str(item.get("msg", item)) for item in detail)
        if isinstance(detail, dict):
            return str(detail.get("message") or detail)
        if detail:
            return str(detail)
    return str(body)[:200]


class Upstream:
    """Cliente común. Si un servicio no responde, se considera caído por `BREAKER_SECONDS`
    y las llamadas fallan de inmediato (circuit breaker) en vez de esperar cada timeout."""

    def __init__(self, client: httpx.AsyncClient):
        self.client = client
        self.down_until: dict[str, float] = {}

    async def request(self, service: str, method: str, path: str,
                      json: Any = None, params: Optional[dict] = None,
                      headers: Optional[dict] = None, not_found_none: bool = False) -> Any:
        url = SERVICES[service] + path
        unavailable = f"El servicio {service} no está disponible."
        if self.down_until.get(service, 0) > monotonic():
            raise UpstreamError(service, unavailable)
        started = perf_counter()
        for attempt in (1, 2):
            try:
                response = await self.client.request(
                    method, url, json=json, params=params, headers=headers,
                    timeout=httpx.Timeout(TIMEOUT, connect=CONNECT_TIMEOUT))
                break
            except httpx.RemoteProtocolError as exc:
                # Conexión reutilizada que el servidor ya cerró: una lectura se reintenta.
                if method == "GET" and attempt == 1:
                    continue
                log.warning("%s %s -> conexión cerrada", method, url)
                raise UpstreamError(service, unavailable) from exc
            except httpx.HTTPError as exc:
                log.warning("%s %s -> sin respuesta (%s)", method, url, type(exc).__name__)
                if isinstance(exc, (httpx.ConnectError, httpx.ConnectTimeout)):
                    self.down_until[service] = monotonic() + BREAKER_SECONDS
                raise UpstreamError(service, unavailable) from exc
        self.down_until.pop(service, None)
        log.info("%s %s -> %s (%d ms)", method, url, response.status_code,
                 (perf_counter() - started) * 1000)
        if response.status_code == 404 and not_found_none:
            return None
        if response.status_code >= 400:
            raise UpstreamError(service, _detail(response), response.status_code)
        return response.json()

    def get(self, service: str, path: str, **kwargs) -> Any:
        return self.request(service, "GET", path, **kwargs)

    def post(self, service: str, path: str, json: Any = None, **kwargs) -> Any:
        return self.request(service, "POST", path, json=json, **kwargs)

    async def health(self, service: str) -> dict:
        started = perf_counter()
        try:
            response = await self.client.get(SERVICES[service] + "/health", timeout=2)
            up = response.status_code == 200
        except httpx.HTTPError:
            up = False
        if up:
            self.down_until.pop(service, None)  # se recuperó: cerrar el circuito
        return {"name": service, "up": up,
                "latency_ms": round((perf_counter() - started) * 1000) if up else None}


class RequestCache:
    """Deduplica lecturas dentro de una misma consulta GraphQL (p. ej. el autor de 30 mensajes)."""

    def __init__(self):
        self._tasks: dict[tuple, asyncio.Task] = {}

    def once(self, key: tuple, factory) -> asyncio.Task:
        if key not in self._tasks:
            self._tasks[key] = asyncio.ensure_future(factory())
        return self._tasks[key]
