"""API central del sistema de baches de Santo Domingo Este."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.api.v1 import api_router
from app.core.config import settings
from app.db.session import engine

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address, default_limits=["300/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        from app.services.storage import asegurar_bucket

        asegurar_bucket()
    except Exception as exc:  # noqa: BLE001 - sin MinIO la API arranca igual
        log.warning("No se pudo preparar el bucket de evidencia: %s", exc)
    yield


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description=(
        "API del sistema movil de deteccion, geolocalizacion, reporte y priorizacion "
        "de baches en Santo Domingo Este. Ninguna deteccion de IA se publica sin "
        "validacion humana."
    ),
    lifespan=lifespan,
)
app.state.limiter = limiter

# El panel web corre en otro origen; el movil no usa CORS.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RateLimitExceeded)
async def limite_excedido(request: Request, exc: RateLimitExceeded):
    return JSONResponse({"detail": "Demasiadas solicitudes"}, status_code=429)


@app.get("/salud", tags=["salud"])
def salud():
    """Comprueba API + PostGIS. Lo usa docker-compose y la CI."""
    try:
        with engine.connect() as conn:
            postgis = conn.execute(text("SELECT PostGIS_Version()")).scalar()
        return {"estado": "ok", "postgis": postgis}
    except Exception as exc:  # noqa: BLE001
        return JSONResponse({"estado": "degradado", "detalle": str(exc)}, status_code=503)


app.include_router(api_router, prefix=settings.api_v1_prefix)
