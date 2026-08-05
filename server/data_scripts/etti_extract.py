"""
etti_extract.py

Reads an ETTI workbook (EVS / TIE / PDL / ITS / "Final ETTI" / Notes
sheets) and produces a dict keyed by zero-padded 3-digit ISO numeric
country code:

    {
      "<iso_numeric>": {
        "name": "<country name>",
        "ETTI": {
          "<year>": {
            "evs": <float or "Data Pending">,
            "tie": <float or "Data Pending">,
            "pdl": <float or "Data Pending">,
            "its": <float or "Data Pending">,
            "etti": <float or "Data Pending">,
            "evs_deaths": <float or "Data Pending">,
            "evs_injuries": <float or "Data Pending">,
            "evs_kidnappings": <float or "Data Pending">,
            "evs_attacks": <float or "Data Pending">,
            "tie_political_intimidation": <float or "Data Pending">,
            "tie_threats": <float or "Data Pending">,
            "tie_harassment": <float or "Data Pending">,
            "tie_arrests": <float or "Data Pending">,
            "pdl_societal_distress": <float or "Data Pending">,
            "its_court_challenges": <float or "Data Pending">,
            "its_legal_disputes": <float or "Data Pending">,
            "its_protests": <float or "Data Pending">,
            "its_security_interventions": <float or "Data Pending">,
            "election": <str or "Data Pending">
          },
          ...
        }
      },
      ...
    }

Every country keeps ALL of its election years on file (not just the most
recent), each nested under its own year key inside "ETTI". A country with
two elections in the same calendar year would collide on that year key -
not currently the case in the source workbook (checked: every
country/year pair is unique), but if it ever happens the later row in
the sheet wins silently, so re-check this if elections start being
added mid-cycle.

Composite scores (evs/tie/pdl/its/etti, all normalized 0-100) come from
the "Final ETTI" sheet, which is the one sheet with all five already
side by side per country-election. The "*_" prefixed fields are each
domain's own raw, non-normalized inputs (e.g. evs_deaths is the actual
death count feeding into EVS), read from that domain's own detail sheet
(EVS / TIE / PDL / ITS) and joined back to the Final ETTI rows by
(country, election). These are what let the Observatory's chart tool
compare a single sub-component - e.g. death counts, or kidnapping counts
- across countries, not just the normalized composite.

Missing-value convention:
    Any variable that has no usable number - because the source
    workbook's formula errored out (#VALUE! / #DIV/0!), the cell was
    genuinely blank, or the field is marked "N/A" in the workbook itself
    (e.g. Injuries in EVS, Court Challenges/Legal Disputes in ITS - see
    the workbook's own Notes sheet for why) - is written as the string
    "Data Pending", not null, not a numeric sentinel like -1.0. This
    keeps every downstream consumer's missing-value check identical
    regardless of which field or workbook it came from.

Known data problem:
    As of this workbook version, EVS Injuries, PDL's "Search/Media
    Distress Signal" component, and ITS's Court Challenges/Legal
    Disputes are unpopulated for every row (the workbook's own Notes
    sheet says these aren't available from ACLED). This is a gap in the
    source data, not the extraction code - once real numbers are added
    upstream, re-running this script picks them up automatically.

Input resolution:
    This script reads from a FOLDER containing exactly one .xlsx file,
    not a direct file path - point it at the folder (e.g. etti_source/)
    and it finds the single spreadsheet inside automatically.

Usage:
    python3 etti_extract.py etti_source/ -o etti_country_data.json
"""

import argparse
import json
import re
import sys
from pathlib import Path

import openpyxl

try:
    import pycountry
except ImportError:
    print("This script requires pycountry: pip install pycountry --break-system-packages", file=sys.stderr)
    raise

MISSING = "Data Pending"

COUNTRY_NAME_ALIASES = {
    "Iran": "Iran, Islamic Republic of",
    "Congo": "Congo, The Democratic Republic of the",
}

# Display name to actually store for country_data.json's "name" field,
# keyed by the *raw* source label (not the alias used to resolve the ISO
# code). Needed because "Congo" in the source workbook is aliased above
# to resolve to the Democratic Republic of the Congo's ISO code (180),
# but storing the raw label verbatim would display as plain "Congo" -
# indistinguishable from the separate Republic of the Congo (code 178).
DISPLAY_NAME_OVERRIDES = {
    "Congo": "Democratic Republic of the Congo",
}

YEAR_PATTERN = re.compile(r"(\d{4})")

# 0-based column indices per detail sheet. Country/Election are always
# columns 0/1; each sheet's own raw sub-variable columns differ.
EVS_COLUMNS = {"evs_deaths": 4, "evs_injuries": 5, "evs_kidnappings": 6, "evs_attacks": 7}
TIE_COLUMNS = {
    "tie_political_intimidation": 4, "tie_threats": 5, "tie_harassment": 6, "tie_arrests": 7,
}
PDL_COLUMNS = {"pdl_societal_distress": 4}
ITS_COLUMNS = {
    "its_court_challenges": 4, "its_legal_disputes": 5, "its_protests": 6, "its_security_interventions": 7,
}

FINAL_ETTI_COLUMNS = {"evs": 3, "tie": 4, "pdl": 5, "its": 6, "etti": 7}


def resolve_workbook_path(path_arg):
    """
    Accepts either a direct .xlsx path, or a folder expected to contain
    exactly one .xlsx file (resolved automatically). Exits with a clear
    error if a folder has zero or more than one .xlsx file.
    """
    path = Path(path_arg)

    if path.is_file():
        return str(path)

    if not path.is_dir():
        print(f"ERROR: '{path_arg}' is not a file or a directory.", file=sys.stderr)
        sys.exit(1)

    xlsx_files = sorted(p for p in path.iterdir() if p.suffix.lower() == ".xlsx" and not p.name.startswith("~$"))

    if len(xlsx_files) == 0:
        print(f"ERROR: no .xlsx file found in folder '{path_arg}'.", file=sys.stderr)
        sys.exit(1)
    if len(xlsx_files) > 1:
        names = ", ".join(p.name for p in xlsx_files)
        print(f"ERROR: expected exactly one .xlsx file in folder '{path_arg}', found {len(xlsx_files)}: {names}", file=sys.stderr)
        sys.exit(1)

    return str(xlsx_files[0])


def resolve_iso_numeric(country_name):
    """Returns the zero-padded 3-digit ISO numeric code for a country name, or None."""
    lookup_name = COUNTRY_NAME_ALIASES.get(country_name, country_name)
    country = pycountry.countries.get(name=lookup_name)
    if country is None:
        return None
    return country.numeric


def year_from_election(election_label):
    """Elections are labeled like '2024 General Election (2 Jun 2024)' -
    the leading 4-digit year is the election year even when the vote
    (or a runoff) spilled into the following January."""
    match = YEAR_PATTERN.search(election_label or "")
    return int(match.group(1)) if match else None


def clean_value(value):
    """Blank cells, 'N/A' strings, and formula-error strings all become
    None here so the caller can uniformly turn them into MISSING."""
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if stripped == "" or stripped.upper() == "N/A" or stripped.startswith("#"):
            return None
        try:
            return float(stripped)
        except ValueError:
            return None
    return value


def read_detail_sheet(ws, columns):
    """
    Generic reader for the EVS/TIE/PDL/ITS detail sheets, all shaped like
    Country | Election | Coverage Period | Subtypes | <value columns...>.
    Returns { (country_name, election_label): {field_name: value, ...} }.
    """
    results = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        country_name = row[0]
        election_label = row[1]
        if country_name is None or election_label is None:
            continue
        country_name = str(country_name).strip()
        election_label = str(election_label).strip()

        record = {field: clean_value(row[col]) for field, col in columns.items()}
        results[(country_name, election_label)] = record
    return results


def build_country_data(workbook_path):
    wb = openpyxl.load_workbook(workbook_path, data_only=True)

    evs_by_key = read_detail_sheet(wb["EVS"], EVS_COLUMNS)
    tie_by_key = read_detail_sheet(wb["TIE"], TIE_COLUMNS)
    pdl_by_key = read_detail_sheet(wb["PDL"], PDL_COLUMNS)
    its_by_key = read_detail_sheet(wb["ITS"], ITS_COLUMNS)
    final_by_key = read_detail_sheet(wb["Final ETTI"], FINAL_ETTI_COLUMNS)

    country_data = {}
    unresolved_names = set()

    for (country_name, election_label), final_record in sorted(final_by_key.items(), key=lambda kv: kv[0]):
        code = resolve_iso_numeric(country_name)
        if code is None:
            unresolved_names.add(country_name)
            continue

        year = year_from_election(election_label)
        if year is None:
            print(f"WARNING: could not parse a year out of election label {election_label!r} for {country_name}", file=sys.stderr)
            continue

        key = (country_name, election_label)
        entry = country_data.setdefault(
            code, {"name": DISPLAY_NAME_OVERRIDES.get(country_name, country_name), "ETTI": {}}
        )

        record = {field: (value if value is not None else MISSING) for field, value in final_record.items()}
        for field, value in evs_by_key.get(key, {}).items():
            record[field] = value if value is not None else MISSING
        for field, value in tie_by_key.get(key, {}).items():
            record[field] = value if value is not None else MISSING
        for field, value in pdl_by_key.get(key, {}).items():
            record[field] = value if value is not None else MISSING
        for field, value in its_by_key.get(key, {}).items():
            record[field] = value if value is not None else MISSING
        record["election"] = election_label

        entry["ETTI"][str(year)] = record

    return {
        "countries": country_data,
        "_unresolved_country_names": sorted(unresolved_names),
    }


def main():
    parser = argparse.ArgumentParser(description="Extract ETTI data into nested country_data.json-compatible JSON")
    parser.add_argument("source", help="Path to a folder containing exactly one ETTI .xlsx file (or a direct .xlsx path)")
    parser.add_argument("-o", "--output", default="etti_country_data.json", help="Output JSON path")
    args = parser.parse_args()

    workbook_path = resolve_workbook_path(args.source)
    print(f"Using workbook: {workbook_path}")

    data = build_country_data(workbook_path)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    n_countries = len(data["countries"])
    n_years = sum(len(r["ETTI"]) for r in data["countries"].values())
    n_unresolved = len(data["_unresolved_country_names"])
    print(f"Wrote {n_countries} countries ({n_years} country-election rows) to {args.output}")
    if n_unresolved:
        print(f"WARNING: {n_unresolved} country name(s) could not be resolved to an ISO code: "
              f"{data['_unresolved_country_names']}")


if __name__ == "__main__":
    main()