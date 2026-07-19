"""
gtbi_extract.py

Reads a GTBI workbook (7_YLL_Calculation, 8_YLD_Calculation,
11_Burden_Rate, 12_GTBI_Score sheets) and produces a dict keyed by
zero-padded 3-digit ISO numeric country code:

    {
      "<iso_numeric>": {
        "name": "<country name>",
        "GTBI": {
          "<year>": {
            "trauma_level": <str or "Data Pending">,
            "burden_rate": <float or "Data Pending">,
            "yll": <float or "Data Pending">,
            "yld": <float or "Data Pending">,
            "gtbi": <float or "Data Pending">
          },
          ...
        }
      },
      ...
    }

Every country keeps ALL of its election years on file, each nested under
its own year key inside "GTBI". Only these five fields are kept per the
current spec - population/region/income_group/gtbi_change are dropped
from this output (they're still in the source workbook if needed later).

Missing-value convention:
    Any variable with no usable number is written as the string
    "Data Pending" (not null, not a numeric sentinel like -1.0). All
    five fields in this workbook are actually populated for every
    country/year that has a GTBI score at all, since the source
    workbook has zero formula errors - "Data Pending" here mainly
    guards against a field being genuinely blank in some future
    version of the workbook, so the rest of the pipeline never has to
    special-case a missing GTBI field differently from a missing ETTI
    one.

This script only ever produces output for countries actually present in
the workbook. Filling in every world country (with "Data Pending"
everywhere) is handled downstream by combine_country_data.py, not here.

Input resolution:
    This script reads from a FOLDER containing exactly one .xlsx file,
    not a direct file path - point it at the folder (e.g. gtbi_source/)
    and it finds the single spreadsheet inside automatically. Replacing
    the source data going forward is just a matter of swapping the file
    inside that folder; the command you run never needs to change. If
    the folder has zero or more than one .xlsx file, the script exits
    with an error explaining what it found instead of guessing.

Usage:
    python3 gtbi_extract.py gtbi_source/ -o gtbi_country_data.json
"""

import argparse
import json
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
}


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
    return country.numeric


def read_per_election_values(ws, value_columns):
    """
    Generic reader for sheets shaped like:
        Country | Election Year | <value columns...>
    Returns { (country_name, year): {field_name: value, ...} }.

    value_columns: dict mapping output field name -> 0-based column index.
    """
    results = {}
    for row in ws.iter_rows(min_row=1, values_only=False):
        country_cell = row[0]
        if country_cell.value is None or str(country_cell.value).strip() == "":
            continue
        year_cell = row[1]
        if not isinstance(year_cell.value, (int, float)):
            continue  # skip header/title rows

        country_name = str(country_cell.value).strip()
        year = int(year_cell.value)

        record = {}
        for field_name, col_index in value_columns.items():
            record[field_name] = row[col_index].value

        results[(country_name, year)] = record

    return results


def read_yld_totals(ws):
    """
    8_YLD_Calculation has multiple disorder rows per country/year
    (PTSD, Depression, Anxiety, ...), so this sums column G (YLD)
    across all rows sharing the same (country, year).
    Returns { (country_name, year): total_yld }.
    """
    totals = {}
    for row in ws.iter_rows(min_row=3, values_only=False):
        country_cell = row[0]
        if country_cell.value is None:
            continue
        year_cell = row[1]
        if not isinstance(year_cell.value, (int, float)):
            continue

        country_name = str(country_cell.value).strip()
        year = int(year_cell.value)
        yld_value = row[6].value  # column G

        if not isinstance(yld_value, (int, float)):
            continue

        key = (country_name, year)
        totals[key] = totals.get(key, 0) + yld_value

    return totals


def value_or_missing(mapping, key, field=None):
    record = mapping.get(key)
    if record is None:
        return MISSING
    value = record if field is None else record.get(field)
    if value is None or isinstance(value, str) and value.startswith("#"):
        return MISSING
    return value


def build_country_data(workbook_path):
    wb = openpyxl.load_workbook(workbook_path, data_only=True)

    # 7_YLL_Calculation:  A Country | B Year | C Deaths | D LifeExpectancy | E YLL | F Source
    yll_by_key = read_per_election_values(wb["7_YLL_Calculation"], {"yll": 4})

    # 11_Burden_Rate:     A Country | B Year | C TBU | D Population | E BurdenRate
    burden_by_key = read_per_election_values(wb["11_Burden_Rate"], {"burden_rate": 4})

    # 12_GTBI_Score:      A Country | B Year | C BurdenRate | D kappa | E GTBIScore | F TraumaLevel
    gtbi_by_key = read_per_election_values(wb["12_GTBI_Score"], {"gtbi": 4, "trauma_level": 5})

    yld_totals_by_key = read_yld_totals(wb["8_YLD_Calculation"])

    country_data = {}
    unresolved_names = set()

    all_keys = set(gtbi_by_key)  # GTBI score sheet defines which country/years actually have a final score

    for country_name, year in sorted(all_keys, key=lambda k: (k[0], k[1])):
        code = resolve_iso_numeric(country_name)
        if code is None:
            unresolved_names.add(country_name)
            continue

        year_key = str(year)
        entry = country_data.setdefault(code, {"name": country_name, "GTBI": {}})
        key = (country_name, year)

        yld_value = yld_totals_by_key.get(key)

        entry["GTBI"][year_key] = {
            "trauma_level": value_or_missing(gtbi_by_key, key, "trauma_level"),
            "burden_rate": value_or_missing(burden_by_key, key, "burden_rate"),
            "yll": value_or_missing(yll_by_key, key, "yll"),
            "yld": MISSING if yld_value is None else yld_value,
            "gtbi": value_or_missing(gtbi_by_key, key, "gtbi"),
        }

    return {
        "countries": country_data,
        "_unresolved_country_names": sorted(unresolved_names),
    }


def main():
    parser = argparse.ArgumentParser(description="Extract GTBI data into nested country_data.json-compatible JSON")
    parser.add_argument("source", help="Path to a folder containing exactly one GTBI .xlsx file (or a direct .xlsx path)")
    parser.add_argument("-o", "--output", default="gtbi_country_data.json", help="Output JSON path")
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