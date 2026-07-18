# ITTI — React + Flask

The original static (HTML/D3/vanilla JS) globe app, restructured into:

- **`server/`** — Flask API. Serves the world TopoJSON and per-country trade
  metrics (GTBI/ETTI/EVS/TIE/PDL/ITS).
- **`client/`** — React (Vite) app. All the D3 globe logic, search, and the
  side panel now live in React components that call the Flask API instead of
  reading data embedded in the HTML. Client-side routing (`react-router-dom`)
  powers the top navigation bar across eight sections: Home, About ITTI,
  Observatory, Reports, Country Profiles, Fellows, Certifications, and
  Contact. Every section besides Home is a blank placeholder page for now —
  swap each one's content in under `client/src/pages/` as it gets built out.

## Data storage

Country codes and metric data now live in their own file, separate from
code: `server/data/country_data.json`, keyed by 3-digit ISO numeric code
(matching the TopoJSON `feature.id`, zero-padded). It currently holds
placeholder `0` values for every country, exactly like the original. Once
real figures are available, update that file (or point
`server/app.py`'s `load_json(COUNTRY_DATA_PATH)` at a real database/API) —
nothing on the frontend needs to change.

The world map geometry lives in `server/data/world-110m.json` (extracted
from the original inline `<script id="world-data">` blob).

## Running it

### Backend

```bash
cd server
pip install -r requirements.txt
python app.py
# API now listening on http://localhost:5000
```

### Frontend

```bash
cd client
npm install
npm run dev
# App now listening on http://localhost:5173
```

The Vite dev server proxies `/api/*` requests to `http://localhost:5000`
(see `client/vite.config.js`), so the React app can just call
`fetch('/api/...')` regardless of environment.

### Production build

```bash
cd client
npm run build
```

This outputs static files to `client/dist/`. Serve them with any static
file host, or have Flask serve them directly (e.g. via
`send_from_directory`) if you'd rather ship a single service.

## API

| Method | Path                     | Description                                  |
|--------|--------------------------|-----------------------------------------------|
| GET    | `/api/world-data`        | Full TopoJSON world topology                  |
| GET    | `/api/countries`         | All country metric records, keyed by ISO code |
| GET    | `/api/countries/<code>`  | Single country's metric record                |
| GET    | `/api/health`            | Health check                                  |
