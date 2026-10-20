"""Reglas de dominio: deduplicacion espacial (RF-16) y prioridad (RF-18)."""
from datetime import UTC, datetime

from app.models.report import EstadoReporte, Origen, Reporte, Severidad
from app.models.route import Ruta
from app.services import dedupe, priority
from app.services.geo import punto


def _reporte(db, lat: float, lon: float, **extra) -> Reporte:
    import uuid

    r = Reporte(
        idempotency_key=str(uuid.uuid4()),
        origen=Origen.CIUDADANO,
        geom=punto(lat, lon),
        estado=EstadoReporte.RECIBIDO,
        creado_en=datetime.now(UTC),
        **extra,
    )
    db.add(r)
    db.commit()
    return r


def test_duplicado_cercano_se_detecta(db):
    """Dos reportes a ~10 m: candidato a fusion."""
    a = _reporte(db, 18.48610, -69.85700)
    b = _reporte(db, 18.48619, -69.85703)
    candidatos = dedupe.candidatos_duplicados(db, b)
    assert [c["reporte_id"] for c in candidatos] == [a.id]
    assert candidatos[0]["distancia_m"] < 15


def test_reporte_lejano_no_es_duplicado(db):
    """A 1 km no hay relacion: el radio por defecto son 15 m."""
    _reporte(db, 18.48610, -69.85700)
    b = _reporte(db, 18.49500, -69.85700)
    assert dedupe.candidatos_duplicados(db, b) == []


def test_dias_diferencia_no_es_negativo(db):
    """Dos reportes separados por segundos no pueden dar 1 dia de diferencia."""
    _reporte(db, 18.48610, -69.85700)
    b = _reporte(db, 18.48612, -69.85701)
    assert dedupe.candidatos_duplicados(db, b)[0]["dias_diferencia"] < 0.01


def test_fusion_acumula_frecuencia(db):
    a = _reporte(db, 18.48610, -69.85700)
    b = _reporte(db, 18.48619, -69.85703)
    destino = dedupe.fusionar(db, b.id, a.id)
    db.commit()
    assert destino.id == a.id
    assert destino.veces_reportado == 2
    assert db.get(Reporte, b.id).estado == EstadoReporte.FUSIONADO


def test_prioridad_grave_supera_leve(db):
    ruta = Ruta(codigo="R1", nombre="Av. Espana", tipo_via="avenida", exposicion_transito=5)
    leve = _reporte(db, 18.4861, -69.8570, severidad_validada=Severidad.LEVE)
    grave = _reporte(db, 18.4862, -69.8571, severidad_validada=Severidad.GRAVE)

    p_leve, _ = priority.calcular(leve, ruta)
    p_grave, detalle = priority.calcular(grave, ruta)

    assert p_grave > p_leve
    # RF-18: la prioridad debe ser explicable, no una caja negra.
    assert "formula" in detalle and "factores" in detalle
    assert detalle["factores"]["severidad"]["valor"] == "grave"


def test_prioridad_sube_con_la_frecuencia(db):
    ruta = Ruta(codigo="R1", nombre="Av. Espana", tipo_via="avenida", exposicion_transito=3)
    uno = _reporte(db, 18.4861, -69.8570, severidad_validada=Severidad.MODERADA)
    varios = _reporte(
        db, 18.4871, -69.8580, severidad_validada=Severidad.MODERADA, veces_reportado=5
    )
    assert priority.calcular(varios, ruta)[0] > priority.calcular(uno, ruta)[0]
