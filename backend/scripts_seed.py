"""Datos iniciales: las 4 rutas de la propuesta y un usuario de cada rol.

Uso:  python scripts_seed.py
Credenciales solo para desarrollo local; en produccion se crean desde el panel.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.route import Ruta
from app.models.user import Rol, Usuario

RUTAS = [
    ("R1", "Avenida Espana", "avenida", 4, False),
    ("R2", "Avenida San Vicente de Paul", "avenida", 5, False),
    ("R3", "Avenida Charles de Gaulle", "troncal", 5, False),
    ("R4", "Avenida Ecologica", "avenida", 4, True),  # holdout: prueba final no vista
]

# Dominio example.com: reservado por la IANA, ningun correo sale de aqui.
# (`.local` y `.test` los rechaza email-validator por ser de uso especial.)
USUARIOS = [
    ("Admin Dev", "admin@baches.example.com", Rol.ADMIN),
    ("Revisor Dev", "revisor@baches.example.com", Rol.REVISOR),
    ("Operador Dev", "operador@baches.example.com", Rol.OPERADOR),
    ("Ciudadano Dev", "ciudadano@baches.example.com", Rol.CIUDADANO),
]
PASSWORD_DEV = "desarrollo-local-2026"


def main() -> None:
    db = SessionLocal()
    try:
        for codigo, nombre, tipo_via, exposicion, holdout in RUTAS:
            if db.scalar(select(Ruta).where(Ruta.codigo == codigo)):
                continue
            db.add(
                Ruta(
                    codigo=codigo,
                    nombre=nombre,
                    tipo_via=tipo_via,
                    exposicion_transito=exposicion,
                    es_holdout=holdout,
                )
            )
            print(f"ruta creada: {codigo} {nombre}")

        for nombre, email, rol in USUARIOS:
            if db.scalar(select(Usuario).where(Usuario.email == email)):
                continue
            db.add(
                Usuario(
                    nombre=nombre,
                    email=email,
                    password_hash=hash_password(PASSWORD_DEV),
                    rol=rol,
                    email_verificado=True,
                    acepto_privacidad_en=datetime.now(UTC),
                )
            )
            print(f"usuario creado: {email} ({rol.value})")

        db.commit()
        print(f"\nContrasena de todos los usuarios de desarrollo: {PASSWORD_DEV}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
