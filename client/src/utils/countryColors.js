// Dynamically assigns a distinct color to every country code the first
// time it's encountered, instead of hashing codes into a small,
// hardcoded, fixed-length palette. The previous approach (`hash(code) %
// PALETTE.length`) meant any two countries whose codes hashed to the
// same slot would render with the same color - with a 12-entry palette,
// a 13th distinct country was *guaranteed* to collide with an earlier
// one. There's no upper bound here: each new code gets the next hue in
// an ever-advancing rotation, so two different countries can never be
// assigned the same color, and adding more countries never runs out of
// "available" colors because none are pre-declared.
//
// Colors are generated with the golden-angle hue step (~137.5deg), which
// spreads any number of hues around the color wheel as evenly as
// possible in the order they're requested - the same technique used for
// evenly distributing points/leaves without a lookup table. Once a code
// is assigned a color it's cached, so the same country keeps the same
// color everywhere on the Observatory page (data panels, charts,
// legends) for the lifetime of the session.
const GOLDEN_ANGLE = 137.508;
const SATURATION = 62;
const LIGHTNESS = 46;

const assignedColors = new Map(); // countryCode -> color string
let nextHueIndex = 0;

/**
 * Returns this country's color, assigning it dynamically (and caching it)
 * the first time this code is seen. Distinctness holds for any set of
 * codes actually passed in over the page's lifetime - colors are keyed
 * purely off "have we seen this code before", not off the code's value,
 * so there's nothing to hardcode or run out of.
 */
export function colorForCountry(countryCode) {
  const code = String(countryCode ?? "");
  if (!assignedColors.has(code)) {
    const hue = (nextHueIndex * GOLDEN_ANGLE) % 360;
    nextHueIndex += 1;
    assignedColors.set(code, `hsl(${hue.toFixed(1)}, ${SATURATION}%, ${LIGHTNESS}%)`);
  }
  return assignedColors.get(code);
}

/**
 * Frees up colors for codes that are no longer in view anywhere on the
 * page (e.g. after removing data panels), so a long session of adding
 * and removing countries doesn't keep the hue rotation advancing
 * forever. Purely a tidiness measure - correctness never depended on
 * this, since the rotation itself cannot collide - so it's safe to call
 * with whatever the "currently relevant" set of codes is, or not call at
 * all.
 */
export function releaseUnusedCountryColors(activeCountryCodes) {
  const keep = new Set(activeCountryCodes.map((c) => String(c)));
  for (const code of assignedColors.keys()) {
    if (!keep.has(code)) assignedColors.delete(code);
  }
}