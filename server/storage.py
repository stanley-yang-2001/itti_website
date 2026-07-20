"""
Pluggable file storage.

STORAGE_BACKEND controls where uploaded documents actually live:
  - "local" (default) -> server/uploads/<user_id>/<stored_name>, same as before
  - "s3"               -> an S3-compatible bucket (AWS S3, Cloudflare R2,
                           Backblaze B2, MinIO, ...)

Local disk is fine for a single-server local/dev setup, but most modern
hosts use ephemeral filesystems - anything written to disk disappears on
the next redeploy or restart. Switching to "s3" is one env var
(STORAGE_BACKEND=s3) plus bucket credentials; nothing in app.py needs to
change, since both backends implement the same save/delete interface.

boto3 is only imported when the S3 backend is actually selected, so
local-only setups don't need it installed.
"""
import os
import uuid


class LocalStorage:
    """Saves files to a directory on local disk."""

    def __init__(self, base_dir):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def save(self, user_id, filename, file_obj):
        """Saves an uploaded file. Returns (storage_path, size_bytes).
        storage_path is what gets stored in Document.file_path."""
        user_dir = os.path.join(self.base_dir, str(user_id))
        os.makedirs(user_dir, exist_ok=True)

        # Prefix with a uuid to avoid collisions/overwrites from same-named uploads.
        stored_name = f"{uuid.uuid4().hex}_{filename}"
        full_path = os.path.join(user_dir, stored_name)
        file_obj.save(full_path)
        size_bytes = os.path.getsize(full_path)
        return full_path, size_bytes

    def delete(self, storage_path):
        """Best-effort delete - missing files are not an error (the DB
        row is the source of truth for whether a document 'exists')."""
        try:
            os.remove(storage_path)
        except OSError:
            pass


class S3Storage:
    """Saves files to an S3-compatible bucket."""

    def __init__(self, bucket, prefix="", endpoint_url=None):
        import boto3  # local import: only needed when this backend is selected

        self.bucket = bucket
        self.prefix = prefix.rstrip("/")
        self.client = boto3.client("s3", endpoint_url=endpoint_url)

    def _key(self, user_id, stored_name):
        parts = [p for p in (self.prefix, str(user_id), stored_name) if p]
        return "/".join(parts)

    def save(self, user_id, filename, file_obj):
        stored_name = f"{uuid.uuid4().hex}_{filename}"
        key = self._key(user_id, stored_name)

        file_obj.stream.seek(0)
        self.client.upload_fileobj(file_obj.stream, self.bucket, key)

        size_bytes = self.client.head_object(Bucket=self.bucket, Key=key)["ContentLength"]
        # storage_path stored in the DB is the S3 key, e.g. "documents/12/abcd_report.pdf"
        return key, size_bytes

    def delete(self, storage_path):
        try:
            self.client.delete_object(Bucket=self.bucket, Key=storage_path)
        except Exception:
            pass


def get_storage(upload_dir):
    """Factory: reads STORAGE_BACKEND (and, for s3, STORAGE_S3_BUCKET /
    STORAGE_S3_PREFIX / STORAGE_S3_ENDPOINT_URL) from the environment and
    returns the configured backend."""
    backend = os.environ.get("STORAGE_BACKEND", "local").lower()

    if backend == "s3":
        bucket = os.environ.get("STORAGE_S3_BUCKET")
        if not bucket:
            raise RuntimeError("STORAGE_BACKEND=s3 requires STORAGE_S3_BUCKET to be set")
        return S3Storage(
            bucket=bucket,
            prefix=os.environ.get("STORAGE_S3_PREFIX", "documents"),
            endpoint_url=os.environ.get("STORAGE_S3_ENDPOINT_URL"),  # unset -> real AWS S3
        )

    return LocalStorage(upload_dir)