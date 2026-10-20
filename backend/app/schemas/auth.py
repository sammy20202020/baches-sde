from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import Rol


class RegistroIn(BaseModel):
    """RF-01."""

    nombre: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    acepta_privacidad: bool

    @field_validator("acepta_privacidad")
    @classmethod
    def debe_aceptar(cls, v: bool) -> bool:
        if not v:
            raise ValueError("Debe aceptar la politica de privacidad para crear la cuenta")
        return v

    @field_validator("password")
    @classmethod
    def password_robusta(cls, v: str) -> str:
        if v.isdigit() or v.isalpha():
            raise ValueError("La contrasena debe combinar letras, numeros o simbolos")
        return v


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class TokensOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UsuarioOut(BaseModel):
    id: UUID
    nombre: str
    email: EmailStr
    rol: Rol
    email_verificado: bool
    creado_en: datetime

    model_config = {"from_attributes": True}


class DispositivoIn(BaseModel):
    """RF-10."""

    expo_push_token: str = Field(min_length=10, max_length=255)
    plataforma: str = Field(pattern="^(ios|android)$")
    notificaciones_activas: bool = True
