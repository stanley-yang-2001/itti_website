"""
combine_country_data.py

Takes the outputs of etti_extract.py and gtbi_extract.py and produces
the final country_data.json served by the Flask app - keyed directly by
ISO numeric code at the top level (no "countries" wrapper, no
_unresolved_country_names sidecar), covering EVERY world country
(via pycountry's full ISO-3166 list), not just the ones present in the
source workbooks.

Guarantees for every single country in the output:
    - Both an "ETTI" section and a "GTBI" section are always present.
    - A country with no election years on file for a section still gets
      that section, containing exactly one year key: "Data Pending".
      A country WITH election years on file that are individually
      missing a field still uses "Data Pending" for just that field
      (this part is inherited as-is from the two extract scripts).
    - A country absent from BOTH source workbooks gets both sections
      filled with "Data Pending" for every field.

Output shape (every field always present, never omitted):

    {
      "<iso_numeric>": {
        "name": "<country name>",
        "ETTI": {
          "<year_or_'Data Pending'>": {
            "evs": <float or "Data Pending">,
            "tie": <float or "Data Pending">,
            "pdl": <float or "Data Pending">,
            "its": <float or "Data Pending">,
            "etti": <float or "Data Pending">
          }
        },
        "GTBI": {
          "<year_or_'Data Pending'>": {
            "trauma_level": <str or "Data Pending">,
            "burden_rate": <float or "Data Pending">,
            "yll": <float or "Data Pending">,
            "yld": <float or "Data Pending">,
            "gtbi": <float or "Data Pending">
          }
        }
      },
      ...
    }

Usage:
    python3 combine_country_data.py etti_country_data.json gtbi_country_data.json -o country_data.json
"""

import argparse
import json
import sys

try:
    import pycountry
except ImportError:
    print("This script requires pycountry: pip install pycountry --break-system-packages", file=sys.stderr)
    raise

MISSING = "Data Pending"

EMPTY_ETTI_SECTION = {
    MISSING: {
        "evs": MISSING,
        "tie": MISSING,
        "pdl": MISSING,
        "its": MISSING,
        "etti": MISSING,
        "evs_deaths": MISSING,
        "evs_injuries": MISSING,
        "evs_kidnappings": MISSING,
        "evs_attacks": MISSING,
        "tie_political_intimidation": MISSING,
        "tie_threats": MISSING,
        "tie_harassment": MISSING,
        "tie_arrests": MISSING,
        "pdl_societal_distress": MISSING,
        "its_court_challenges": MISSING,
        "its_legal_disputes": MISSING,
        "its_protests": MISSING,
        "its_security_interventions": MISSING,
        "election": MISSING,
    }
}

EMPTY_GTBI_SECTION = {
    MISSING: {
        "trauma_level": MISSING,
        "burden_rate": MISSING,
        "yll": MISSING,
        "yld": MISSING,
        "gtbi": MISSING,
        "key_events": MISSING,
        "armed_conflict_yll": MISSING,
        "armed_conflict_yld": MISSING,
        "armed_conflict_prevalence": MISSING,
        "political_repression_yll": MISSING,
        "political_repression_yld": MISSING,
        "political_repression_prevalence": MISSING,
        "communal_violence_yll": MISSING,
        "communal_violence_yld": MISSING,
        "communal_violence_prevalence": MISSING,
        "terrorism_yll": MISSING,
        "terrorism_yld": MISSING,
        "terrorism_prevalence": MISSING,
        "forced_displacement_yll": MISSING,
        "forced_displacement_yld": MISSING,
        "forced_displacement_prevalence": MISSING,
        "disaster_yll": MISSING,
        "disaster_yld": MISSING,
        "disaster_prevalence": MISSING,
    }
}


def all_world_countries():
    """Returns { iso_numeric_code: country_name } for every ISO-3166 country pycountry knows."""
    return {c.numeric: c.name for c in pycountry.countries}


def combine(etti_path, gtbi_path):
    with open(etti_path, "r", encoding="utf-8") as f:
        etti_data = json.load(f)["countries"]
    with open(gtbi_path, "r", encoding="utf-8") as f:
        gtbi_data = json.load(f)["countries"]

    combined = {}

    # Start from the full world list so every country gets an entry,
    # even ones absent from both source workbooks.
    for code, name in all_world_countries().items():
        combined[code] = {
            "name": name,
            "ETTI": dict(EMPTY_ETTI_SECTION),
            "GTBI": dict(EMPTY_GTBI_SECTION),
        }

    # Overlay real ETTI data where we have it.
    for code, record in etti_data.items():
        if code not in combined:
            # Country appeared in the workbook but isn't in pycountry's
            # list under this code for some reason - still include it
            # rather than silently dropping real data.
            combined[code] = {"name": record["name"], "ETTI": {}, "GTBI": dict(EMPTY_GTBI_SECTION)}
        combined[code]["name"] = record["name"]
        combined[code]["ETTI"] = record["ETTI"]

    # Overlay real GTBI data where we have it.
    for code, record in gtbi_data.items():
        if code not in combined:
            combined[code] = {"name": record["name"], "ETTI": dict(EMPTY_ETTI_SECTION), "GTBI": {}}
        combined[code]["name"] = record["name"]
        combined[code]["GTBI"] = record["GTBI"]

    return combined


def main():
    parser = argparse.ArgumentParser(
        description="Combine etti_extract.py and gtbi_extract.py outputs into the final country_data.json, "
        "covering all world countries with 'Data Pending' filling any gap."
    )
    parser.add_argument("etti_json", help="Path to etti_country_data.json (output of etti_extract.py)")
    parser.add_argument("gtbi_json", help="Path to gtbi_country_data.json (output of gtbi_extract.py)")
    parser.add_argument("-o", "--output", default="country_data.json", help="Output JSON path")
    args = parser.parse_args()

    combined = combine(args.etti_json, args.gtbi_json)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(combined, f, indent=2, ensure_ascii=False)

    total = len(combined)
    has_real_etti = sum(1 for r in combined.values() if MISSING not in r["ETTI"])
    has_real_gtbi = sum(1 for r in combined.values() if MISSING not in r["GTBI"])
    fully_pending = sum(1 for r in combined.values() if MISSING in r["ETTI"] and MISSING in r["GTBI"])

    print(f"Wrote {total} countries to {args.output}")
    print(f"  {has_real_etti} with real ETTI data")
    print(f"  {has_real_gtbi} with real GTBI data")
    print(f"  {fully_pending} with no data at all (Data Pending for both sections)")


if __name__ == "__main__":
    main()