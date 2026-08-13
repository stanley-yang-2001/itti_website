"""
One-off data repair: rewrites *existing* rows whose stored file path is
an old-style absolute path (e.g.
"C:\\Users\\stanl\\itti\\website_v2\\server\\fellow_uploads\\fellows\\xyz.jpg",
baked in by a pre-fix version of storage.py's LocalStorage.save() that
returned os.path.join(base_dir, ...) directly) into the new portable,
base_dir-relative format ("fellows/xyz.jpg").

This is what actually fixes "fellow images missing, internal server
error" for any row that predates the storage.py fix in this same
change - the code fix alone only stops it from *crashing* (turns the
500 into a clean 404); the photo still won't load until the DB row
itself points somewhere resolvable. Newly-created rows already come
out of save() in the new format and don't need this.

Only touches a row if the file it's supposed to point to can actually
be found sitting under the relevant storage's base_dir with a matching
filename - if it can't be found (never committed to this checkout, or
genuinely lost when local disk was wiped on a redeploy), the row is
left untouched and printed as unresolved, since guessing would risk
pointing it at the wrong file entirely. Unresolved rows need
re-uploading through the app instead - see docs/DEPLOYMENT.md,
"Persistent storage for uploads".

Safe to run multiple times (already-relative paths are skipped) and
against any configured DATABASE_URL / STORAGE_BACKEND - though this
only ever has anything to fix under STORAGE_BACKEND=local, since
S3Storage has never stored absolute local-disk paths.

Usage:
    python migrate_absolute_storage_paths.py          # apply
    python migrate_absolute_storage_paths.py --dry-run  # report only
"""
import os
import re
import sys

from models.database import Session
from models.fellow import Fellow
from models.report import Report
from models.document import Document

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# (label, base_dir, [(model, column_name), ...])
TARGETS = [
    ("fellows", os.path.join(BASE_DIR, "fellow_uploads"), [(Fellow, "photo_path")]),
    ("reports", os.path.join(BASE_DIR, "report_uploads"), [(Report, "file_path"), (Report, "image_path")]),
    ("documents", os.path.join(BASE_DIR, "uploads"), [(Document, "file_path")]),
]

ABS_WINDOWS_RE = re.compile(r"^[A-Za-z]:[\\/]")


def is_absolute(path):
    return bool(path) and (os.path.isabs(path) or ABS_WINDOWS_RE.match(path))


def find_relative_path(base_dir, absolute_path):
    """
    Given an old absolute path (Windows or Unix, from whichever machine
    originally ran the upload) and this environment's actual base_dir
    for that storage, tries to find the same file sitting under
    base_dir by matching on its last two path segments
    ("<parent-dir>/<filename>" - e.g. "fellows/xyz.jpg" or
    "2/xyz_report.pdf") and confirming it exists. Returns the new
    relative path (forward-slash, matching what storage.py's save()
    produces going forward) or None if no matching file is found.
    """
    normalized = absolute_path.replace("\\", "/")
    parts = [p for p in normalized.split("/") if p]
    if len(parts) < 2:
        return None
    candidate_relative = "/".join(parts[-2:])  # "<parent-dir>/<filename>"
    candidate_full = os.path.join(base_dir, parts[-2], parts[-1])
    if os.path.isfile(candidate_full):
        return candidate_relative
    return None


def main():
    dry_run = "--dry-run" in sys.argv
    session = Session()
    fixed = 0
    unresolved = []
    try:
        for label, base_dir, model_columns in TARGETS:
            for model, column in model_columns:
                rows = session.query(model).all()
                for row in rows:
                    value = getattr(row, column)
                    if not is_absolute(value):
                        continue
                    new_value = find_relative_path(base_dir, value)
                    if new_value is None:
                        unresolved.append((label, model.__name__, row.id, column, value))
                        continue
                    print(f"[{label}] {model.__name__}#{row.id}.{column}: {value!r} -> {new_value!r}")
                    if not dry_run:
                        setattr(row, column, new_value)
                        fixed += 1
        if not dry_run and fixed:
            session.commit()
    finally:
        session.close()

    print(f"\n{'Would fix' if dry_run else 'Fixed'} {fixed} row(s).")
    if unresolved:
        print(f"\n{len(unresolved)} row(s) left untouched - no matching file found on this machine:")
        for label, model_name, row_id, column, value in unresolved:
            print(f"  [{label}] {model_name}#{row_id}.{column}: {value!r}")
        print("\nThese need the file re-uploaded through the app itself.")


if __name__ == "__main__":
    main()