"""RF-01, RF-02, RF-03, RF-10 (registro de dispositivo)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.api.deps import Db
from app.core.config import settings
from app.core.security import (
    UsuarioActual,
    crear_access_token,
    crear_refresh_token,
    crear_token_email,
    decodificar,
    hash_password,
    verify_password,
)
from app.models.user import Dispositivo, RefreshToken, Rol, Usuario
from app.schemas.auth import (
    DispositivoIn,
    LoginIn,
    RefreshIn,
    RegistroIn,
    TokensOut,
    UsuarioOut,
)
from app.services.audit import registrar

router = APIRouter(prefix="/auth", tags=["autenticacion"])


def _emitir(db, usuario: Usuario) -> TokensOut:
    access = crear_access_token(usuario.id, usuario.rol)
    refresh, jti = crear_refresh_token(usuario.id)
    db.add(
        RefreshToken(
            jti=uuid.UUID(jti),
            usuario_id=usuario.id,
            expira_en=datetime.now(UTC) + timedelta(days=settings.refresh_token_days),
        )
    )
    return TokensOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=settings.access_token_minutes * 60,
    )


@router.post("/registro", response_model=UsuarioOut, status_code=status.HTTP_201_CREATED)
def registro(datos: RegistroIn, db: Db, request: Request):
    """RF-01: cuenta con nombre, correo, contrasena y consentimiento de privacidad."""
    if db.scalar(select(Usuario).where(Usuario.email == datos.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "El correo ya esta registrado")

    usuario = Usuario(
        nombre=datos.nombre.strip(),
        email=datos.email.lower(),
        password_hash=hash_password(datos.password),
        rol=Rol.CIUDADANO,
        acepto_privacidad_en=datetime.now(UTC),
    )
    db.add(usuario)
    db.flush()

    token_email = crear_token_email(usuario.id)
    registrar(
        db,
        accion="registro_usuario",
        entidad="usuario",
        entidad_id=usuario.id,
        actor_id=usuario.id,
        request=request,
    )
    db.commit()

    # En produccion esto se envia por correo; en desarrollo se registra en el log.
    if settings.debug:
        print(f"[dev] token de verificacion para {usuario.email}: {token_email}")
    return usuario


@router.post("/verificar-email")
def verificar_email(token: str, db: Db):
    payload = decodificar(token, "email")
    usuario = db.get(Usuario, uuid.UUID(payload["sub"]))
    if usuario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario inexistente")
    usuario.email_verificado = True
    db.commit()
    return {"verificado": True}


@router.post("/login", response_model=TokensOut)
def login(datos: LoginIn, db: Db, request: Request):
    """RF-02. Mensaje de error generico: no revela si el correo existe."""
    usuario = db.scalar(select(Usuario).where(Usuario.email == datos.email.lower()))
    if usuario is None or not verify_password(datos.password, usuario.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales invalidas")
    if not usuario.activo:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cuenta desactivada")

    tokens = _emitir(db, usuario)
    registrar(
        db,
        accion="login",
        entidad="usuario",
        entidad_id=usuario.id,
        actor_id=usuario.id,
        request=request,
    )
    db.commit()
    return tokens


@router.post("/refresh", response_model=TokensOut)
def refresh(datos: RefreshIn, db: Db):
    """Rotacion de refresh tokens: el anterior se revoca al usarse (RNF-01)."""
    payload = decodificar(datos.refresh_token, "refresh")
    jti = uuid.UUID(payload["jti"])
    fila = db.get(RefreshToken, jti)
    if fila is None or fila.revocado:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de renovacion invalido")

    fila.revocado = True
    usuario = db.get(Usuario, fila.usuario_id)
    if usuario is None or not usuario.activo:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario inexistente o inactivo")

    tokens = _emitir(db, usuario)
    db.commit()
    return tokens


@router.post("/logout")
def logout(datos: RefreshIn, db: Db, usuario: UsuarioActual):
    payload = decodificar(datos.refresh_token, "refresh")
    fila = db.get(RefreshToken, uuid.UUID(payload["jti"]))
    if fila and fila.usuario_id == usuario.id:
        fila.revocado = True
        db.commit()
    return {"cerrado": True}


@router.get("/yo", response_model=UsuarioOut)
def yo(usuario: UsuarioActual):
    return usuario


@router.post("/dispositivo", status_code=status.HTTP_204_NO_CONTENT)
def registrar_dispositivo(datos: DispositivoIn, db: Db, usuario: UsuarioActual):
    """RF-10: guarda/actualiza el token de Expo Push del dispositivo."""
    existente = db.scalar(
        select(Dispositivo).where(Dispositivo.expo_push_token == datos.expo_push_token)
    )
    if existente:
        existente.usuario_id = usuario.id
        existente.notificaciones_activas = datos.notificaciones_activas
        existente.actualizado_en = datetime.now(UTC)
    else:
        db.add(
            Dispositivo(
                usuario_id=usuario.id,
                expo_push_token=datos.expo_push_token,
                plataforma=datos.plataforma,
                notificaciones_activas=datos.notificaciones_activas,
            )
        )
    db.commit()
