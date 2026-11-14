"""Cloudflare R2 Object Storage Client for sutra.

Provides S3-compatible object storage operations (upload, download, presign, delete)
using Cloudflare R2 endpoint and credentials.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional
from utils.logging import get_logger

LOGGER = get_logger("sutra.storage.r2")

_R2_CLIENT: Any = None


def get_r2_endpoint() -> Optional[str]:
    """Build Cloudflare R2 endpoint from account ID."""
    account_id = os.environ.get("R2_ACCOUNT_ID")
    if not account_id:
        return None
    return f"https://{account_id}.r2.cloudflarestorage.com"


def get_bucket_name() -> str:
    """Retrieve default Cloudflare R2 bucket name."""
    return os.environ.get("R2_BUCKET_NAME", "sutra-artifacts")


def get_r2_client():
    """Lazily initialize and return the Cloudflare R2 (boto3 S3) client."""
    global _R2_CLIENT
    if _R2_CLIENT is None:
        endpoint = get_r2_endpoint()
        access_key = os.environ.get("R2_ACCESS_KEY_ID")
        secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")

        if not (endpoint and access_key and secret_key):
            LOGGER.debug("Cloudflare R2 credentials not fully configured in environment.")
            return None

        try:
            import boto3
            _R2_CLIENT = boto3.client(
                "s3",
                endpoint_url=endpoint,
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name="auto",
            )
            LOGGER.info("Cloudflare R2 storage client initialized.")
        except Exception as exc:
            LOGGER.warning("Could not initialize Cloudflare R2 client: %s", exc)
            return None
    return _R2_CLIENT


def upload_file_to_r2(local_path: str | Path, remote_key: str, bucket: Optional[str] = None) -> bool:
    """Upload a local file to Cloudflare R2 bucket."""
    client = get_r2_client()
    if client is None:
        LOGGER.debug("R2 client unavailable; cannot upload %s", local_path)
        return False
    target_bucket = bucket or get_bucket_name()
    try:
        client.upload_file(str(local_path), target_bucket, remote_key)
        LOGGER.info("Successfully uploaded %s to R2 key %s", local_path, remote_key)
        return True
    except Exception as exc:
        LOGGER.error("Failed to upload %s to Cloudflare R2: %s", local_path, exc)
        return False


def generate_presigned_download_url(remote_key: str, expires_in: int = 3600, bucket: Optional[str] = None) -> Optional[str]:
    """Generate a presigned GET URL for an object stored in Cloudflare R2."""
    client = get_r2_client()
    if client is None:
        return None
    target_bucket = bucket or get_bucket_name()
    try:
        url = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": target_bucket, "Key": remote_key},
            ExpiresIn=expires_in,
        )
        return url
    except Exception as exc:
        LOGGER.error("Failed to generate R2 presigned URL for key %s: %s", remote_key, exc)
        return None
