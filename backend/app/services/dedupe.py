"""RF-16: deteccion de duplicados por cercania espacial + ventana temporal + similitud visual."""
from __future__ import annotations

import uuid
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.report import Evidencia, Reporte


def _distancia_hamming(a: str | None, b: str | None) -> int | None:
    """Distancia entre dos perceptual hashes hexadecimales de 64 bits."""
    if not a or not b or len(a) != len(b):
        return None
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def candidatos_duplicados(
    db: Session,
    reporte: Reporte,
    radio_m: float | None = None,
    ventana_dias: int | None = None,
) -> list[dict]:
    """Devuelve candidatos ordenados por puntaje de similitud, sin fusionar nada.

    La fusion la decide SIEMPRE un revisor humano (RF-17).
    """
    radio = radio_m if radio_m is not None else settings.dedupe_radio_m
    ventana = timedelta(days=ventana_dias or settings.dedupe_ventana_dias)

    phash_origen = next(
        (e.phash for e in reporte.evidencias if e.phash), None
    )

    distancia = func.ST_Distance(Reporte.geom, reporte.geom).label("distancia_m")
    stmt = (
        select(Reporte, distancia)
        .where(
            Reporte.id != reporte.id,
            Reporte.fusionado_en_id.is_(None),
            # ST_DWithin sobre geography usa metros y aprovecha el indice GiST.
            func.ST_DWithin(Reporte.geom, reporte.geom, radio),
            Reporte.creado_en >= reporte.creado_en - ventana,
            Reporte.creado_en <= reporte.creado_en + ventana,
        )
        .order_by(distancia)
        .limit(20)
    )

    resultados: list[dict] = []
    for otro, distancia_m in db.execute(stmt).all():
        phash_otro = db.scalar(
            select(Evidencia.phash)
            .where(Evidencia.reporte_id == otro.id, Evidencia.phash.is_not(None))
            .limit(1)
        )
        hamming = _distancia_hamming(phash_origen, phash_otro)

        # Puntaje explicable: 70% proximidad, 30% similitud visual cuando existe.
        p_espacial = max(0.0, 1.0 - (distancia_m / radio)) if radio else 0.0
        p_visual = max(0.0, 1.0 - (hamming / 64)) if hamming is not None else None
        puntaje = p_espacial * 0.7 + (p_visual * 0.3 if p_visual is not None else p_espacial * 0.3)

        resultados.append(
            {
                "reporte_id": otro.id,
                "distancia_m": round(distancia_m, 2),
                # timedelta.days trunca hacia abajo: dos reportes separados por
                # segundos dan -1 dia. Se calcula sobre los segundos totales.
                "dias_diferencia": round(
                    abs((otro.creado_en - reporte.creado_en).total_seconds()) / 86400, 3
                ),
                "hamming_phash": hamming,
                "puntaje": round(puntaje, 4),
            }
        )

    return sorted(resultados, key=lambda r: r["puntaje"], reverse=True)


def fusionar(db: Session, origen_id: uuid.UUID, destino_id: uuid.UUID) -> Reporte:
    """Marca `origen` como fusionado en `destino` y acumula el contador de reportes."""
    origen = db.get(Reporte, origen_id)
    destino = db.get(Reporte, destino_id)
    if origen is None or destino is None:
        raise ValueError("Reporte origen o destino inexistente")

    from app.models.report import EstadoReporte

    origen.fusionado_en_id = destino.id
    origen.estado = EstadoReporte.FUSIONADO
    destino.veces_reportado += origen.veces_reportado
    db.flush()
    return destino
