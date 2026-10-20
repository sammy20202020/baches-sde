"""Cola de tareas: el analisis de IA y el video no bloquean al movil (RNF-04)."""
from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "baches",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Santo_Domingo",
    task_acks_late=True,              # si el worker muere, la tarea se reintenta
    worker_prefetch_multiplier=1,     # tareas pesadas: una a la vez por worker
    task_track_started=True,
    result_expires=86400,
    task_routes={
        "app.workers.tasks.analizar_foto": {"queue": "ia"},
        "app.workers.tasks.procesar_video": {"queue": "video"},
    },
)
