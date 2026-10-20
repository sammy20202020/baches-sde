"""RF-06, RF-14, RF-15, RF-16: tareas en segundo plano."""
from __future__ import annotations

import logging
import uuid

from celery import shared_task

from app.db.session import SessionLocal
from app.models.report import (
    EstadoReporte,
    Evidencia,
    Origen,
    Reporte,
    Severidad,
    TipoEvidencia,
)
from app.models.route import EstadoRecorrido, Recorrido
from app.services import storage, vision
from app.services.geo import interpolar_posicion, punto
from app.workers.celery_app import celery_app  # noqa: F401 - registra la app

log = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)
def analizar_foto(self, reporte_id: str) -> dict:
    """RF-06: propone presencia, contorno y severidad. NO publica nada."""
    db = SessionLocal()
    try:
        reporte = db.get(Reporte, uuid.UUID(reporte_id))
        if reporte is None:
            return {"error": "reporte inexistente"}

        foto = next((e for e in reporte.evidencias if e.tipo == TipoEvidencia.FOTO), None)
        if foto is None:
            return {"error": "sin evidencia fotografica"}

        contenido = storage.descargar(foto.s3_key)
        foto.phash = vision.phash(contenido)
        detecciones = vision.detectar(contenido)

        if detecciones:
            mejor = max(detecciones, key=lambda d: d.confianza)
            reporte.severidad_ia = Severidad(mejor.severidad)
            reporte.confianza_ia = round(mejor.confianza, 4)

        # Pase lo que pase, el siguiente paso es un humano (pag. 7).
        reporte.estado = EstadoReporte.EN_REVISION
        db.commit()

        proponer_duplicados.delay(reporte_id)
        return {"detecciones": len(detecciones), "estado": reporte.estado.value}
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        log.exception("analizar_foto fallo")
        raise self.retry(exc=exc) from exc
    finally:
        db.close()


@shared_task
def proponer_duplicados(reporte_id: str) -> dict:
    """RF-16: deja los candidatos calculados para que el revisor los vea al instante."""
    from app.services.dedupe import candidatos_duplicados

    db = SessionLocal()
    try:
        reporte = db.get(Reporte, uuid.UUID(reporte_id))
        if reporte is None:
            return {"error": "reporte inexistente"}
        candidatos = candidatos_duplicados(db, reporte)
        return {"reporte_id": reporte_id, "candidatos": len(candidatos)}
    finally:
        db.close()


@shared_task(bind=True, max_retries=2, default_retry_delay=120)
def procesar_video(self, recorrido_id: str) -> dict:
    """RF-14 + RF-15: extrae fotogramas, detecta y georreferencia por interpolacion."""
    db = SessionLocal()
    try:
        recorrido = db.get(Recorrido, uuid.UUID(recorrido_id))
        if recorrido is None or not recorrido.video_s3_key:
            return {"error": "recorrido sin video"}

        recorrido.estado = EstadoRecorrido.PROCESANDO
        db.commit()

        video = storage.descargar(recorrido.video_s3_key)
        frames = vision.extraer_frames(video, cada_n_segundos=1.0)
        recorrido.frames_extraidos = len(frames)

        creados = 0
        for t_ms, jpeg in frames:
            detecciones = vision.detectar(jpeg)
            if not detecciones:
                continue

            posicion = interpolar_posicion(db, recorrido.id, t_ms)
            if posicion is None:
                continue  # sin muestra GPS util no se puede georreferenciar
            lat, lon = posicion

            mejor = max(detecciones, key=lambda d: d.confianza)
            s3_key, sha = storage.subir(jpeg, "frames", "jpg", "image/jpeg")

            candidato = Reporte(
                # Clave derivada: reprocesar el mismo video no duplica candidatos.
                idempotency_key=f"rec-{recorrido.id}-{t_ms}",
                autor_id=recorrido.operador_id,
                origen=Origen.RECORRIDO_VIDEO,
                descripcion=f"Candidato automatico del recorrido {recorrido.id} en t={t_ms} ms",
                geom=punto(lat, lon),
                ruta_id=recorrido.ruta_id,
                estado=EstadoReporte.EN_REVISION,
                severidad_ia=Severidad(mejor.severidad),
                confianza_ia=round(mejor.confianza, 4),
            )
            db.add(candidato)
            db.flush()
            db.add(
                Evidencia(
                    reporte_id=candidato.id,
                    tipo=TipoEvidencia.FRAME,
                    s3_key=s3_key,
                    sha256=sha,
                    bytes=len(jpeg),
                    phash=vision.phash(jpeg),
                )
            )
            creados += 1

        recorrido.detecciones = creados
        recorrido.estado = EstadoRecorrido.COMPLETADO
        db.commit()
        return {"frames": len(frames), "candidatos": creados}
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        recorrido = db.get(Recorrido, uuid.UUID(recorrido_id))
        if recorrido:
            recorrido.estado = EstadoRecorrido.ERROR
            db.commit()
        log.exception("procesar_video fallo")
        raise self.retry(exc=exc) from exc
    finally:
        db.close()
