import enum
import uuid
from datetime import UTC, datetime

from geoalchemy2 import Geography
from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class EstadoReporte(str, enum.Enum):
    """RF-09. El mapa publico solo muestra VALIDADO / PROGRAMADO / RESUELTO."""

    RECIBIDO = "recibido"
    EN_REVISION = "en_revision"
    VALIDADO = "validado"
    RECHAZADO = "rechazado"
    PROGRAMADO = "programado"
    RESUELTO = "resuelto"
    FUSIONADO = "fusionado"  # absorbido por otro reporte (RF-16)


ESTADOS_PUBLICOS = (
    EstadoReporte.VALIDADO,
    EstadoReporte.PROGRAMADO,
    EstadoReporte.RESUELTO,
)


class Severidad(str, enum.Enum):
    LEVE = "leve"
    MODERADA = "moderada"
    GRAVE = "grave"


class Origen(str, enum.Enum):
    CIUDADANO = "ciudadano"       # RF-04
    RECORRIDO_VIDEO = "recorrido" # RF-13/14


def _ahora() -> datetime:
    return datetime.now(UTC)


class Reporte(Base):
    __tablename__ = "reportes"
    __table_args__ = (
        # Indice espacial GiST: hace rapidas la proximidad del mapa (RF-11) y la
        # deduplicacion (RF-16). Se declara aqui, no via `spatial_index` de
        # GeoAlchemy2, para que Alembic lo versione como cualquier otro indice.
        Index("ix_reportes_geom", "geom", postgresql_using="gist"),
        Index("ix_reportes_estado_fecha", "estado", "creado_en"),
        CheckConstraint("precision_gps_m >= 0", name="ck_precision_no_negativa"),
    )

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # RF-08: clave de idempotencia generada en el dispositivo. Un reintento no duplica.
    idempotency_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)

    autor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    origen: Mapped[Origen] = mapped_column(Enum(Origen, name="origen_reporte"))
    descripcion: Mapped[str | None] = mapped_column(Text)

    # WGS84 geography: las distancias salen en metros sin proyectar a mano.
    geom: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False)
    )
    precision_gps_m: Mapped[float | None] = mapped_column(Float)
    direccion_aprox: Mapped[str | None] = mapped_column(String(255))

    estado: Mapped[EstadoReporte] = mapped_column(
        Enum(EstadoReporte, name="estado_reporte"), default=EstadoReporte.RECIBIDO, index=True
    )
    severidad_ia: Mapped[Severidad | None] = mapped_column(Enum(Severidad, name="severidad_ia"))
    confianza_ia: Mapped[float | None] = mapped_column(Float)
    severidad_validada: Mapped[Severidad | None] = mapped_column(
        Enum(Severidad, name="severidad_validada")
    )

    # RF-18: prioridad orientativa y explicable.
    prioridad: Mapped[float | None] = mapped_column(Float, index=True)
    prioridad_detalle: Mapped[dict | None] = mapped_column(JSONB)

    ruta_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rutas.id", ondelete="SET NULL"))
    fusionado_en_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("reportes.id", ondelete="SET NULL")
    )
    veces_reportado: Mapped[int] = mapped_column(Integer, default=1)

    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ahora)
    # Separado del estado a proposito: nada se publica sin validacion humana (pag. 7).
    publicado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    revisado_por_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    revisado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    evidencias: Mapped[list["Evidencia"]] = relationship(
        back_populates="reporte", cascade="all, delete-orphan"
    )


class TipoEvidencia(str, enum.Enum):
    FOTO = "foto"
    VIDEO = "video"
    FRAME = "frame"


class Evidencia(Base):
    """Los binarios viven en S3/MinIO; aqui solo la referencia y la suma de comprobacion."""

    __tablename__ = "evidencias"

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporte_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("reportes.id", ondelete="CASCADE"))
    tipo: Mapped[TipoEvidencia] = mapped_column(Enum(TipoEvidencia, name="tipo_evidencia"))
    s3_key: Mapped[str] = mapped_column(String(512))
    sha256: Mapped[str] = mapped_column(String(64))
    bytes: Mapped[int] = mapped_column(Integer)
    # phash para similitud visual en deduplicacion (RF-16).
    phash: Mapped[str | None] = mapped_column(String(32))
    ancho: Mapped[int | None] = mapped_column(Integer)
    alto: Mapped[int | None] = mapped_column(Integer)
    capturado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ahora)

    reporte: Mapped[Reporte] = relationship(back_populates="evidencias")
