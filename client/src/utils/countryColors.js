// A fixed palette (dark-theme friendly, visually distinct) that every
// country gets deterministically mapped into, so "Nigeria" is always the
// same color everywhere on the Observatory page - data panels, bar/line/
// pie/radar charts, legends - without needing any shared state.
const PALETTE = [
  "#4FD9C7", // cyan (site accent)
  "#E8B84B", // gold (site accent)
  "#E86B6B", // coral
  "#7FA8E0", // steel blue
  "#B98BD8", // violet
  "#6BC97A", // green
  "#E0956B", // orange
  "#5FC7E8", // sky blue
  "#D8698B", // rose
  "#A3C96B", // olive
  "#8B7FD8", // indigo
  "#E8D06B", // amber
];

export function colorForCountry(countryCode) {
  const str = String(countryCode ?? "");
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}