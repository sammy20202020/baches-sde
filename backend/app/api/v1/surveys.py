"""RF-13, RF-14, RF-15: recorridos tecnicos en video con muestras GPS."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select

from app.api.deps import Db, guardar_respuesta, respuesta_guardada
from app.core.config import settings
from app.core.security import require_role
from app.models.route import EstadoRecorrido, MuestraGps, Recorrido, Ruta
from app.models.user import Rol, Usuario
from app.schemas.report import MAX_VIDEO_BYTES
from app.schemas.route import RecorridoCierreIn, RecorridoIn, RecorridoOut, RutaOut
from app.services import storage
from app.services.audit import registrar
from app.services.geo import punto

router = APIRouter(prefix="/recorridos", tags=["recorridos tecnicos"])

Operador = Depends(require_role(Rol.OPERADOR, Rol.ADMIN))
TIPOS_VIDEO = {"video/mp4", "video/quicktime", "video/x-matroska"}


@router.get("/rutas", response_model=list[RutaOut])
def listar_rutas(db: Db, operador: Usuario = Operador):
    return db.scalars(select(Ruta).order_by(Ruta.codigo)).all()


@router.post("", response_model=RecorridoOut, status_code=status.HTTP_201_CREATED)
def iniciar(datos: RecorridoIn, db: Db, request: Request, operador: Usuario = Operador):
    """RF-13: abre la sesion de grabacion. Idempotente por clave del dispositivo."""
    cacheada = respuesta_guardada(db, datos.idempotency_key, "POST /recorridos")
    if cacheada is not None:
        return RecorridoOut.model_validate(cacheada)

    recorrido = Recorrido(
        idempotency_key=datos.idempotency_key,
        operador_id=operador.id,
        ruta_id=datos.ruta_id,
        iniciado_en=datos.iniciado_en,
        estado=EstadoRecorrido.GRABANDO,
    )
    db.add(recorrido)
    db.flush()

    registrar(
        db,
        accion="iniciar_recorrido",
        entidad="recorrido",
        entidad_id=recorrido.id,
        actor_id=operador.id,
        request=request,
    )
    salida = RecorridoOut.model_validate(recorrido)
    guardar_respuesta(
        db, datos.idempotency_key, "POST /recorridos", 201, salida.model_dump(mode="json")
    )
    db.commit()
    return salida


@router.post("/{recorrido_id}/muestras", status_code=status.HTTP_204_NO_CONTENT)
def cerrar_con_muestras(
    recorrido_id: uuid.UUID,
    datos: RecorridoCierreIn,
    db: Db,
    operador: Usuario = Operador,
):
    """Sube el track GPS completo al terminar. Se envia en lote, no muestra por muestra."""
    recorrido = db.get(Recorrido, recorrido_id)
    if recorrido is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recorrido inexistente")
    if recorrido.operador_id != operador.id and operador.rol != Rol.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "El recorrido es de otro operador")

    # Reenviar el mismo lote no debe duplicar muestras.
    existentes = set(
        db.scalars(select(MuestraGps.t_ms).where(MuestraGps.recorrido_id == recorrido_id))
    )
    nuevas = [
        MuestraGps(
            recorrido_id=recorrido_id,
            t_ms=m.t_ms,
            geom=punto(m.lat, m.lon),
            precision_m=m.precision_m,
            velocidad_mps=m.velocidad_mps,
            rumbo=m.rumbo,
        )
        for m in datos.muestras
        if m.t_ms not in existentes
    ]
    db.add_all(nuevas)
    recorrido.finalizado_en = datos.finalizado_en
    recorrido.estado = EstadoRecorrido.SUBIENDO
    db.commit()


@router.post("/{recorrido_id}/video", response_model=RecorridoOut)
async def subir_video(
    recorrido_id: uuid.UUID,
    db: Db,
    request: Request,
    video: UploadFile = File(...),
    operador: Usuario = Operador,
):
    """RF-14: guarda el video y encola el procesamiento en segundo plano (RNF-04)."""
    recorrido = db.get(Recorrido, recorrido_id)
    if recorrido is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recorrido inexistente")
    if recorrido.video_s3_key:
        return RecorridoOut.model_validate(recorrido)  # ya subido: idempotente

    if video.content_type not in TIPOS_VIDEO:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, f"Tipo no permitido: {video.content_type}"
        )
    contenido = await video.read()
    if len(contenido) > MAX_VIDEO_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"El video supera {settings.max_video_mb} MB",
        )

    s3_key, _ = storage.subir(contenido, "videos", "mp4", video.content_type or "video/mp4")
    recorrido.video_s3_key = s3_key
    recorrido.estado = EstadoRecorrido.PROCESANDO

    registrar(
        db,
        accion="subir_video_recorrido",
        entidad="recorrido",
        entidad_id=recorrido.id,
        actor_id=operador.id,
        datos={"bytes": len(contenido)},
        request=request,
    )
    db.commit()

    try:
        from app.workers.tasks import procesar_video

        procesar_video.delay(str(recorrido.id))
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] no se pudo encolar procesar_video: {exc}")

    return RecorridoOut.model_validate(recorrido)


@router.get("/{recorrido_id}", response_model=RecorridoOut)
def estado(recorrido_id: uuid.UUID, db: Db, operador: Usuario = Operador):
    recorrido = db.get(Recorrido, recorrido_id)
    if recorrido is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recorrido inexistente")
    return recorrido
