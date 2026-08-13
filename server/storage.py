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
import re
import uuid


class LocalStorage:
    """Saves files to a directory on local disk."""

    def __init__(self, base_dir):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def save(self, user_id, filename, file_obj):
        """
        Saves an uploaded file. Returns (storage_path, size_bytes).
        storage_path is what gets stored in e.g. Document.file_path -
        deliberately a forward-slash-joined path *relative* to
        self.base_dir (e.g. "2/abcd1234_report.pdf"), not an absolute
        one, so it stays valid regardless of what machine or container
        this code happens to run on next. self.base_dir itself already
        varies per-environment (a Windows dev laptop's checkout path
        vs. this repo's Docker image's /app), so an absolute path
        baked in at save() time would only ever resolve back on the
        exact machine that wrote it - see _resolve()'s docstring for
        what happens to older rows that already have one.
        """
        user_dir = os.path.join(self.base_dir, str(user_id))
        os.makedirs(user_dir, exist_ok=True)

        # Prefix with a uuid to avoid collisions/overwrites from same-named uploads.
        stored_name = f"{uuid.uuid4().hex}_{filename}"
        full_path = os.path.join(user_dir, stored_name)
        file_obj.save(full_path)
        size_bytes = os.path.getsize(full_path)
        relative_path = f"{user_id}/{stored_name}"
        return relative_path, size_bytes

    def _resolve(self, storage_path):
        """
        storage_path may be:
          - new-style: relative to self.base_dir, forward-slash
            separated (what save() has produced since this comment was
            added) - portable, works the same on every machine.
          - old-style: an absolute path a previous version of save()
            returned directly (e.g. a Windows dev machine's
            "C:\\Users\\...\\fellow_uploads\\fellows\\xyz.jpg", or a
            plain Unix absolute path from whichever machine originally
            ran the upload). There's no way to make an already-baked-in
            absolute path portable after the fact - it's used as-is,
            which correctly resolves on the machine that wrote it and
            correctly 404s (via get_file_response()'s FileNotFoundError
            handling below) anywhere else, rather than crashing. Rows
            like this need re-uploading once found; see
            docs/DEPLOYMENT.md.
        """
        if os.path.isabs(storage_path) or re.match(r"^[A-Za-z]:[\\/]", storage_path):
            return storage_path
        return os.path.join(self.base_dir, *storage_path.replace("\\", "/").split("/"))

    def delete(self, storage_path):
        """Best-effort delete - missing files are not an error (the DB
        row is the source of truth for whether a document 'exists')."""
        try:
            os.remove(self._resolve(storage_path))
        except OSError:
            pass

    def get_file_response(self, storage_path, download_name, mimetype=None):
        """
        Returns a Flask response object that serves the file at
        storage_path back to the client. Used for content meant to be
        publicly downloadable (e.g. Report files/images) - Document
        never needed this, since a user's own uploads were never served
        back through the app.

        Raises Werkzeug's 404 (via abort()), not a raw exception, if
        the file is missing on disk - this happens in practice whenever
        this backend is used on a host with an ephemeral filesystem
        (e.g. a PaaS container that gets rebuilt from a fresh image on
        every deploy) or when storage_path is an old-style absolute
        path from a different machine (see _resolve() above): the DB
        row referencing this path can outlive, or simply never have
        matched, the file itself. Without this, Flask's send_file()
        raises a bare FileNotFoundError, which isn't an HTTPException
        and so falls through to the app's catch-all error handler - a
        generic 500 "internal server error" instead of a clean "file
        not found". See docs/DEPLOYMENT.md, "Persistent storage for
        uploads", for switching to STORAGE_BACKEND=s3, which avoids
        this class of failure entirely by not depending on the
        container's local disk surviving between deploys.
        """
        from flask import send_file, abort

        try:
            return send_file(self._resolve(storage_path), download_name=download_name, mimetype=mimetype)
        except FileNotFoundError:
            abort(404, description="File not found")


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

    def get_file_response(self, storage_path, download_name, mimetype=None):
        """
        Redirects the client to a short-lived presigned S3 URL rather
        than proxying the bytes through this server - standard practice
        for S3-backed downloads (cheaper, faster, no memory spike on
        this process for large files).
        """
        from flask import redirect

        url = self.client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket,
                "Key": storage_path,
                "ResponseContentDisposition": f'attachment; filename="{download_name}"',
            },
            ExpiresIn=300,  # 5 minutes - plenty for a browser to start the download
        )
        return redirect(url)


def get_storage(upload_dir, s3_prefix=None):
    """
    Factory: reads STORAGE_BACKEND (and, for s3, STORAGE_S3_BUCKET /
    STORAGE_S3_ENDPOINT_URL) from the environment and returns the
    configured backend. s3_prefix overrides STORAGE_S3_PREFIX for
    callers that need a distinct namespace within the same bucket
    (e.g. reports vs. documents) - if not given, falls back to
    STORAGE_S3_PREFIX (default "documents"), preserving prior behavior.
    """
    backend = os.environ.get("STORAGE_BACKEND", "local").lower()

    if backend == "s3":
        bucket = os.environ.get("STORAGE_S3_BUCKET")
        if not bucket:
            raise RuntimeError("STORAGE_BACKEND=s3 requires STORAGE_S3_BUCKET to be set")
        return S3Storage(
            bucket=bucket,
            prefix=s3_prefix if s3_prefix is not None else os.environ.get("STORAGE_S3_PREFIX", "documents"),
            endpoint_url=os.environ.get("STORAGE_S3_ENDPOINT_URL"),  # unset -> real AWS S3
        )

    return LocalStorage(upload_dir)