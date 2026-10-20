"""Hash de contrasenas, emision/validacion de JWT y control de roles (RF-02, RF-03)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import Rol, Usuario

# Argon2id: algoritmo adaptativo exigido por RNF-01.
_hasher = PasswordHasher()
_bearer = HTTPBearer(auto_error=False)

TokenTipo = Literal["access", "refresh", "email"]


def hash_password(plano: str) -> str:
    return _hasher.hash(plano)


def verify_password(plano: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, plano)
    except (VerifyMismatchError, Exception):  # noqa: BLE001 - hash invalido o no coincide
        return False


def necesita_rehash(hashed: str) -> bool:
    return _hasher.check_needs_rehash(hashed)


def _crear_token(sub: str, tipo: TokenTipo, expira: timedelta, **extra) -> str:
    ahora = datetime.now(UTC)
    payload = {
        "sub": sub,
        "tipo": tipo,
        "iat": ahora,
        "exp": ahora + expira,
        "jti": str(uuid.uuid4()),
        **extra,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def crear_access_token(usuario_id: uuid.UUID, rol: Rol) -> str:
    return _crear_token(
        str(usuario_id), "access", timedelta(minutes=settings.access_token_minutes), rol=rol.value
    )


def crear_refresh_token(usuario_id: uuid.UUID) -> tuple[str, str]:
    """Devuelve (token, jti). El jti se guarda para poder rotar y revocar."""
    jti = str(uuid.uuid4())
    ahora = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": str(usuario_id),
            "tipo": "refresh",
            "iat": ahora,
            "exp": ahora + timedelta(days=settings.refresh_token_days),
            "jti": jti,
        },
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )
    return token, jti


def crear_token_email(usuario_id: uuid.UUID) -> str:
    return _crear_token(str(usuario_id), "email", timedelta(hours=settings.email_token_hours))


def decodificar(token: str, tipo_esperado: TokenTipo) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expirado") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token invalido") from exc
    if payload.get("tipo") != tipo_esperado:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Tipo de token incorrecto")
    return payload


def usuario_actual(
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> Usuario:
    if cred is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Falta el encabezado Authorization")
    payload = decodificar(cred.credentials, "access")
    usuario = db.get(Usuario, uuid.UUID(payload["sub"]))
    if usuario is None or not usuario.activo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario inexistente o inactivo")
    return usuario


UsuarioActual = Annotated[Usuario, Depends(usuario_actual)]


def require_role(*roles: Rol):
    """RF-03: la autorizacion se valida SIEMPRE en el servidor, por operacion."""

    def _dep(usuario: UsuarioActual) -> Usuario:
        if usuario.rol not in roles:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Rol '{usuario.rol.value}' no autorizado para esta operacion",
            )
        return usuario

    return _dep
