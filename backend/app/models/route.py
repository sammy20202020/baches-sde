import enum
import uuid
from datetime import UTC, datetime

from geoalchemy2 import Geography
from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Ruta(Base):
    """Las 4 rutas de evaluacion. La Ruta 4 (Av. Ecologica) es holdout."""

    __tablename__ = "rutas"
    __table_args__ = (Index("ix_rutas_geom", "geom", postgresql_using="gist"),)

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo: Mapped[str] = mapped_column(String(16), unique=True)  # R1..R4
    nombre: Mapped[str] = mapped_column(String(160))
    geom: Mapped[str | None] = mapped_column(
        Geography(geometry_type="LINESTRING", srid=4326, spatial_index=False)
    )
    tipo_via: Mapped[str] = mapped_column(String(40), default="avenida")
    exposicion_transito: Mapped[int] = mapped_column(Integer, default=3)  # 1-5, insumo de RF-18
    # True en Ruta 4: prohibido usarla para entrenar o ajustar el modelo.
    es_holdout: Mapped[bool] = mapped_column(Boolean, default=False)


class EstadoRecorrido(str, enum.Enum):
    GRABANDO = "grabando"
    SUBIENDO = "subiendo"
    PROCESANDO = "procesando"
    COMPLETADO = "completado"
    ERROR = "error"


class Recorrido(Base):
    """RF-13: sesion de captura tecnica de video con muestras GPS."""

    __tablename__ = "recorridos"

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    operador_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="SET NULL"))
    ruta_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("rutas.id", ondelete="SET NULL"))
    estado: Mapped[EstadoRecorrido] = mapped_column(
        Enum(EstadoRecorrido, name="estado_recorrido"), default=EstadoRecorrido.GRABANDO
    )
    iniciado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    finalizado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    video_s3_key: Mapped[str | None] = mapped_column(String(512))
    frames_extraidos: Mapped[int] = mapped_column(Integer, default=0)
    detecciones: Mapped[int] = mapped_column(Integer, default=0)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )

    muestras: Mapped[list["MuestraGps"]] = relationship(
        back_populates="recorrido", cascade="all, delete-orphan"
    )


class MuestraGps(Base):
    """RF-15: se interpola sobre estas muestras para ubicar cada deteccion del video."""

    __tablename__ = "muestras_gps"
    __table_args__ = (
        Index("ix_muestras_recorrido_t", "recorrido_id", "t_ms"),
        Index("ix_muestras_gps_geom", "geom", postgresql_using="gist"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    recorrido_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("recorridos.id", ondelete="CASCADE")
    )
    t_ms: Mapped[int] = mapped_column(Integer)  # ms desde el inicio del video
    geom: Mapped[str] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False)
    )
    precision_m: Mapped[float | None] = mapped_column(Float)
    velocidad_mps: Mapped[float | None] = mapped_column(Float)
    rumbo: Mapped[float | None] = mapped_column(Float)

    recorrido: Mapped[Recorrido] = relationship(back_populates="muestras")
