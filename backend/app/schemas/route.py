from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.route import EstadoRecorrido


class MuestraGpsIn(BaseModel):
    t_ms: int = Field(ge=0)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    precision_m: float | None = None
    velocidad_mps: float | None = None
    rumbo: float | None = None


class RecorridoIn(BaseModel):
    """RF-13."""

    idempotency_key: str = Field(min_length=16, max_length=64)
    ruta_id: UUID | None = None
    iniciado_en: datetime


class RecorridoCierreIn(BaseModel):
    finalizado_en: datetime
    muestras: list[MuestraGpsIn] = Field(min_length=1, max_length=100_000)


class RecorridoOut(BaseModel):
    id: UUID
    estado: EstadoRecorrido
    ruta_id: UUID | None
    iniciado_en: datetime
    finalizado_en: datetime | None
    frames_extraidos: int
    detecciones: int

    model_config = {"from_attributes": True}


class RutaOut(BaseModel):
    id: UUID
    codigo: str
    nombre: str
    tipo_via: str
    exposicion_transito: int
    es_holdout: bool

    model_config = {"from_attributes": True}
