import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Auditoria(Base):
    """RF-20 / criterio de trazabilidad: quien cambio que, cuando y por que."""

    __tablename__ = "auditoria"

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("usuarios.id", ondelete="SET NULL")
    )
    accion: Mapped[str] = mapped_column(String(64), index=True)
    entidad: Mapped[str] = mapped_column(String(64))
    entidad_id: Mapped[str | None] = mapped_column(String(64), index=True)
    motivo: Mapped[str | None] = mapped_column(Text)
    datos: Mapped[dict | None] = mapped_column(JSONB)
    ip: Mapped[str | None] = mapped_column(String(64))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), index=True
    )


class RespuestaIdempotente(Base):
    """RF-08: guarda la respuesta de una clave para reemitirla en reintentos."""

    __tablename__ = "respuestas_idempotentes"

    clave: Mapped[str] = mapped_column(String(64), primary_key=True)
    ruta_http: Mapped[str] = mapped_column(String(128))
    status_code: Mapped[int] = mapped_column()
    cuerpo: Mapped[dict] = mapped_column(JSONB)
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
