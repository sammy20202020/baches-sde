"""Configuracion central. Todo por variables de entorno (12-factor)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    app_name: str = "API Baches SDE"
    api_v1_prefix: str = "/api/v1"
    environment: str = "development"
    debug: bool = True

    # --- Base de datos (PostgreSQL + PostGIS) ---
    database_url: str = "postgresql+psycopg://baches:baches@localhost:5432/baches"

    # --- Seguridad (RNF-01) ---
    jwt_secret: str = "cambiar-en-produccion-usar-secreto-de-32-bytes-minimo"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 15        # tokens de acceso de corta duracion
    refresh_token_days: int = 30          # rotativos
    email_token_hours: int = 24

    # --- Redis / Celery ---
    redis_url: str = "redis://localhost:6379/0"

    # --- Almacenamiento de objetos S3-compatible ---
    s3_endpoint_url: str = "http://localhost:8333"
    s3_access_key: str = "bachesdev"
    s3_secret_key: str = "bachesdev-secret"
    s3_bucket_evidencia: str = "evidencia"
    s3_region: str = "us-east-1"

    # --- Reglas de dominio ---
    dedupe_radio_m: float = 15.0          # RF-16: cercania espacial
    dedupe_ventana_dias: int = 30         # RF-16: ventana temporal
    gps_precision_max_m: float = 50.0     # sobre este valor se marca para revision
    max_foto_mb: int = 12                 # RF-05
    max_video_mb: int = 400               # RF-13

    # --- Notificaciones push (Expo) ---
    expo_push_url: str = "https://exp.host/--/api/v2/push/send"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
