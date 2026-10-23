from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.models.report import EstadoReporte, Origen, Severidad

# RF-05: coherencia geografica.
#
# Caja del limite municipal real de Santo Domingo Este, tomado de la relacion
# administrativa de OpenStreetMap (admin_level 6, 2343 nodos):
#     lat 18.4547 .. 18.5982   lon -69.8979 .. -69.7026
#
# Se agrega un margen de 0.005 grados (~550 m) para no rechazar un reporte
# legitimo pegado al borde cuando el GPS trae error. La caja anterior cortaba
# en 18.58 y dejaba fuera los 2 km mas al norte del municipio.
#
# Es una aproximacion rectangular: el municipio no es un rectangulo, asi que
# acepta algo de territorio vecino. Para apretarlo habria que validar contra el
# poligono con ST_Contains, a cambio de una consulta a la base en cada reporte.
MARGEN_BORDE = 0.005
SDE_LAT = (18.4547 - MARGEN_BORDE, 18.5982 + MARGEN_BORDE)
SDE_LON = (-69.8979 - MARGEN_BORDE, -69.7026 + MARGEN_BORDE)


class Punto(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)

    @field_validator("lat")
    @classmethod
    def lat_en_sde(cls, v: float) -> float:
        if not SDE_LAT[0] <= v <= SDE_LAT[1]:
            raise ValueError("La latitud cae fuera de Santo Domingo Este")
        return v

    @field_validator("lon")
    @classmethod
    def lon_en_sde(cls, v: float) -> float:
        if not SDE_LON[0] <= v <= SDE_LON[1]:
            raise ValueError("La longitud cae fuera de Santo Domingo Este")
        return v


class ReporteIn(BaseModel):
    """RF-04. `idempotency_key` la genera el dispositivo al crear el borrador (RF-08)."""

    idempotency_key: str = Field(min_length=16, max_length=64)
    punto: Punto
    precision_gps_m: float | None = Field(default=None, ge=0, le=5000)
    descripcion: str | None = Field(default=None, max_length=1000)
    capturado_en: datetime | None = None

    @field_validator("precision_gps_m")
    @classmethod
    def avisar_precision(cls, v: float | None) -> float | None:
        # No se rechaza: se acepta y el revisor corrige (tratamiento del riesgo "GPS impreciso").
        return v


class EvidenciaOut(BaseModel):
    id: UUID
    tipo: str
    url: str | None = None
    sha256: str
    bytes: int


class ReporteOut(BaseModel):
    id: UUID
    estado: EstadoReporte
    origen: Origen
    descripcion: str | None
    lat: float
    lon: float
    precision_gps_m: float | None
    severidad_ia: Severidad | None
    confianza_ia: float | None
    severidad_validada: Severidad | None
    prioridad: float | None
    veces_reportado: int
    creado_en: datetime
    publicado_en: datetime | None
    requiere_correccion_gps: bool = False

    model_config = {"from_attributes": True}


class RevisionIn(BaseModel):
    """RF-17. Ningun candidato de IA se publica sin pasar por aqui."""

    decision: str = Field(pattern="^(validar|rechazar|fusionar)$")
    severidad_validada: Severidad | None = None
    punto_corregido: Punto | None = None
    fusionar_en_id: UUID | None = None
    motivo: str = Field(min_length=5, max_length=500)

    @field_validator("motivo")
    @classmethod
    def motivo_obligatorio(cls, v: str) -> str:
        # Criterio de trazabilidad: toda validacion o fusion queda con motivo.
        return v.strip()


class MapaQuery(BaseModel):
    """RF-12."""

    estado: EstadoReporte | None = None
    severidad: Severidad | None = None
    desde: datetime | None = None
    hasta: datetime | None = None
    lat: float | None = None
    lon: float | None = None
    radio_m: float = Field(default=2000, ge=50, le=20000)
    limite: int = Field(default=500, ge=1, le=5000)


MAX_FOTO_BYTES = settings.max_foto_mb * 1024 * 1024
MAX_VIDEO_BYTES = settings.max_video_mb * 1024 * 1024
