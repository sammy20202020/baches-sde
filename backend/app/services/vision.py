"""Deteccion de baches. PyTorch/Ultralytics YOLO + OpenCV.

La IA vive SOLO en el backend (los workers), nunca en el telefono: el movil sube
evidencia y recibe resultados. Si el modelo no esta disponible se devuelve un
resultado neutro para que el flujo completo sea probable sin pesos entrenados.
"""
from __future__ import annotations

import io
import os
from dataclasses import dataclass
from functools import lru_cache

MODELO_PATH = os.getenv("YOLO_MODELO_PATH", "models/baches-yolo.pt")
UMBRAL_CONFIANZA = float(os.getenv("YOLO_UMBRAL", "0.35"))


@dataclass
class Deteccion:
    bbox: tuple[float, float, float, float]  # x1, y1, x2, y2 normalizados
    confianza: float
    severidad: str  # leve | moderada | grave


@lru_cache
def _modelo():
    """Carga diferida: la API no arranca torch, solo el worker de IA lo hace."""
    try:
        from ultralytics import YOLO
    except ImportError:
        return None
    if not os.path.exists(MODELO_PATH):
        return None
    return YOLO(MODELO_PATH)


def _severidad_por_area(bbox: tuple[float, float, float, float]) -> str:
    """Heuristica inicial por area relativa; se recalibra con las rutas 1-3."""
    area = abs(bbox[2] - bbox[0]) * abs(bbox[3] - bbox[1])
    if area >= 0.12:
        return "grave"
    if area >= 0.04:
        return "moderada"
    return "leve"


def detectar(imagen_bytes: bytes) -> list[Deteccion]:
    modelo = _modelo()
    if modelo is None:
        # Sin pesos: no se inventan detecciones. El reporte pasa a revision humana igual.
        return []

    import numpy as np
    from PIL import Image

    img = Image.open(io.BytesIO(imagen_bytes)).convert("RGB")
    w, h = img.size
    resultados = modelo.predict(np.array(img), conf=UMBRAL_CONFIANZA, verbose=False)

    detecciones: list[Deteccion] = []
    for r in resultados:
        for box in r.boxes:
            x1, y1, x2, y2 = (float(v) for v in box.xyxy[0].tolist())
            bbox = (x1 / w, y1 / h, x2 / w, y2 / h)
            detecciones.append(
                Deteccion(bbox=bbox, confianza=float(box.conf[0]), severidad=_severidad_por_area(bbox))
            )
    return detecciones


def phash(imagen_bytes: bytes) -> str | None:
    """Hash perceptual para similitud visual en deduplicacion (RF-16)."""
    try:
        import imagehash
        from PIL import Image
    except ImportError:
        return None
    return str(imagehash.phash(Image.open(io.BytesIO(imagen_bytes))))


def extraer_frames(video_bytes: bytes, cada_n_segundos: float = 1.0) -> list[tuple[int, bytes]]:
    """RF-14: devuelve [(t_ms, jpeg_bytes)] muestreando el video con OpenCV."""
    try:
        import cv2
        import numpy as np
    except ImportError:
        return []

    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp:
        tmp.write(video_bytes)
        tmp.flush()
        cap = cv2.VideoCapture(tmp.name)
        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        paso = max(1, int(fps * cada_n_segundos))

        frames: list[tuple[int, bytes]] = []
        i = 0
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if i % paso == 0:
                t_ms = int((i / fps) * 1000)
                ok_enc, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if ok_enc:
                    frames.append((t_ms, np.asarray(buf).tobytes()))
            i += 1
        cap.release()
        return frames
