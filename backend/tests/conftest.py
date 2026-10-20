"""Pruebas de integracion contra PostGIS real.

Se usa la base real porque todo el dominio depende de funciones espaciales
(ST_DWithin, geography): con SQLite las pruebas no probarian lo que importa.
Requiere `make up` (o al menos el servicio `db`).
"""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

os.environ.setdefault(
    "DATABASE_URL", "postgresql+psycopg://baches:baches@localhost:5432/baches"
)
os.environ.setdefault("S3_ENDPOINT_URL", "http://localhost:8333")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.session import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.route import Ruta  # noqa: E402
from app.models.user import Rol, Usuario  # noqa: E402

TEST_DB = "baches_test"


@pytest.fixture(scope="session")
def engine_test():
    """Crea una base temporal y le aplica el esquema completo."""
    admin_url = settings.database_url.rsplit("/", 1)[0] + "/postgres"
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB}"))
        conn.execute(text(f"CREATE DATABASE {TEST_DB}"))
    admin.dispose()

    url = settings.database_url.rsplit("/", 1)[0] + f"/{TEST_DB}"
    eng = create_engine(url)
    with eng.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        conn.commit()
    Base.metadata.create_all(eng)
    yield eng

    eng.dispose()
    admin = create_engine(admin_url, isolation_level="AUTOCOMMIT")
    with admin.connect() as conn:
        conn.execute(text(f"DROP DATABASE IF EXISTS {TEST_DB}"))
    admin.dispose()


@pytest.fixture
def db(engine_test):
    Session = sessionmaker(bind=engine_test, expire_on_commit=False)
    sesion = Session()
    yield sesion
    sesion.rollback()
    # Limpieza entre pruebas: el orden respeta las claves foraneas.
    for tabla in reversed(Base.metadata.sorted_tables):
        sesion.execute(text(f'TRUNCATE TABLE "{tabla.name}" CASCADE'))
    sesion.commit()
    sesion.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


PASSWORD = "clave-de-prueba-2026"


@pytest.fixture
def crear_usuario(db):
    def _crear(rol: Rol = Rol.CIUDADANO, email: str | None = None) -> Usuario:
        usuario = Usuario(
            nombre=f"Prueba {rol.value}",
            email=email or f"{rol.value}-{uuid.uuid4().hex[:8]}@baches.example.com",
            password_hash=hash_password(PASSWORD),
            rol=rol,
            email_verificado=True,
            acepto_privacidad_en=datetime.now(UTC),
        )
        db.add(usuario)
        db.commit()
        return usuario

    return _crear


@pytest.fixture
def token(client, crear_usuario):
    def _token(rol: Rol = Rol.CIUDADANO) -> str:
        usuario = crear_usuario(rol)
        r = client.post(
            "/api/v1/auth/login", json={"email": usuario.email, "password": PASSWORD}
        )
        assert r.status_code == 200, r.text
        return r.json()["access_token"]

    return _token


@pytest.fixture
def ruta_r1(db):
    ruta = Ruta(
        codigo="R1", nombre="Avenida Espana", tipo_via="avenida", exposicion_transito=4
    )
    db.add(ruta)
    db.commit()
    return ruta


@pytest.fixture
def foto_jpeg() -> bytes:
    """JPEG valido generado al vuelo: las pruebas no dependen de archivos externos."""
    import io

    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (64, 64), (90, 90, 95)).save(buf, format="JPEG", quality=80)
    return buf.getvalue()
