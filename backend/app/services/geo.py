"""Utilidades geoespaciales: conversion a WKT/WKB y interpolacion GPS (RF-15)."""
from __future__ import annotations

from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.route import MuestraGps


def punto(lat: float, lon: float) -> WKTElement:
    """Punto WGS84 para una columna `geography`.

    Se devuelve un WKTElement y no una cadena EWKT porque el objeto recien
    insertado conserva en memoria lo que se le asigno: con una cadena, leer
    `reporte.geom` antes de recargarlo desde la base no se puede convertir a
    coordenadas. PostGIS espera lon/lat en ese orden, no lat/lon.
    """
    return WKTElement(f"POINT({lon} {lat})", srid=4326)


def a_latlon(geom) -> tuple[float, float]:
    """Devuelve (lat, lon) de un punto, venga de la base (WKB) o de `punto()` (WKT)."""
    p = to_shape(geom)
    return p.y, p.x


def interpolar_posicion(db: Session, recorrido_id, t_ms: int) -> tuple[float, float] | None:
    """RF-15: ubica un frame entre las dos muestras GPS que lo encierran.

    Interpolacion lineal en el tiempo. Con muestreo a 1 Hz y velocidad urbana
    (~40 km/h) el error teorico es de unos pocos metros, dentro de la tolerancia.
    """
    anterior = db.scalar(
        select(MuestraGps)
        .where(MuestraGps.recorrido_id == recorrido_id, MuestraGps.t_ms <= t_ms)
        .order_by(MuestraGps.t_ms.desc())
        .limit(1)
    )
    siguiente = db.scalar(
        select(MuestraGps)
        .where(MuestraGps.recorrido_id == recorrido_id, MuestraGps.t_ms > t_ms)
        .order_by(MuestraGps.t_ms.asc())
        .limit(1)
    )

    if anterior is None and siguiente is None:
        return None
    if anterior is None:
        return a_latlon(siguiente.geom)
    if siguiente is None:
        return a_latlon(anterior.geom)

    lat_a, lon_a = a_latlon(anterior.geom)
    lat_b, lon_b = a_latlon(siguiente.geom)
    span = siguiente.t_ms - anterior.t_ms
    if span <= 0:
        return lat_a, lon_a
    f = (t_ms - anterior.t_ms) / span
    return lat_a + (lat_b - lat_a) * f, lon_a + (lon_b - lon_a) * f


def distancia_m(db: Session, geom_a, geom_b) -> float:
    return float(db.scalar(select(func.ST_Distance(geom_a, geom_b))))
