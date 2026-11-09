import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from ariadne import load_schema_from_path, make_executable_schema
from ariadne.asgi import GraphQL
from ariadne.asgi.handlers import GraphQLHTTPHandler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from .resolvers import bindables
from .upstream import RequestCache, Upstream

logging.basicConfig(level=os.environ.get("LOG_LEVEL", "INFO"),
                    format="%(asctime)s %(levelname)s %(name)s: %(message)s")

type_defs = load_schema_from_path(str(Path(__file__).parent / "schema"))
schema = make_executable_schema(type_defs, *bindables, convert_names_case=True)


class HTTPHandler(GraphQLHTTPHandler):
    """Responde 200 aunque la consulta falle: el detalle va en `errors` (con el servicio
    que falló en `extensions`), así el cliente lo muestra en vez de un error de red."""

    async def create_json_response(self, request, result, success):
        return JSONResponse(result)


def create_app(transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        # Los servicios usan uvicorn (keep-alive de 5 s): se descartan antes las conexiones ociosas.
        limits = httpx.Limits(keepalive_expiry=2)
        async with httpx.AsyncClient(transport=transport, follow_redirects=False,
                                     limits=limits) as client:
            app.state.upstream = Upstream(client)
            yield

    app = FastAPI(title="Chat API Gateway", version="1.0.0", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=["*"],
                       allow_methods=["GET", "POST", "OPTIONS"], allow_headers=["*"])

    def context(request, _data=None):
        return {"up": request.app.state.upstream, "cache": RequestCache()}

    graphql = GraphQL(schema, context_value=context, http_handler=HTTPHandler(),
                      debug=os.environ.get("GRAPHQL_DEBUG") == "1")

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.add_route("/graphql", graphql, methods=["GET", "POST", "OPTIONS"])
    return app


app = create_app()
