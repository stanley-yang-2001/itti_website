"""
ITTI backend — Flask API

Serves:
  GET /api/world-data        -> full TopoJSON world topology (countries)
  GET /api/countries         -> dict of all country metric records, keyed by
                                 3-digit ISO numeric code (matches TopoJSON
                                 feature.id, zero-padded)
  GET /api/countries/<code>  -> single country's metric record

All country metrics (GTBI / ETTI / EVS / TIE / PDL / ITS) currently live as
placeholders (0) in data/country_data.json. Swap that file's values — or
point load_country_data() at a real datasource/DB — once live figures are
available; nothing else needs to change.
"""
import json
import os

from flask import Flask, jsonify, abort
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
WORLD_DATA_PATH = os.path.join(DATA_DIR, "world-110m.json")
COUNTRY_DATA_PATH = os.path.join(DATA_DIR, "country_data.json")

app = Flask(__name__)
CORS(app)  # allow the React dev server (different port) to call this API


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/world-data")
def get_world_data():
    """Raw TopoJSON topology used to draw the globe."""
    return jsonify(load_json(WORLD_DATA_PATH))


@app.get("/api/countries")
def get_countries():
    """All country metric records, keyed by zero-padded ISO numeric code."""
    return jsonify(load_json(COUNTRY_DATA_PATH))


@app.get("/api/countries/<code>")
def get_country(code):
    """A single country's metric record."""
    data = load_json(COUNTRY_DATA_PATH)
    record = data.get(code.zfill(3)) or data.get(code)
    if record is None:
        abort(404, description=f"No data for country code '{code}'")
    return jsonify(record)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
