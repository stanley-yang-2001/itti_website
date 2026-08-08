"""
country_profiles_upload.py

Backs the admin Control panel's country-profile docx upload flow (POST
/api/country-profiles/upload in app.py) - the docx counterpart to
globe_data.py's GTBI/ETTI workbook upload, built to the same
validate -> archive -> rotate -> regenerate pattern for consistency.

The two source docx files data_scripts/country_profiles_extract.py
builds server/data/country_profiles.json from (see that script's own
module docstring for their exact format) each get an upload "kind":
  - "survey":    the full per-country trauma history + APA reference
                 (country_profile_section_of_our_international_observatory_website.docx)
  - "dashboard": the smaller companion set tying a subset of countries
                 to their Observatory GTBI/ETTI dashboard figures
                 (country_profiles_clean_no_spreadsheet_citations.docx)

  1. validate_docx(kind, path) - parses the uploaded file with the same
     parse_survey_docx()/parse_dashboard_docx() logic
     country_profiles_extract.py itself uses; raises DocxValidationError
     with a human-readable reason if it doesn't parse as at least one
     country entry.
  2. archive_docx(kind, path, original_filename) - copies the raw
     upload into data_scripts/country_profiles_storage/, timestamped,
     a permanent audit trail - mirrors globe_data.archive_workbook().
  3. rotate_source_docx(kind, tmp_path, original_filename) - whatever
     is currently sitting at that kind's canonical filename in
     data_scripts/country_profiles_source/ moves into that same
     folder's old/ subfolder, timestamped, before the new upload takes
     its place - mirrors globe_data.rotate_source_file(), so a later
     manual run of country_profiles_extract.py picks up the same files
     this endpoint just installed. Only the ONE file matching this
     kind moves; the other source doc is left untouched.
  4. regenerate_profiles() - re-runs country_profiles_extract.py's own
     build_profiles() against whatever's now canonical in
     country_profiles_source/ (both files together - the extractor
     always reads both, so a survey-only or dashboard-only upload
     still regenerates the merged output using the previous version of
     whichever file wasn't just replaced) and writes
     server/data/country_profiles.json. Returns the same
     profile/dashboard-note counts and skipped-country list the CLI
     script prints.

Unlike globe_data.py's apply_workbook_to_country_data(), which merges
one section into an existing file in place, this always does a full
rebuild of country_profiles.json - that's what
country_profiles_extract.py itself does, and the file's whole shape
(which countries appear at all, whose dashboard_note is attached) can
change from either source doc, so a partial merge isn't meaningful
here.
"""

import datetime
import importlib.util
import json
import os
import shutil

DATA_SCRIPTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_scripts")

# Loaded directly from its file path (rather than a normal `import
# country_profiles_extract`) so its parsing functions can be reused
# here without duplicating them, while keeping this module reloadable
# independent of Python's own module cache.
_EXTRACT_SCRIPT_PATH = os.path.join(DATA_SCRIPTS_DIR, "country_profiles_extract.py")
_spec = importlib.util.spec_from_file_location("country_profiles_extract", _EXTRACT_SCRIPT_PATH)
country_profiles_extract = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(country_profiles_extract)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
COUNTRY_DATA_PATH = os.path.join(BASE_DIR, "data", "country_data.json")
COUNTRY_PROFILES_PATH = os.path.join(BASE_DIR, "data", "country_profiles.json")
SOURCE_DIR = country_profiles_extract.DEFAULT_SOURCE_DIR

# kind -> canonical filename in SOURCE_DIR (same constants
# country_profiles_extract.py's own CLI defaults to).
VALID_KINDS = {
    "survey": country_profiles_extract.DEFAULT_SURVEY_DOCX,
    "dashboard": country_profiles_extract.DEFAULT_DASHBOARD_DOCX,
}


class DocxValidationError(ValueError):
    """Raised when an uploaded docx doesn't parse as at least one country entry for its kind."""


def _storage_dir():
    """server/data_scripts/country_profiles_storage/, created if missing."""
    path = os.path.join(DATA_SCRIPTS_DIR, "country_profiles_storage")
    os.makedirs(path, exist_ok=True)
    return path


def validate_docx(kind, path):
    """
    Attempts to parse the uploaded docx the same way
    country_profiles_extract.py itself does. Returns the parsed
    {country_name: {...}} dict on success. Raises DocxValidationError
    with a human-readable reason on failure. Nothing on disk changes
    here - this only reads the temp upload.
    """
    if kind not in VALID_KINDS:
        raise DocxValidationError(f"Unknown kind '{kind}', expected one of {sorted(VALID_KINDS)}")

    try:
        if kind == "survey":
            parsed = country_profiles_extract.parse_survey_docx(path)
        else:
            parsed = country_profiles_extract.parse_dashboard_docx(path)
    except Exception as e:  # noqa: BLE001 - surface any parse failure as a clear message
        raise DocxValidationError(f"Could not read this file as a {kind} country-profile document: {e}") from e

    if not parsed:
        raise DocxValidationError(
            f"No usable country sections were found in this {kind} document. Each country name "
            f"needs to be its own fully-bold heading paragraph - see country_profiles_extract.py's "
            f"module docstring for the exact expected format."
        )

    return parsed


def archive_docx(kind, path, original_filename):
    """
    Copies the raw upload into data_scripts/country_profiles_storage/,
    prefixed with a UTC timestamp and its kind so repeated uploads
    never collide or silently overwrite a previous submission. Mirrors
    globe_data.archive_workbook(). Copies rather than moves, since the
    caller still needs `path` afterward to also pass to
    rotate_source_docx(). Returns the archived copy's path.
    """
    storage_dir = _storage_dir()
    timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    safe_name = os.path.basename(original_filename)
    archived_path = os.path.join(storage_dir, f"{timestamp}_{kind}_{safe_name}")
    shutil.copy2(path, archived_path)
    return archived_path


def rotate_source_docx(kind, tmp_path, original_filename):
    """
    Installs `tmp_path` (an already-validated upload) as the new
    canonical source file for `kind` in
    data_scripts/country_profiles_source/, after first moving whatever
    currently sits at that kind's canonical filename into that same
    folder's old/ subfolder, timestamped - so repeat uploads never
    collide or silently overwrite history, and a later manual run of
    the CLI script picks up the same files this endpoint just applied.
    Mirrors globe_data.rotate_source_file(), except only the ONE file
    matching this kind moves - the other source doc (whichever kind
    isn't being uploaded right now) is left alone, since
    regenerate_profiles() always needs both present. `original_filename`
    is accepted for symmetry with rotate_source_file() but unused: the
    installed file always takes this kind's fixed canonical name, since
    country_profiles_extract.py looks for that exact filename rather
    than whatever the upload was originally called.
    Returns the new source file's path.
    """
    if kind not in VALID_KINDS:
        raise ValueError(f"Unknown kind '{kind}', expected one of {sorted(VALID_KINDS)}")

    os.makedirs(SOURCE_DIR, exist_ok=True)
    old_dir = os.path.join(SOURCE_DIR, "old")
    os.makedirs(old_dir, exist_ok=True)

    canonical_name = VALID_KINDS[kind]
    canonical_path = os.path.join(SOURCE_DIR, canonical_name)

    if os.path.isfile(canonical_path):
        timestamp = datetime.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
        shutil.move(canonical_path, os.path.join(old_dir, f"{timestamp}_{canonical_name}"))

    shutil.move(tmp_path, canonical_path)
    return canonical_path


def regenerate_profiles():
    """
    Re-runs country_profiles_extract.py's own build_profiles() against
    whatever's now canonical in country_profiles_source/ (using
    country_data.json for country-name -> ISO numeric code resolution)
    and writes server/data/country_profiles.json. Raises
    FileNotFoundError with a clear message if either canonical source
    file has never existed yet (e.g. the very first deploy, before
    either kind has ever been uploaded or the CLI script run by hand).
    Returns {"profile_count", "with_dashboard_note_count", "skipped": [...]}.
    """
    survey_path = os.path.join(SOURCE_DIR, VALID_KINDS["survey"])
    dashboard_path = os.path.join(SOURCE_DIR, VALID_KINDS["dashboard"])

    for kind, path in (("survey", survey_path), ("dashboard", dashboard_path)):
        if not os.path.isfile(path):
            raise FileNotFoundError(
                f"No {kind} document has ever been uploaded (or placed in {SOURCE_DIR} for the CLI "
                f"script) - nothing to regenerate country_profiles.json from yet."
            )

    survey = country_profiles_extract.parse_survey_docx(survey_path)
    dashboard = country_profiles_extract.parse_dashboard_docx(dashboard_path)

    with open(COUNTRY_DATA_PATH, encoding="utf-8") as f:
        country_data = json.load(f)

    profiles, skipped = country_profiles_extract.build_profiles(survey, dashboard, country_data)

    with open(COUNTRY_PROFILES_PATH, "w", encoding="utf-8") as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)

    return {
        "profile_count": len(profiles),
        "with_dashboard_note_count": sum(1 for v in profiles.values() if v["dashboard_note"]),
        "skipped": skipped,
    }


def list_uploads():
    """
    Returns every archived docx in data_scripts/country_profiles_storage/,
    newest first: [{"kind": "survey"|"dashboard", "filename": "...",
    "original_filename": "...", "uploaded_at": "<ISO 8601, parsed from
    the archive timestamp prefix>"}, ...]. Used by the admin Control
    panel's "restore a previous version" dropdown. Filenames are
    archived as "<UTC timestamp>_<kind>_<original name>" by
    archive_docx(), so both the timestamp and kind are parsed back out
    of the name rather than relying on filesystem mtime or a database
    row.
    """
    storage_dir = _storage_dir()
    uploads = []
    for filename in os.listdir(storage_dir):
        full_path = os.path.join(storage_dir, filename)
        if not os.path.isfile(full_path):
            continue
        timestamp_str, _, rest = filename.partition("_")
        kind, _, original_name = rest.partition("_")
        if kind not in VALID_KINDS:
            kind = None  # filename doesn't match the expected prefix - still list it
        uploaded_at = None
        try:
            uploaded_at = datetime.datetime.strptime(timestamp_str, "%Y%m%dT%H%M%SZ").isoformat() + "Z"
        except ValueError:
            pass
        uploads.append({
            "kind": kind,
            "filename": filename,
            "original_filename": original_name or filename,
            "uploaded_at": uploaded_at,
        })

    uploads.sort(key=lambda u: u["uploaded_at"] or "", reverse=True)
    return uploads


def restore_docx(kind, filename):
    """
    Re-applies an archived docx from
    data_scripts/country_profiles_storage/ as the new canonical file
    for `kind`, exactly as if it had just been re-uploaded through
    POST /api/country-profiles/upload:
      1. Re-validates it still parses as at least one country entry
         (archived files are kept forever, but re-checking here catches
         the unlikely case of a since-corrupted archive file rather
         than trusting it blindly).
      2. Archives it AGAIN with a fresh timestamp - so the restore
         itself becomes the newest entry in list_uploads(), and the
         audit trail reflects "this version was made canonical again
         at time T" rather than looking untouched since its original
         upload.
      3. Rotates it into country_profiles_source/ under this kind's
         canonical filename (whatever was canonical before this
         restore moves into old/, same as any other upload).
      4. Regenerates country_profiles.json.
    Raises FileNotFoundError if `filename` isn't in storage, or if
    regenerate_profiles() can't run yet (the other kind has never been
    uploaded at all). Returns regenerate_profiles()'s result dict.
    """
    if kind not in VALID_KINDS:
        raise ValueError(f"Unknown kind '{kind}', expected one of {sorted(VALID_KINDS)}")

    storage_dir = _storage_dir()
    # filename must already be one of this exact directory's own entries -
    # os.path.basename below additionally guards against a filename
    # containing path separators being used to escape storage_dir.
    archived_path = os.path.join(storage_dir, os.path.basename(filename))
    if not os.path.isfile(archived_path):
        raise FileNotFoundError(f"No archived {kind} document named '{filename}'")

    validate_docx(kind, archived_path)

    original_name = VALID_KINDS[kind]  # rotate_source_docx ignores this anyway; kept for archive_docx's audit trail

    # rotate_source_docx() moves tmp_path itself into place, so restore
    # needs its own copy to hand off rather than moving the archived
    # file out of storage/ (which archive_docx below is about to write
    # a fresh copy of anyway, but the original archived copy should
    # stay put regardless).
    tmp_dir = os.path.join(DATA_SCRIPTS_DIR, "_uploads_tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_path = os.path.join(tmp_dir, f"restore_{os.path.basename(filename)}")
    shutil.copy2(archived_path, tmp_path)

    archive_docx(kind, tmp_path, original_name)
    rotate_source_docx(kind, tmp_path, original_name)
    return regenerate_profiles()