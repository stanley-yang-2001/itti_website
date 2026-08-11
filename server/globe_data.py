"""
globe_data.py

Backs the publisher/admin globe-data upload flow (POST
/api/globe-data/upload in app.py):
  1. validate_workbook(kind, path)   - try to extract the workbook with the
     same logic data_scripts/{kind}_extract.py uses; raises ValueError with
     a human-readable reason if the workbook doesn't fit.
  2. archive_workbook(kind, path, original_filename) - copies the raw
     upload into server/data_scripts/{kind}_storage/, timestamped, as a
     permanent audit trail of every upload ever made (Publisher
     Dashboard's upload history via list_uploads()).
  3. rotate_source_file(kind, tmp_path, original_filename) - whatever is
     currently sitting in data_scripts/{kind}_source/ (the file the CLI
     scripts themselves read from) moves into data_scripts/{kind}_source/old/,
     timestamped so repeat uploads never collide or silently overwrite
     history; the new upload then takes its place as the canonical source
     file, so a later manual run of the CLI script picks up the same file
     this endpoint just applied.
  4. sync_cached_extraction(kind, extracted_data) - writes the already-
     validated extraction out to data_scripts/{kind}_country_data.json,
     the same path/shape `python3 {kind}_extract.py {kind}_source/ -o
     {kind}_country_data.json` would produce, so that file stays in sync
     with whatever's live rather than going stale after the first upload.
  5. apply_workbook_to_country_data(kind, extracted_data) - merges the
     extraction into the existing server/data/country_data.json IN PLACE:
     only the given kind's section ("ETTI" or "GTBI") is touched, per
     country. Countries new to this workbook are added (with the other
     section defaulted to "Data Pending" if they didn't already exist);
     countries already in country_data.json keep their other section as-is.

This intentionally does NOT reuse combine_country_data.py's full-rebuild
behavior, since that script starts from a blank slate covering all 249
world countries built from BOTH extract outputs at once. A single
publisher/admin uploading just a new ETTI workbook shouldn't blow away
whatever GTBI data is already sitting in country_data.json from a
previous, unrelated upload - so this module updates one section at a
time, merging into whatever is already on disk.
"""

import datetime
import json
import os
import shutil
import sys

DATA_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_SCRIPTS_DIR = os.path.join(DATA_SCRIPTS_DIR, "data_scripts")
sys.path.insert(0, DATA_SCRIPTS_DIR)

import etti_extract  # noqa: E402
import gtbi_extract  # noqa: E402

try:
    import pycountry
except ImportError:
    pycountry = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COUNTRY_DATA_PATH = os.path.join(BASE_DIR, "data", "country_data.json")

VALID_KINDS = ("ETTI", "GTBI")

MISSING = "Data Pending"

EMPTY_ETTI_SECTION = {
    MISSING: {"evs": MISSING, "tie": MISSING, "pdl": MISSING, "its": MISSING, "etti": MISSING}
}
EMPTY_GTBI_SECTION = {
    MISSING: {"trauma_level": MISSING, "burden_rate": MISSING, "yll": MISSING, "yld": MISSING, "gtbi": MISSING}
}


class WorkbookValidationError(ValueError):
    """Raised when an uploaded spreadsheet doesn't fit the expected shape for its kind."""


def _storage_dir(kind):
    """server/data_scripts/{kind}_storage/, created if missing."""
    path = os.path.join(DATA_SCRIPTS_DIR, f"{kind}_storage")
    os.makedirs(path, exist_ok=True)
    return path


def _source_dir(kind):
    """server/data_scripts/{kind_lower}_source/, created if missing - the
    same folder the CLI scripts read from (etti_source/, gtbi_source/)."""
    path = os.path.join(DATA_SCRIPTS_DIR, f"{kind.lower()}_source")
    os.makedirs(path, exist_ok=True)
    return path


def validate_workbook(kind, path):
    """
    Attempts to extract the workbook the same way the CLI scripts do.
    Returns the extracted { "countries": {...}, "_unresolved_country_names": [...] }
    dict on success. Raises WorkbookValidationError with a human-readable
    reason on failure - missing/renamed sheets, no rows at all, etc.
    """
    if kind not in VALID_KINDS:
        raise WorkbookValidationError(f"Unknown kind '{kind}', expected one of {VALID_KINDS}")

    try:
        if kind == "ETTI":
            data = etti_extract.build_country_data(path)
        else:
            data = gtbi_extract.build_country_data(path)
    except KeyError as e:
        raise WorkbookValidationError(
            f"The workbook is missing an expected sheet: {e}. Check that all required "
            f"sheets are present and named exactly as expected."
        ) from e
    except Exception as e:  # noqa: BLE001 - surface any other parse failure as a clear message
        raise WorkbookValidationError(f"Could not read this workbook as a {kind} file: {e}") from e

    if not data.get("countries"):
        raise WorkbookValidationError(
            f"No usable country rows were found in this {kind} workbook. "
            f"Check that the sheet layout (header row, columns) matches the expected format."
        )

    return data


def archive_workbook(kind, path, original_filename):
    """
    Copies the original uploaded file into server/data_scripts/{kind}_storage/,
    prefixed with a UTC timestamp so repeated uploads never collide or
    silently overwrite a previous submission. This is a full audit trail
    of every upload ever made (used by the Publisher Dashboard's upload
    history) - distinct from rotate_source_file's job below, which only
    ever keeps the single current + single previous file the CLI scripts
    read from. Returns the archived copy's path. Copies rather than moves,
    since the caller still needs `path` afterward (e.g. to also pass it to
    rotate_source_file).
    """
    storage_dir = _storage_dir(kind)
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    safe_name = os.path.basename(original_filename)
    archived_name = f"{timestamp}_{safe_name}"
    archived_path = os.path.join(storage_dir, archived_name)
    shutil.copy2(path, archived_path)
    return archived_path


def rotate_source_file(kind, tmp_path, original_filename):
    """
    Installs `tmp_path` (an already-validated upload) as the new canonical
    source file for `kind` - data_scripts/{kind_lower}_source/ - after
    first moving whatever workbook is currently there into that same
    folder's old/ subfolder, timestamped so repeat uploads never collide
    or silently overwrite history. This is what keeps the CLI pipeline
    (`python3 {kind}_extract.py {kind}_source/`) and this upload endpoint
    pointed at the same file going forward. Skips Excel's transient lock
    files (~$...) if one happens to be sitting in the folder.
    Returns the new source file's path.
    """
    if kind not in VALID_KINDS:
        raise ValueError(f"Unknown kind '{kind}', expected one of {VALID_KINDS}")

    source_dir = _source_dir(kind)
    old_dir = os.path.join(source_dir, "old")
    os.makedirs(old_dir, exist_ok=True)

    timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    for existing_name in os.listdir(source_dir):
        existing_path = os.path.join(source_dir, existing_name)
        if not os.path.isfile(existing_path) or existing_name.startswith("~$"):
            continue  # skips the old/ subfolder itself (not a file) and Excel lock files
        shutil.move(existing_path, os.path.join(old_dir, f"{timestamp}_{existing_name}"))

    safe_name = os.path.basename(original_filename)
    new_source_path = os.path.join(source_dir, safe_name)
    shutil.move(tmp_path, new_source_path)
    return new_source_path


def sync_cached_extraction(kind, extracted_data):
    """
    Writes an already-validated extraction to
    data_scripts/{kind_lower}_country_data.json - the same file
    `{kind}_extract.py`'s own -o flag would produce - so it doesn't go
    stale after an upload applied through the API instead of the CLI.
    Returns the path written.
    """
    if kind not in VALID_KINDS:
        raise ValueError(f"Unknown kind '{kind}', expected one of {VALID_KINDS}")

    path = os.path.join(DATA_SCRIPTS_DIR, f"{kind.lower()}_country_data.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(extracted_data, f, indent=2, ensure_ascii=False)
    return path


def list_uploads():
    """
    Returns a list of archived uploads across both {kind}_storage/
    folders, newest first: [{"kind": "GTBI", "filename": "...",
    "uploaded_at": "<ISO 8601, parsed from the archive timestamp
    prefix>"}, ...]. Used by the Publisher Dashboard's upload history.
    Filenames are archived as "<UTC timestamp>_<original name>" by
    archive_workbook(), so the timestamp is parsed back out of the name
    rather than relying on filesystem mtime (which can change on copy).
    """
    uploads = []
    for kind in VALID_KINDS:
        storage_dir = _storage_dir(kind)
        for filename in os.listdir(storage_dir):
            full_path = os.path.join(storage_dir, filename)
            if not os.path.isfile(full_path):
                continue
            timestamp_str, _, original_name = filename.partition("_")
            uploaded_at = None
            try:
                uploaded_at = datetime.datetime.strptime(timestamp_str, "%Y%m%dT%H%M%SZ").isoformat() + "Z"
            except ValueError:
                pass  # filename doesn't match the expected prefix - still list it, just without a parsed date
            uploads.append({
                "kind": kind,
                "filename": filename,
                "original_filename": original_name or filename,
                "uploaded_at": uploaded_at,
            })

    uploads.sort(key=lambda u: u["uploaded_at"] or "", reverse=True)
    return uploads


def restore_upload(kind, filename):
    """
    Re-applies an archived upload from data_scripts/{kind}_storage/ as
    the new canonical file for `kind`, exactly as if it had just been
    re-uploaded through POST /api/globe-data/upload:
      1. Re-validates it extracts cleanly (workbooks are kept forever
         in storage/, but re-checking here catches the unlikely case of
         a since-corrupted archive file rather than trusting it blindly).
      2. Archives it AGAIN with a fresh timestamp - so the restore
         itself becomes the newest entry in list_uploads(), and the
         audit trail reflects "this version was made canonical again
         at time T" rather than looking untouched since its original
         upload.
      3. Rotates it into data_scripts/{kind_lower}_source/ (whatever
         was canonical before this restore moves into old/, same as
         any other upload).
      4. Syncs the cached extraction and merges it into
         server/data/country_data.json, same as apply_workbook_to_country_data
         does for a fresh upload.
    Raises FileNotFoundError if `filename` isn't in that kind's storage
    folder. Returns the same shape apply_workbook_to_country_data() does.
    """
    if kind not in VALID_KINDS:
        raise ValueError(f"Unknown kind '{kind}', expected one of {VALID_KINDS}")

    storage_dir = _storage_dir(kind)
    # filename must already be one of this exact directory's own entries -
    # os.path.basename below additionally guards against a filename
    # containing path separators being used to escape storage_dir.
    archived_path = os.path.join(storage_dir, os.path.basename(filename))
    if not os.path.isfile(archived_path):
        raise FileNotFoundError(f"No archived {kind} upload named '{filename}'")

    extracted = validate_workbook(kind, archived_path)

    _, _, original_name = os.path.basename(filename).partition("_")
    original_name = original_name or os.path.basename(filename)

    # rotate_source_file() moves tmp_path itself into place, so restore
    # needs its own copy to hand off rather than moving the archived
    # file out of storage/ (which archive_workbook below is about to
    # write a fresh copy of anyway, but the original archived copy
    # should stay put regardless).
    tmp_dir = os.path.join(DATA_SCRIPTS_DIR, "_uploads_tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"restore_{os.path.basename(filename)}")
    shutil.copy2(archived_path, tmp_path)

    archive_workbook(kind, tmp_path, original_name)
    rotate_source_file(kind, tmp_path, original_name)
    sync_cached_extraction(kind, extracted)
    return apply_workbook_to_country_data(kind, extracted)


def _load_country_data():
    if not os.path.exists(COUNTRY_DATA_PATH):
        return {}
    with open(COUNTRY_DATA_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _country_name_for_code(code, fallback_name):
    """Prefer pycountry's canonical name if available, else whatever the workbook called it."""
    if pycountry is not None:
        country = pycountry.countries.get(numeric=code)
        if country is not None:
            return country.name
    return fallback_name


def apply_workbook_to_country_data(kind, extracted_data):
    """
    Merges a validated extraction result (as returned by validate_workbook)
    into the existing country_data.json, touching only the `kind` section
    ("ETTI" or "GTBI") for each country present in the upload. Countries
    not present in this upload are left completely untouched. Returns the
    updated dict (already written to disk).
    """
    if kind not in VALID_KINDS:
        raise ValueError(f"Unknown kind '{kind}', expected one of {VALID_KINDS}")

    country_data = _load_country_data()
    empty_section = dict(EMPTY_ETTI_SECTION if kind == "ETTI" else EMPTY_GTBI_SECTION)
    other_kind = "GTBI" if kind == "ETTI" else "ETTI"
    other_empty_section = dict(EMPTY_GTBI_SECTION if kind == "ETTI" else EMPTY_ETTI_SECTION)

    updated_codes = []

    for code, record in extracted_data["countries"].items():
        if code not in country_data:
            country_data[code] = {
                "name": _country_name_for_code(code, record["name"]),
                "ETTI": dict(EMPTY_ETTI_SECTION),
                "GTBI": dict(EMPTY_GTBI_SECTION),
            }
        # Only ever overwrite this upload's own section - never touch the other one.
        country_data[code]["name"] = record["name"]
        country_data[code][kind] = record[kind]
        updated_codes.append(code)

    with open(COUNTRY_DATA_PATH, "w", encoding="utf-8") as f:
        json.dump(country_data, f, indent=2, ensure_ascii=False)

    return {
        "updated_codes": sorted(updated_codes),
        "unresolved_country_names": extracted_data.get("_unresolved_country_names", []),
        "total_countries_in_file": len(country_data),
    }