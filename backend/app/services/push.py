"""RF-10: notificaciones push via Expo Push Service."""
from __future__ import annotations

import logging

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import Dispositivo

log = logging.getLogger(__name__)

MENSAJES_ESTADO = {
    "recibido": "Recibimos tu reporte",
    "en_revision": "Tu reporte esta en revision",
    "validado": "Tu reporte fue validado y ya aparece en el mapa",
    "rechazado": "Tu reporte fue rechazado",
    "programado": "Tu reporte fue programado para atencion",
    "resuelto": "El bache de tu reporte fue marcado como resuelto",
}


def notificar_cambio_estado(db: Session, usuario_id, reporte_id, nuevo_estado: str) -> int:
    tokens = list(
        db.scalars(
            select(Dispositivo.expo_push_token).where(
                Dispositivo.usuario_id == usuario_id,
                Dispositivo.notificaciones_activas.is_(True),
            )
        )
    )
    if not tokens:
        return 0

    mensajes = [
        {
            "to": token,
            "title": "Baches SDE",
            "body": MENSAJES_ESTADO.get(nuevo_estado, f"Estado actualizado: {nuevo_estado}"),
            "data": {"reporte_id": str(reporte_id), "estado": nuevo_estado},
            "sound": "default",
        }
        for token in tokens
    ]

    try:
        with httpx.Client(timeout=10) as c:
            c.post(settings.expo_push_url, json=mensajes).raise_for_status()
    except httpx.HTTPError as exc:
        # No se rompe la transaccion de negocio por un fallo de notificacion.
        log.warning("Fallo el envio push: %s", exc)
        return 0
    return len(mensajes)
