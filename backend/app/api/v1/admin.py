"""RF-19, RF-20, RF-21: administracion, auditoria y exportaciones."""
from __future__ import annotations

import csv
import io
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from geoalchemy2 import Geometry
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select

from app.api.deps import Db
from app.core.security import require_role
from app.models.audit import Auditoria
from app.models.report import ESTADOS_PUBLICOS, Reporte
from app.models.route import Ruta
from app.models.user import Rol, Usuario
from app.services.audit import registrar

router = APIRouter(prefix="/admin", tags=["administracion"])

Admin = Depends(require_role(Rol.ADMIN))
Staff = Depends(require_role(Rol.ADMIN, Rol.REVISOR))
_geom = Reporte.geom.cast(Geometry)


class CambioRolIn(BaseModel):
    rol: Rol
    motivo: str


class RutaIn(BaseModel):
    codigo: str
    nombre: str
    tipo_via: str = "avenida"
    exposicion_transito: int = 3
    es_holdout: bool = False


class UsuarioAdminOut(BaseModel):
    id: uuid.UUID
    nombre: str
    email: EmailStr
    rol: Rol
    activo: bool
    email_verificado: bool

    model_config = {"from_attributes": True}


@router.get("/usuarios", response_model=list[UsuarioAdminOut])
def listar_usuarios(db: Db, admin: Usuario = Admin):
    return db.scalars(select(Usuario).order_by(Usuario.creado_en.desc()).limit(500)).all()


@router.patch("/usuarios/{usuario_id}/rol", response_model=UsuarioAdminOut)
def cambiar_rol(
    usuario_id: uuid.UUID, datos: CambioRolIn, db: Db, request: Request, admin: Usuario = Admin
):
    objetivo = db.get(Usuario, usuario_id)
    if objetivo is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario inexistente")
    if objetivo.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puede cambiar su propio rol")

    anterior = objetivo.rol
    objetivo.rol = datos.rol
    registrar(
        db,
        accion="cambiar_rol",
        entidad="usuario",
        entidad_id=objetivo.id,
        actor_id=admin.id,
        motivo=datos.motivo,
        datos={"de": anterior.value, "a": datos.rol.value},
        request=request,
    )
    db.commit()
    return objetivo


@router.post("/rutas", status_code=status.HTTP_201_CREATED)
def crear_ruta(datos: RutaIn, db: Db, request: Request, admin: Usuario = Admin):
    if db.scalar(select(Ruta).where(Ruta.codigo == datos.codigo)):
        raise HTTPException(status.HTTP_409_CONFLICT, "El codigo de ruta ya existe")
    ruta = Ruta(**datos.model_dump())
    db.add(ruta)
    db.flush()
    registrar(
        db,
        accion="crear_ruta",
        entidad="ruta",
        entidad_id=ruta.id,
        actor_id=admin.id,
        request=request,
    )
    db.commit()
    return {"id": str(ruta.id), "codigo": ruta.codigo}


@router.get("/auditoria")
def auditoria(
    db: Db,
    accion: str | None = None,
    entidad_id: str | None = None,
    limite: int = 200,
    staff: Usuario = Staff,
):
    """RF-20."""
    stmt = select(Auditoria).order_by(Auditoria.creado_en.desc()).limit(min(limite, 1000))
    if accion:
        stmt = stmt.where(Auditoria.accion == accion)
    if entidad_id:
        stmt = stmt.where(Auditoria.entidad_id == entidad_id)
    return [
        {
            "id": str(a.id),
            "accion": a.accion,
            "entidad": a.entidad,
            "entidad_id": a.entidad_id,
            "actor_id": str(a.actor_id) if a.actor_id else None,
            "motivo": a.motivo,
            "datos": a.datos,
            "fecha": a.creado_en.isoformat(),
        }
        for a in db.scalars(stmt).all()
    ]


@router.get("/metricas")
def metricas(db: Db, staff: Usuario = Staff):
    """Insumo del capitulo de resultados: conteos por ruta y estado."""
    por_ruta = db.execute(
        select(Ruta.codigo, Reporte.estado, func.count())
        .join(Reporte, Reporte.ruta_id == Ruta.id, isouter=True)
        .group_by(Ruta.codigo, Reporte.estado)
    ).all()
    total = db.scalar(select(func.count()).select_from(Reporte))
    publicados = db.scalar(
        select(func.count()).select_from(Reporte).where(Reporte.publicado_en.is_not(None))
    )
    return {
        "total_reportes": total,
        "publicados": publicados,
        "por_ruta": [
            {"ruta": c, "estado": e.value if e else None, "conteo": n} for c, e, n in por_ruta
        ],
    }


def _filas_export(db: Db):
    return db.execute(
        select(
            Reporte.id,
            func.ST_Y(_geom).label("lat"),
            func.ST_X(_geom).label("lon"),
            Reporte.estado,
            Reporte.severidad_validada,
            Reporte.prioridad,
            Reporte.veces_reportado,
            Reporte.creado_en,
            Reporte.publicado_en,
            Ruta.codigo.label("ruta"),
        )
        .join(Ruta, Ruta.id == Reporte.ruta_id, isouter=True)
        .where(Reporte.estado.in_(ESTADOS_PUBLICOS), Reporte.publicado_en.is_not(None))
        .order_by(Reporte.creado_en)
    ).all()


@router.get("/export/geojson")
def export_geojson(db: Db, request: Request, staff: Usuario = Staff):
    """RF-21: exporta sin datos personales."""
    filas = _filas_export(db)
    registrar(
        db,
        accion="export_geojson",
        entidad="reporte",
        actor_id=staff.id,
        datos={"filas": len(filas)},
        request=request,
    )
    db.commit()
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
                    "ruta": f.ruta,
                    "creado_en": f.creado_en.isoformat(),
                },
            }
            for f in filas
        ],
    }


@router.get("/export/csv")
def export_csv(db: Db, request: Request, staff: Usuario = Staff):
    """RF-21."""
    filas = _filas_export(db)
    buffer = io.StringIO()
    w = csv.writer(buffer)
    w.writerow(
        ["id", "lat", "lon", "estado", "severidad", "prioridad", "veces_reportado", "ruta", "creado_en"]
    )
    for f in filas:
        w.writerow(
            [
                f.id,
                f"{f.lat:.7f}",
                f"{f.lon:.7f}",
                f.estado.value,
                f.severidad_validada.value if f.severidad_validada else "",
                f.prioridad or "",
                f.veces_reportado,
                f.ruta or "",
                f.creado_en.isoformat(),
            ]
        )
    registrar(
        db,
        accion="export_csv",
        entidad="reporte",
        actor_id=staff.id,
        datos={"filas": len(filas)},
        request=request,
    )
    db.commit()

    buffer.seek(0)
    nombre = f"reportes-validados-{datetime.now():%Y%m%d}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{nombre}"'},
    )
