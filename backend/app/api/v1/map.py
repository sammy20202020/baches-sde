"""RF-11, RF-12: mapa publico anonimizado en GeoJSON."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Query
from geoalchemy2 import Geography, Geometry
from sqlalchemy import func, select

from app.api.deps import Db
from app.models.report import ESTADOS_PUBLICOS, EstadoReporte, Reporte, Severidad

router = APIRouter(prefix="/mapa", tags=["mapa publico"])

# `geography` no expone ST_X/ST_Y: se castea a geometry solo para leer coordenadas.
_geom = Reporte.geom.cast(Geometry)


@router.get("/publico")
def mapa_publico(
    db: Db,
    estado: EstadoReporte | None = None,
    severidad: Severidad | None = None,
    desde: datetime | None = None,
    hasta: datetime | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radio_m: float = Query(default=2000, ge=50, le=20000),
    limite: int = Query(default=500, ge=1, le=5000),
):
    """Endpoint PUBLICO (sin token).

    RNF-02: se seleccionan columnas explicitas y nunca se hace JOIN con `usuarios`,
    asi es imposible filtrar datos personales por descuido en el serializador.
    """
    estados = (estado,) if estado else ESTADOS_PUBLICOS

    stmt = select(
        Reporte.id,
        func.ST_Y(_geom).label("lat"),
        func.ST_X(_geom).label("lon"),
        Reporte.estado,
        Reporte.severidad_validada,
        Reporte.prioridad,
        Reporte.veces_reportado,
        Reporte.creado_en,
        Reporte.publicado_en,
    ).where(
        Reporte.estado.in_(estados),
        Reporte.publicado_en.is_not(None),  # nada sin validacion humana (pag. 7)
        Reporte.fusionado_en_id.is_(None),
    )

    if severidad:
        stmt = stmt.where(Reporte.severidad_validada == severidad)
    if desde:
        stmt = stmt.where(Reporte.creado_en >= desde)
    if hasta:
        stmt = stmt.where(Reporte.creado_en <= hasta)
    if lat is not None and lon is not None:
        centro = func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326).cast(Geography)
        stmt = stmt.where(func.ST_DWithin(Reporte.geom, centro, radio_m))

    filas = db.execute(stmt.order_by(Reporte.prioridad.desc().nullslast()).limit(limite)).all()

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [f.lon, f.lat]},
                "properties": {
                    "id": str(f.id),
                    "estado": f.estado.value,
                    "severidad": f.severidad_validada.value if f.severidad_validada else None,
                    "prioridad": f.prioridad,
                    "veces_reportado": f.veces_reportado,
                    "fecha": f.creado_en.isoformat(),
                    "publicado_en": f.publicado_en.isoformat() if f.publicado_en else None,
                },
            }
            for f in filas
        ],
    }


@router.get("/resumen")
def resumen(db: Db):
    """Conteo por severidad para la pantalla de inicio del movil."""
    por_severidad = db.execute(
        select(Reporte.severidad_validada, func.count())
        .where(Reporte.estado.in_(ESTADOS_PUBLICOS), Reporte.publicado_en.is_not(None))
        .group_by(Reporte.severidad_validada)
    ).all()
    return {
        "publicados": sum(c for _, c in por_severidad),
        "por_severidad": {(s.value if s else "sin_clasificar"): c for s, c in por_severidad},
    }
