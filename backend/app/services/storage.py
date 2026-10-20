"""Almacenamiento de evidencia en objeto S3-compatible (MinIO en local)."""
from __future__ import annotations

import hashlib
import uuid
from functools import lru_cache

import boto3
from botocore.client import Config

from app.core.config import settings


@lru_cache
def cliente_s3():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        # path-style: obligatorio contra S3 autoalojado (SeaweedFS, MinIO).
        config=Config(signature_version="s3v4", s3={"addressing_style": "path"}),
    )


def asegurar_bucket() -> None:
    s3 = cliente_s3()
    existentes = {b["Name"] for b in s3.list_buckets().get("Buckets", [])}
    if settings.s3_bucket_evidencia not in existentes:
        s3.create_bucket(Bucket=settings.s3_bucket_evidencia)


def subir(contenido: bytes, prefijo: str, extension: str, content_type: str) -> tuple[str, str]:
    """Sube y devuelve (s3_key, sha256). La suma de comprobacion da integridad (RNF-01)."""
    sha = hashlib.sha256(contenido).hexdigest()
    key = f"{prefijo}/{sha[:2]}/{uuid.uuid4().hex}.{extension}"
    cliente_s3().put_object(
        Bucket=settings.s3_bucket_evidencia,
        Key=key,
        Body=contenido,
        ContentType=content_type,
        Metadata={"sha256": sha},
    )
    return key, sha


def url_firmada(s3_key: str, segundos: int = 600) -> str:
    """Acceso temporal: la evidencia original no se expone publicamente."""
    return cliente_s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_evidencia, "Key": s3_key},
        ExpiresIn=segundos,
    )


def descargar(s3_key: str) -> bytes:
    obj = cliente_s3().get_object(Bucket=settings.s3_bucket_evidencia, Key=s3_key)
    return obj["Body"].read()
