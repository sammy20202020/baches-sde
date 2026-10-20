"""RF-20: registro de auditoria."""
from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from app.models.audit import Auditoria


def registrar(
    db: Session,
    *,
    accion: str,
    entidad: str,
    entidad_id: str | None = None,
    actor_id=None,
    motivo: str | None = None,
    datos: dict | None = None,
    request: Request | None = None,
) -> Auditoria:
    fila = Auditoria(
        actor_id=actor_id,
        accion=accion,
        entidad=entidad,
        entidad_id=str(entidad_id) if entidad_id else None,
        motivo=motivo,
        datos=datos,
        ip=request.client.host if request and request.client else None,
    )
    db.add(fila)
    db.flush()
    return fila
