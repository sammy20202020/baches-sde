"""RF-04, RF-05, RF-08, RF-09: creacion y seguimiento de reportes ciudadanos."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from pydantic import ValidationError
from sqlalchemy import select

from app.api.deps import Db, IdempotencyKey, guardar_respuesta, respuesta_guardada
from app.core.config import settings
from app.core.security import UsuarioActual
from app.models.report import (
    EstadoReporte,
    Evidencia,
    Origen,
    Reporte,
    TipoEvidencia,
)
from app.schemas.report import MAX_FOTO_BYTES, Punto, ReporteOut
from app.services import storage
from app.services.audit import registrar
from app.services.geo import a_latlon, punto

router = APIRouter(prefix="/reportes", tags=["reportes"])

TIPOS_IMAGEN = {"image/jpeg", "image/png", "image/heic", "image/heif", "image/webp"}


def _a_salida(reporte: Reporte) -> ReporteOut:
    lat, lon = a_latlon(reporte.geom)
    return ReporteOut(
        id=reporte.id,
        estado=reporte.estado,
        origen=reporte.origen,
        descripcion=reporte.descripcion,
        lat=lat,
        lon=lon,
        precision_gps_m=reporte.precision_gps_m,
        severidad_ia=reporte.severidad_ia,
        confianza_ia=reporte.confianza_ia,
        severidad_validada=reporte.severidad_validada,
        prioridad=reporte.prioridad,
        veces_reportado=reporte.veces_reportado,
        creado_en=reporte.creado_en,
        publicado_en=reporte.publicado_en,
        requiere_correccion_gps=(
            reporte.precision_gps_m is not None
            and reporte.precision_gps_m > settings.gps_precision_max_m
        ),
    )


@router.post("", response_model=ReporteOut, status_code=status.HTTP_201_CREATED)
async def crear_reporte(
    db: Db,
    usuario: UsuarioActual,
    request: Request,
    idempotency_key: IdempotencyKey = None,
    foto: UploadFile = File(..., description="Foto del bache"),
    lat: float = Form(...),
    lon: float = Form(...),
    precision_gps_m: float | None = Form(None),
    descripcion: str | None = Form(None),
    capturado_en: datetime | None = Form(None),
):
    """RF-04 + RF-05 + RF-08.

    Multipart porque la foto viaja junto a los metadatos en un solo envio: en red
    intermitente dos peticiones separadas dejan estados a medias.
    """
    if not idempotency_key:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Falta el encabezado Idempotency-Key"
        )

    # RF-08: un reintento devuelve el reporte original, no crea otro.
    cacheada = respuesta_guardada(db, idempotency_key, "POST /reportes")
    if cacheada is not None:
        return ReporteOut.model_validate(cacheada)

    # RF-05: tipo, tamano y coherencia geografica.
    if foto.content_type not in TIPOS_IMAGEN:
        raise HTTPException(
            status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            f"Tipo de archivo no permitido: {foto.content_type}",
        )
    contenido = await foto.read()
    if len(contenido) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo esta vacio")
    if len(contenido) > MAX_FOTO_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            f"La foto supera {settings.max_foto_mb} MB",
        )
    # Los campos llegan como multipart (Form), por lo que FastAPI no aplica los
    # validadores de `Punto` automaticamente: hay que invocarlos y traducir el
    # error a 422, como haria un cuerpo JSON.
    try:
        Punto(lat=lat, lon=lon)
    except ValidationError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[{"loc": e["loc"], "msg": e["msg"]} for e in exc.errors()],
        ) from exc

    extension = (foto.filename or "foto.jpg").rsplit(".", 1)[-1].lower()[:5] or "jpg"
    s3_key, sha = storage.subir(contenido, "fotos", extension, foto.content_type)

    reporte = Reporte(
        idempotency_key=idempotency_key,
        autor_id=usuario.id,
        origen=Origen.CIUDADANO,
        descripcion=(descripcion or "").strip() or None,
        geom=punto(lat, lon),
        precision_gps_m=precision_gps_m,
        estado=EstadoReporte.RECIBIDO,
    )
    db.add(reporte)
    db.flush()

    db.add(
        Evidencia(
            reporte_id=reporte.id,
            tipo=TipoEvidencia.FOTO,
            s3_key=s3_key,
            sha256=sha,
            bytes=len(contenido),
            capturado_en=capturado_en or datetime.now(UTC),
        )
    )
    db.flush()

    registrar(
        db,
        accion="crear_reporte",
        entidad="reporte",
        entidad_id=reporte.id,
        actor_id=usuario.id,
        datos={"origen": "ciudadano", "precision_gps_m": precision_gps_m},
        request=request,
    )

    salida = _a_salida(reporte)
    guardar_respuesta(
        db, idempotency_key, "POST /reportes", 201, salida.model_dump(mode="json")
    )
    db.commit()

    # RF-06: el analisis de IA corre en segundo plano, no bloquea al movil (RNF-04).
    try:
        from app.workers.tasks import analizar_foto

        analizar_foto.delay(str(reporte.id))
    except Exception as exc:  # noqa: BLE001 - sin Redis la API sigue funcionando
        print(f"[warn] no se pudo encolar analizar_foto: {exc}")

    return salida


@router.get("/mios", response_model=list[ReporteOut])
def mis_reportes(db: Db, usuario: UsuarioActual, limite: int = 100, desplazamiento: int = 0):
    """RF-09: historial personal con el estado de cada reporte."""
    filas = db.scalars(
        select(Reporte)
        .where(Reporte.autor_id == usuario.id)
        .order_by(Reporte.creado_en.desc())
        .limit(min(limite, 200))
        .offset(desplazamiento)
    ).all()
    return [_a_salida(r) for r in filas]


@router.get("/{reporte_id}", response_model=ReporteOut)
def detalle(reporte_id: uuid.UUID, db: Db, usuario: UsuarioActual):
    from app.models.report import ESTADOS_PUBLICOS
    from app.models.user import Rol

    reporte = db.get(Reporte, reporte_id)
    if reporte is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reporte inexistente")

    propio = reporte.autor_id == usuario.id
    es_staff = usuario.rol in (Rol.REVISOR, Rol.ADMIN, Rol.OPERADOR)
    if not propio and not es_staff and reporte.estado not in ESTADOS_PUBLICOS:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Reporte no publico")
    return _a_salida(reporte)


@router.get("/{reporte_id}/evidencia")
def evidencia_firmada(reporte_id: uuid.UUID, db: Db, usuario: UsuarioActual):
    """Acceso temporal a la evidencia original. Restringido a autor y staff."""
    from app.models.user import Rol

    reporte = db.get(Reporte, reporte_id)
    if reporte is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Reporte inexistente")
    if reporte.autor_id != usuario.id and usuario.rol not in (Rol.REVISOR, Rol.ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No autorizado")

    return {
        "evidencias": [
            {"id": str(e.id), "tipo": e.tipo.value, "url": storage.url_firmada(e.s3_key)}
            for e in reporte.evidencias
        ]
    }
