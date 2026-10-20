"""Dependencias compartidas: sesion, idempotencia (RF-08)."""
from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.audit import RespuestaIdempotente

Db = Annotated[Session, Depends(get_db)]


def respuesta_guardada(db: Session, clave: str, ruta_http: str) -> dict | None:
    """Si la clave ya se proceso, se reemite el mismo cuerpo en vez de duplicar."""
    fila = db.get(RespuestaIdempotente, clave)
    if fila is None:
        return None
    if fila.ruta_http != ruta_http:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "La clave de idempotencia ya se uso en otra operacion",
        )
    return fila.cuerpo


def guardar_respuesta(db: Session, clave: str, ruta_http: str, status_code: int, cuerpo: dict):
    db.merge(
        RespuestaIdempotente(
            clave=clave, ruta_http=ruta_http, status_code=status_code, cuerpo=cuerpo
        )
    )
    db.flush()


IdempotencyKey = Annotated[
    str | None,
    Header(
        alias="Idempotency-Key",
        description="UUID generado por el dispositivo. Evita duplicados por reintento (RF-08).",
    ),
]
