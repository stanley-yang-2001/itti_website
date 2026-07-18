const API_BASE = '/api';

async function getJson(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json();
}

export function fetchWorldData() {
  return getJson('/world-data');
}

export function fetchAllCountries() {
  return getJson('/countries');
}

export function fetchCountry(isoCode) {
  return getJson(`/countries/${isoCode}`);
}
