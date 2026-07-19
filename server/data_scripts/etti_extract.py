"""
etti_extract.py

Reads an ETTI workbook (EVS / TIE / PDL / ITS / ETTI sheets) and produces
a dict keyed by zero-padded 3-digit ISO numeric country code:

    {
      "<iso_numeric>": {
        "name": "<country name>",
        "ETTI": {
          "<year>": {
            "evs": <float or "Data Pending">,
            "tie": <float or "Data Pending">,
            "pdl": <float or "Data Pending">,
            "its": <float or "Data Pending">,
            "etti": <float or "Data Pending">
          },
          ...
        }
      },
      ...
    }

Every country keeps ALL of its election years on file (not just the most
recent), each nested under its own year key inside "ETTI".

Missing-value convention:
    Any variable that has no usable number - because the source
    workbook's formula errored out (#VALUE! / #DIV/0!) or the cell was
    genuinely blank - is written as the string "Data Pending", not null,
    not omitted, and not a numeric sentinel. This keeps the file
    human-readable on its own (no separate legend needed to know a
    number is fake) and makes "no data yet" impossible to accidentally
    plot on a chart or feed into an average, since it isn't a number at
    all. Any consumer of this file should check for the exact string
    "Data Pending" and handle it explicitly (e.g. render "Data Pending"
    in the UI) rather than assume every field is numeric.

Known data problems as of this workbook (see EVS/ITS sheets):
    - EVS is "Data Pending" for every country: the "Injuries (I)" column
      is empty for every row, which breaks EVS's min-max normalization
      (#VALUE!).
    - ITS is "Data Pending" for every country: "Court Challenges (C)"
      and "Legal Disputes (L)" are 0 for every row, which breaks that
      normalization (#DIV/0!).
    - ETTI (the composite) is therefore also "Data Pending" for every
      country, since it depends on both EVS and ITS.
    - Only TIE and PDL are populated as currently supplied.
    Fix the source workbook and re-run this script; no code changes
    should be needed if the sheet layout stays the same.

This script only ever produces output for countries actually present in
the workbook. Filling in every world country (with "Data Pending"
everywhere) is handled downstream by combine_country_data.py, not here.

Input resolution:
    This script reads from a FOLDER containing exactly one .xlsx file,
    not a direct file path - point it at the folder (e.g. etti_source/)
    and it finds the single spreadsheet inside automatically. This way,
    replacing the source data going forward is just a matter of
    swapping the file inside that folder; the command you run never
    needs to change. If the folder has zero or more than one .xlsx
    file, the script exits with an error explaining what it found
    instead of guessing which one to use.

Usage:
    python3 etti_extract.py etti_source/ -o etti_country_data.json
"""

import argparse
import json
import os
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

# Manual aliases for country names that don't resolve via pycountry's
# official short name (or where the workbook's name is ambiguous).
COUNTRY_NAME_ALIASES = {
    "Iran": "Iran, Islamic Republic of",
}

FIRST_DATA_ROW = 5  # header is on row 4 in every module sheet


def resolve_workbook_path(path_arg):
    """
    Accepts either:
      - a path directly to an .xlsx file (used as-is), or
      - a path to a folder expected to contain exactly one .xlsx file
        (resolved to that file automatically).
    Exits with a clear error if a folder has zero or more than one
    .xlsx file, rather than guessing which one to use.
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
        print(
            f"ERROR: expected exactly one .xlsx file in folder '{path_arg}', found {len(xlsx_files)}: {names}",
            file=sys.stderr,
        )
        sys.exit(1)

    return str(xlsx_files[0])


def resolve_iso_numeric(country_name):
    """Returns the zero-padded 3-digit ISO numeric code for a country name, or None."""
    lookup_name = COUNTRY_NAME_ALIASES.get(country_name, country_name)
    country = pycountry.countries.get(name=lookup_name)
    if country is None:
        return None
    return country.numeric  # pycountry already zero-pads to 3 digits


def extract_year(election_label):
    """Pulls a 4-digit year out of a label like '2024 General Election (2 Jun 2024)'."""
    if not election_label:
        return None
    match = re.search(r"(19|20)\d{2}", str(election_label))
    return int(match.group(0)) if match else None


def read_sheet_scores(ws, score_column_letter):
    """
    Reads a module sheet (EVS/TIE/PDL/ITS/ETTI) and returns:
        { (country_name, year): score_or_None }
    for every row, keyed by country name AND election year (so multiple
    elections for the same country are kept separately). score is None
    where the source cell held a formula error or was blank.
    """
    results = {}
    score_col_index = openpyxl.utils.column_index_from_string(score_column_letter) - 1

    for row in ws.iter_rows(min_row=FIRST_DATA_ROW, values_only=False):
        country_cell = row[0]
        if country_cell.value is None:
            continue
        country_name = str(country_cell.value).strip()
        if not country_name:
            continue

        election_label = row[1].value if len(row) > 1 else None
        year = extract_year(election_label)
        if year is None:
            continue

        score_value = row[score_col_index].value
        # Excel formula errors come through openpyxl (data_only=True) as
        # literal strings like "#VALUE!" / "#DIV/0!" - treat those as missing.
        if isinstance(score_value, str):
            score_value = None

        results[(country_name, year)] = score_value

    return results


def build_country_data(workbook_path):
    wb = openpyxl.load_workbook(workbook_path, data_only=True)

    evs = read_sheet_scores(wb["EVS"], "M")
    tie = read_sheet_scores(wb["TIE"], "M")
    pdl = read_sheet_scores(wb["PDL"], "I")
    its = read_sheet_scores(wb["ITS"], "M")
    etti = read_sheet_scores(wb["ETTI"], "H")

    all_keys = set(evs) | set(tie) | set(pdl) | set(its) | set(etti)

    country_data = {}
    unresolved_names = set()

    for country_name, year in sorted(all_keys, key=lambda k: (k[0], k[1])):
        code = resolve_iso_numeric(country_name)
        if code is None:
            unresolved_names.add(country_name)
            continue

        year_key = str(year)
        entry = country_data.setdefault(code, {"name": country_name, "ETTI": {}})

        def value_or_missing(mapping):
            v = mapping.get((country_name, year))
            return MISSING if v is None else v

        entry["ETTI"][year_key] = {
            "evs": value_or_missing(evs),
            "tie": value_or_missing(tie),
            "pdl": value_or_missing(pdl),
            "its": value_or_missing(its),
            "etti": value_or_missing(etti),
        }

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
    n_unresolved = len(data["_unresolved_country_names"])
    print(f"Wrote {n_countries} countries to {args.output}")
    if n_unresolved:
        print(f"WARNING: {n_unresolved} country name(s) could not be resolved to an ISO code: "
              f"{data['_unresolved_country_names']}")


if __name__ == "__main__":
    main()