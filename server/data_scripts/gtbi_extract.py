"""
gtbi_extract.py

Reads a GTBI workbook and produces a dict keyed by zero-padded 3-digit
ISO numeric country code:

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
            "key_events": <str or "Data Pending">,
            "<exposure_type>_yll": <float or "Data Pending">,   # one trio per exposure
            "<exposure_type>_yld": <float or "Data Pending">,   # type (armed_conflict,
            "<exposure_type>_prevalence": <float or "Data Pending">,  # political_repression,
                                                                        # communal_violence, terrorism,
                                                                        # forced_displacement, disaster)
          },
          ...
        }
      },
      ...
    }

Every country keeps ALL of its years on file, each nested under its own
year key inside "GTBI".

Source workbook shape (as of GTBI_DataPanel updated (2).xlsx):
    A single "GTBI Panel" sheet, one row per (Country, Year, Exposure
    Type) - e.g. a country/year has separate rows for "Armed Conflict",
    "Political Repression", "Communal Violence", "Terrorism", etc. This
    is NOT the same shape the previous version of this script expected
    (separate 7_YLL_Calculation / 8_YLD_Calculation / 11_Burden_Rate /
    12_GTBI_Score sheets with one row per country/year already
    aggregated) - that shape doesn't exist in this workbook, so this
    script aggregates the exposure-type rows itself instead, following
    the formulas given on the "Notes and Formula" sheet:

        YLD = Incidents(I) x Disability_Weight(DW) x Duration(Ls)      [per row]
        YLL = Deaths(S) x 73.8                                         [per row]
        TBU = Sum(YLL) + Sum(YLD) + Sum(Severity x Exposure%/100)      [per country-year]
        burden_rate = (TBU / Population) x 100,000                     [per country-year]
        gtbi = 100 x (1 - e^(-burden_rate / K)), K = 100

    K = 100 was reverse-derived from the workbook's own row-level "Final
    GTBI Score" / "Per Capita Burden Rate" pairs (matches to >12 decimal
    places across every row checked) since the "Notes and Formula" sheet
    references a K cell that isn't included in this export.

    yll/yld in the output are the country-year SUMS of the "Trauma
    Mortality (YLL)" / "Trauma Morbidity (YLD)" columns across all of
    that country-year's exposure-type rows (i.e. total years of life
    lost/lived with disability for that country that year, not one
    exposure type's share of it) - burden_rate and gtbi are the
    aggregate country-year figures per the formula above, not any
    single row's value.

    trauma_level thresholds (Low <25, Moderate <50, High <75, Severe
    >=75 on the 0-100 gtbi scale) are an ASSUMPTION - the workbook's
    "Severity Scale" sheet only grades individual exposure-type events
    1-10, it does not define country-year trauma_level bands. Confirm
    against the eventual spec and adjust here if wrong; nothing else in
    the pipeline needs to change if these thresholds move.

Missing-value convention:
    Any variable with no usable number is written as the string
    "Data Pending" (not null, not a numeric sentinel like -1.0).

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
import math
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
    "Palestine": "Palestine, State of",
    "Syria": "Syrian Arab Republic",
    # The finalized workbook has a data-entry artifact where "China" reads
    # as "Chi-" (looks like a stray find/replace elsewhere in the sheet
    # accidentally caught this cell too - "Communal" -> "Commu-l" and
    # "Final" -> "Fi-l" show the same pattern in other columns). Aliased
    # here rather than silently dropping India's/the region's largest
    # country from the dataset; worth flagging back to the data owner.
    "Chi-": "China",
}

K = 100  # see module docstring: reverse-derived from the workbook's own figures

# Corrected display name for entries whose raw name is itself corrupted
# (see COUNTRY_NAME_ALIASES above for "Chi-" -> China) - the ISO code
# resolves fine via the alias, but the country's DISPLAYED name should be
# the real one, not the corrupted workbook text.
DISPLAY_NAME_OVERRIDES = {
    "Chi-": "China",
}

SHEET_NAME = "GTBI Panel"

# 0-based column indices in the "GTBI Panel" sheet.
COL_COUNTRY = 0
COL_POPULATION = 2
COL_YEAR = 3
COL_EXPOSURE_PCT = 5
COL_SEVERITY_WEIGHT = 6
COL_EXPOSURE_TYPE = 4
COL_YLD = 11
COL_YLL = 14
COL_KEY_EVENT = 17

# The workbook breaks every country-year into one row per "exposure type"
# (Armed Conflict, Political Repression, etc.) before this script rolls
# them up into the single aggregate GTBI/burden_rate/yll/yld figures
# above. Previously that per-type breakdown was discarded after
# aggregation; it's now also kept as its own set of sub-variables (one
# YLL/YLD/prevalence trio per exposure type) so a chart can compare, say,
# armed-conflict YLL specifically across countries - mirroring how ETTI
# exposes both its normalized domain scores AND their raw sub-variables.
# "Commu-l Violence" is the same stray find/replace artifact noted in
# COUNTRY_NAME_ALIASES above ("Communal Violence" -> "Commu-l Violence").
EXPOSURE_TYPE_KEYS = {
    "Armed Conflict": "armed_conflict",
    "Political Repression": "political_repression",
    "Communal Violence": "communal_violence",
    "Commu-l Violence": "communal_violence",
    "Terrorism": "terrorism",
    "Forced Displacement": "forced_displacement",
    "Disaster (Trauma-Linked)": "disaster",
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


def trauma_level_for(gtbi_score):
    if gtbi_score < 25:
        return "Low"
    if gtbi_score < 50:
        return "Moderate"
    if gtbi_score < 75:
        return "High"
    return "Severe"


def as_number(value, default=0.0):
    return value if isinstance(value, (int, float)) else default


def aggregate_by_country_year(ws):
    """
    Sums YLD, YLL, and the severity/exposure term across every
    exposure-type row sharing the same (country, year), keeps that
    country-year's population (constant across its rows), and collects
    every distinct "Key Event" label mentioned across that country-year's
    exposure-type rows (e.g. a country-year might have one row for "Armed
    Conflict" naming one event and another row for "Terrorism" naming a
    different one - both are kept, in the order first seen). Returns:
        { (country_name, year): {"population", "yld", "yll", "severity_term", "key_events": [str, ...]} }
    """
    totals = {}
    for row in ws.iter_rows(min_row=2, values_only=True):
        country_name = row[COL_COUNTRY]
        if country_name is None or str(country_name).strip() == "":
            continue
        year = row[COL_YEAR]
        if not isinstance(year, (int, float)):
            continue

        country_name = str(country_name).strip()
        year = int(year)
        key = (country_name, year)

        population = as_number(row[COL_POPULATION], default=None)
        yld = as_number(row[COL_YLD])
        yll = as_number(row[COL_YLL])
        exposure_pct = as_number(row[COL_EXPOSURE_PCT])
        severity_weight = as_number(row[COL_SEVERITY_WEIGHT])
        severity_term = severity_weight * (exposure_pct / 100)
        key_event = row[COL_KEY_EVENT] if COL_KEY_EVENT < len(row) else None
        if isinstance(key_event, str):
            key_event = key_event.strip()
            if key_event == "" or key_event.upper() == "N/A" or key_event.startswith("#"):
                key_event = None
        else:
            key_event = None

        if key not in totals:
            totals[key] = {
                "population": population, "yld": 0.0, "yll": 0.0, "severity_term": 0.0, "key_events": [],
                "by_type": {},
            }
        totals[key]["yld"] += yld
        totals[key]["yll"] += yll
        totals[key]["severity_term"] += severity_term
        if totals[key]["population"] is None:
            totals[key]["population"] = population
        if key_event and key_event not in totals[key]["key_events"]:
            totals[key]["key_events"].append(key_event)

        exposure_type = row[COL_EXPOSURE_TYPE]
        type_key = EXPOSURE_TYPE_KEYS.get(str(exposure_type).strip()) if exposure_type else None
        if type_key:
            by_type = totals[key]["by_type"].setdefault(type_key, {"yll": 0.0, "yld": 0.0, "prevalence": 0.0})
            by_type["yll"] += yll
            by_type["yld"] += yld
            by_type["prevalence"] += exposure_pct * 100  # stored as a percentage, not a fraction

    return totals


def build_country_data(workbook_path):
    wb = openpyxl.load_workbook(workbook_path, data_only=True)
    totals = aggregate_by_country_year(wb[SHEET_NAME])

    country_data = {}
    unresolved_names = set()

    for (country_name, year), totals_for_key in sorted(totals.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        code = resolve_iso_numeric(country_name)
        if code is None:
            unresolved_names.add(country_name)
            continue

        population = totals_for_key["population"]
        tbu = totals_for_key["yll"] + totals_for_key["yld"] + totals_for_key["severity_term"]

        if not population:
            burden_rate = MISSING
            gtbi_score = MISSING
            level = MISSING
        else:
            burden_rate = round((tbu / population) * 100000, 6)
            gtbi_score = round(100 * (1 - math.exp(-burden_rate / K)), 6)
            level = trauma_level_for(gtbi_score)

        entry = country_data.setdefault(code, {"name": DISPLAY_NAME_OVERRIDES.get(country_name, country_name), "GTBI": {}})
        year_entry = {
            "trauma_level": level,
            "burden_rate": burden_rate,
            "yll": round(totals_for_key["yll"], 3),
            "yld": round(totals_for_key["yld"], 3),
            "gtbi": gtbi_score,
            "key_events": "; ".join(totals_for_key["key_events"]) if totals_for_key["key_events"] else MISSING,
        }
        by_type = totals_for_key["by_type"]
        for type_key in dict.fromkeys(EXPOSURE_TYPE_KEYS.values()):
            values = by_type.get(type_key)
            year_entry[f"{type_key}_yll"] = round(values["yll"], 3) if values else MISSING
            year_entry[f"{type_key}_yld"] = round(values["yld"], 3) if values else MISSING
            year_entry[f"{type_key}_prevalence"] = round(values["prevalence"], 6) if values else MISSING
        entry["GTBI"][str(year)] = year_entry

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