import enum
import uuid
from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Rol(str, enum.Enum):
    """RF-03. Los cuatro roles de la propuesta."""

    CIUDADANO = "ciudadano"
    OPERADOR = "operador"
    REVISOR = "revisor"
    ADMIN = "admin"


def _ahora() -> datetime:
    return datetime.now(UTC)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    rol: Mapped[Rol] = mapped_column(Enum(Rol, name="rol_usuario"), default=Rol.CIUDADANO)

    email_verificado: Mapped[bool] = mapped_column(Boolean, default=False)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    # RNF-02: consentimiento explicito de la politica de privacidad (RF-01).
    acepto_privacidad_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ahora)

    dispositivos: Mapped[list["Dispositivo"]] = relationship(back_populates="usuario")


class Dispositivo(Base):
    """RF-10: un token de Expo Push por dispositivo del usuario."""

    __tablename__ = "dispositivos"

    id: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    expo_push_token: Mapped[str] = mapped_column(String(255), unique=True)
    plataforma: Mapped[str] = mapped_column(String(16))  # ios | android
    notificaciones_activas: Mapped[bool] = mapped_column(Boolean, default=True)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ahora)

    usuario: Mapped[Usuario] = relationship(back_populates="dispositivos")


class RefreshToken(Base):
    """Tokens de renovacion rotativos (RNF-01): se revoca el anterior al usarlo."""

    __tablename__ = "refresh_tokens"

    jti: Mapped[uuid.UUID] = mapped_column(PgUUID(as_uuid=True), primary_key=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuarios.id", ondelete="CASCADE"))
    revocado: Mapped[bool] = mapped_column(Boolean, default=False)
    expira_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_ahora)
