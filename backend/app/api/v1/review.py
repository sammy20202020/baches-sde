"""RF-16, RF-17, RF-18: revision humana, fusion de duplicados y prioridad."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import Db
from app.core.security import require_role
from app.models.report import ESTADOS_PUBLICOS, EstadoReporte, Reporte
from app.models.route import Ruta
from app.models.user import Rol, Usuario
from app.schemas.report import RevisionIn
from app.services import dedupe, priority
from app.services.audit import registrar
from app.services.geo import punto
from app.services.push import notificar_cambio_estado

router = APIRouter(prefix="/revision", tags=["revision"])

Revisor = Depends(require_role(Rol.REVISOR, Rol.ADMIN))


@router.get("/pendientes")
def pendientes(db: Db, limite: int = 50, revisor: Usuario = Revisor):
    """Cola de trabajo del revisor: todo lo que aun no es publico."""
    filas = db.scalars(
        select(Reporte)
        .where(
            Reporte.estado.notin_(ESTADOS_PUBLICOS),
            Reporte.estado != EstadoReporte.RECHAZADO,
            Reporte.fusionado_en_id.is_(None),
        )
        .order_by(Reporte.creado_en.asc())
        .limit(min(limite, 200))
    ).all()

    from app.api.v1.reports import _a_salida

    return [_a_salida(r) for r in filas]


@router.get("/{reporte_id}/duplicados")
def duplicados(reporte_id: uuid.UUID, db: Db, revisor: Usuario = Revisor):
    """RF-16: propone candidatos. No fusiona: solo informa al revisor."""
    reporte = db.get(Reporte, reporte_id)
    if reporte is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reporte inexistente")
    return {"reporte_id": str(reporte_id), "candidatos": dedupe.candidatos_duplicados(db, reporte)}


@router.post("/{reporte_id}")
def revisar(
    reporte_id: uuid.UUID,
    datos: RevisionIn,
    db: Db,
    request: Request,
    revisor: Usuario = Revisor,
):
    """RF-17 + RF-18. Unico camino por el que un reporte llega al mapa publico."""
    reporte = db.get(Reporte, reporte_id)
    if reporte is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reporte inexistente")
    if reporte.publicado_en is not None and datos.decision != "fusionar":
        raise HTTPException(status.HTTP_409_CONFLICT, "El reporte ya fue publicado")

    if datos.punto_corregido:
        reporte.geom = punto(datos.punto_corregido.lat, datos.punto_corregido.lon)

    if datos.decision == "rechazar":
        reporte.estado = EstadoReporte.RECHAZADO
        reporte.publicado_en = None

    elif datos.decision == "fusionar":
        if not datos.fusionar_en_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Falta fusionar_en_id")
        destino = dedupe.fusionar(db, reporte.id, datos.fusionar_en_id)
        ruta = db.get(Ruta, destino.ruta_id) if destino.ruta_id else None
        destino.prioridad, destino.prioridad_detalle = priority.calcular(destino, ruta)

    else:  # validar
        if datos.severidad_validada is None:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Para validar se requiere severidad_validada"
            )
        reporte.severidad_validada = datos.severidad_validada
        reporte.estado = EstadoReporte.VALIDADO
        reporte.publicado_en = datetime.now(UTC)
        ruta = db.get(Ruta, reporte.ruta_id) if reporte.ruta_id else None
        reporte.prioridad, reporte.prioridad_detalle = priority.calcular(reporte, ruta)

    reporte.revisado_por_id = revisor.id
    reporte.revisado_en = datetime.now(UTC)

    registrar(
        db,
        accion=f"revision_{datos.decision}",
        entidad="reporte",
        entidad_id=reporte.id,
        actor_id=revisor.id,
        motivo=datos.motivo,
        datos={
            "severidad_validada": datos.severidad_validada.value
            if datos.severidad_validada
            else None,
            "fusionar_en_id": str(datos.fusionar_en_id) if datos.fusionar_en_id else None,
            "punto_corregido": bool(datos.punto_corregido),
        },
        request=request,
    )
    db.commit()

    # RF-10: avisar al autor del cambio de estado.
    if reporte.autor_id:
        notificar_cambio_estado(db, reporte.autor_id, reporte.id, reporte.estado.value)

    return {
        "reporte_id": str(reporte.id),
        "estado": reporte.estado.value,
        "prioridad": reporte.prioridad,
        "prioridad_detalle": reporte.prioridad_detalle,
    }
