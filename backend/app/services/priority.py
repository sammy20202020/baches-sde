"""RF-18: prioridad orientativa y EXPLICABLE. Nada de cajas negras."""
from __future__ import annotations

from app.models.report import Reporte, Severidad
from app.models.route import Ruta

PESO_SEVERIDAD = {Severidad.LEVE: 0.3, Severidad.MODERADA: 0.65, Severidad.GRAVE: 1.0}
PESO_TIPO_VIA = {"avenida": 1.0, "troncal": 1.0, "colectora": 0.75, "local": 0.5}

# Los pesos suman 1.0 y se documentan para que el revisor entienda el resultado.
W_SEVERIDAD = 0.40
W_FRECUENCIA = 0.25
W_TIPO_VIA = 0.20
W_EXPOSICION = 0.15


def calcular(reporte: Reporte, ruta: Ruta | None = None) -> tuple[float, dict]:
    severidad = reporte.severidad_validada or reporte.severidad_ia
    f_severidad = PESO_SEVERIDAD.get(severidad, 0.5) if severidad else 0.5

    # Satura a los 5 reportes: mas alla de eso no aporta discriminacion.
    f_frecuencia = min(reporte.veces_reportado, 5) / 5

    tipo_via = (ruta.tipo_via if ruta else "local").lower()
    f_tipo_via = PESO_TIPO_VIA.get(tipo_via, 0.5)

    f_exposicion = ((ruta.exposicion_transito if ruta else 3) - 1) / 4

    puntaje = (
        f_severidad * W_SEVERIDAD
        + f_frecuencia * W_FRECUENCIA
        + f_tipo_via * W_TIPO_VIA
        + f_exposicion * W_EXPOSICION
    )
    puntaje = round(puntaje * 100, 2)

    detalle = {
        "puntaje": puntaje,
        "formula": "severidad*0.40 + frecuencia*0.25 + tipo_via*0.20 + exposicion*0.15",
        "factores": {
            "severidad": {"valor": severidad.value if severidad else None, "factor": f_severidad},
            "frecuencia": {"veces_reportado": reporte.veces_reportado, "factor": f_frecuencia},
            "tipo_via": {"valor": tipo_via, "factor": f_tipo_via},
            "exposicion_transito": {
                "valor": ruta.exposicion_transito if ruta else 3,
                "factor": round(f_exposicion, 4),
            },
        },
        "nota": "Prioridad orientativa. No sustituye la decision de la autoridad competente.",
    }
    return puntaje, detalle
