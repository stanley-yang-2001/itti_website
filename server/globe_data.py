"""
globe_data.py

Backs the publisher-only globe-data upload flow:
  1. validate_workbook(kind, path)   - try to extract the workbook with the
     same logic data_scripts/{kind}_extract.py uses; raises ValueError with
     a human-readable reason if the workbook doesn't fit.
  2. archive_workbook(kind, path)    - moves the *original* uploaded file into
     server/data_scripts/{kind}_storage/, timestamped so repeat uploads don't
     collide or silently overwrite history.
  3. apply_workbook_to_country_data(kind, path) - runs the real extraction,
     then merges the result into the existing server/data/country_data.json
     IN PLACE: only the given kind's section ("ETTI" or "GTBI") is touched,
     per country. Countries new to this workbook are added (with the other
     section defaulted to "Data Pending" if they didn't already exist);
     countries already in country_data.json keep their other section as-is.

This intentionally does NOT reuse combine_country_data.py's full-rebuild
behavior, since that script starts from a blank slate covering all 249
world countries built from BOTH extract outputs at once. A single
publisher uploading just a new ETTI workbook shouldn't blow away
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
    Moves the original uploaded file into server/data_scripts/{kind}_storage/,
    prefixed with a UTC timestamp so repeated uploads never collide or
    silently overwrite a previous submission. Returns the new path.
    """
    storage_dir = _storage_dir(kind)
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    safe_name = os.path.basename(original_filename)
    archived_name = f"{timestamp}_{safe_name}"
    archived_path = os.path.join(storage_dir, archived_name)
    shutil.move(path, archived_path)
    return archived_path


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