"""RF-15: interpolacion de posicion para los fotogramas de video."""
import uuid
from datetime import UTC, datetime

from app.models.route import EstadoRecorrido, MuestraGps, Recorrido
from app.models.user import Rol
from app.services.geo import interpolar_posicion, punto


def _recorrido_con_muestras(db, crear_usuario):
    operador = crear_usuario(Rol.OPERADOR)
    rec = Recorrido(
        idempotency_key=str(uuid.uuid4()),
        operador_id=operador.id,
        iniciado_en=datetime.now(UTC),
        estado=EstadoRecorrido.GRABANDO,
    )
    db.add(rec)
    db.flush()
    db.add_all(
        [
            MuestraGps(recorrido_id=rec.id, t_ms=0, geom=punto(18.4860, -69.8570)),
            MuestraGps(recorrido_id=rec.id, t_ms=1000, geom=punto(18.4870, -69.8580)),
        ]
    )
    db.commit()
    return rec


def test_interpola_en_el_punto_medio(db, crear_usuario):
    rec = _recorrido_con_muestras(db, crear_usuario)
    lat, lon = interpolar_posicion(db, rec.id, 500)
    assert abs(lat - 18.4865) < 1e-6
    assert abs(lon - (-69.8575)) < 1e-6


def test_antes_de_la_primera_muestra_usa_la_primera(db, crear_usuario):
    rec = _recorrido_con_muestras(db, crear_usuario)
    lat, _ = interpolar_posicion(db, rec.id, 0)
    assert abs(lat - 18.4860) < 1e-6


def test_despues_de_la_ultima_muestra_usa_la_ultima(db, crear_usuario):
    rec = _recorrido_con_muestras(db, crear_usuario)
    lat, _ = interpolar_posicion(db, rec.id, 999_999)
    assert abs(lat - 18.4870) < 1e-6


def test_sin_muestras_devuelve_none(db, crear_usuario):
    operador = crear_usuario(Rol.OPERADOR)
    rec = Recorrido(
        idempotency_key=str(uuid.uuid4()),
        operador_id=operador.id,
        iniciado_en=datetime.now(UTC),
    )
    db.add(rec)
    db.commit()
    assert interpolar_posicion(db, rec.id, 500) is None
