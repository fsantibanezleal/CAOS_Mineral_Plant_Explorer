"""Site-local read-only OPC UA gateway and immutable public replay API."""
from __future__ import annotations

import asyncio

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from .config import VERSION
from .gateway import GatewayConfig, OPCReader, token_matches
from .routers import content
from .services.content import _read


def create_app(config: GatewayConfig | None = None, reader=None) -> FastAPI:
    config = config or GatewayConfig.from_env()
    app = FastAPI(title="OreBridge read-only plant gateway", version=VERSION)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(config.origins),
        allow_methods=["GET"],
        allow_headers=["Authorization"],
    )
    app.include_router(content.router)
    lock = asyncio.Lock()
    source_reader = reader
    if source_reader is None and config.endpoint:
        try:
            source_reader = OPCReader(config)
        except ValueError:
            pass  # Health/replay remain available; source returns declared 503.

    @app.get("/health")
    @app.get("/healthz")
    def health() -> dict:
        return {"status": "ok", "source_configured": bool(config.endpoint), "read_only": True}

    def document(path):
        doc = _read(path)
        if doc is None:
            raise HTTPException(503, detail={"state": "missing", "reason": {"en": "Artifact is unavailable.", "es": "Artefacto no disponible."}})
        return doc

    @app.get("/api/index")
    def index():
        return document("manifests/index.json")

    @app.get("/api/plant")
    def plant():
        return document("plant.json")

    @app.get("/api/engines")
    def engines():
        return document("engine-evidence.json")

    @app.get("/api/observations")
    async def observations(authorization: str | None = Header(default=None)):
        token = authorization[7:] if authorization and authorization.startswith("Bearer ") else None
        if not token_matches(token, config.token):
            raise HTTPException(401, detail="bearer_token_required", headers={"WWW-Authenticate": "Bearer"})
        try:
            config.validate()
            if source_reader is None:
                raise ValueError("source_not_configured")
            async with lock:
                records = await source_reader.read()
            return {"schema": "orebridge.observations/v1", "source": "site-opc-ua", "records": records}
        except ValueError as exc:
            raise HTTPException(503, detail={"state": "missing", "reason": {"en": str(exc), "es": str(exc)}}) from exc
        except Exception as exc:
            # Source addresses, certificate paths and server errors stay local.
            raise HTTPException(503, detail={"state": "missing", "reason": {"en": "Plant source is unavailable.", "es": "La fuente de planta no está disponible."}}) from exc

    return app


app = create_app()
