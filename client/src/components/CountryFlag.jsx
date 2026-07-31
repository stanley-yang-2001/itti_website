import { getAlpha2 } from '../data/countryAlpha2.js';

/**
 * Renders a small flag image for a country_data.json numeric code, via
 * flagcdn.com (keyed by ISO alpha-2, hence the numeric->alpha2 lookup -
 * see data/countryAlpha2.js for why). alt="" is intentional: this is
 * always rendered directly next to the country's name as text, so a
 * screen reader announcing the image too would just repeat it.
 *
 * Falls back to a generic globe glyph for the small number of
 * numeric codes that don't resolve to a real alpha-2 (e.g. some
 * historical/dependent-territory codes) rather than a broken image icon.
 */
export default function CountryFlag({ code, size = 20 }) {
  const alpha2 = getAlpha2(code);
  const height = Math.round((size * 3) / 4);

  if (!alpha2) {
    return (
      <span className="country-flag country-flag--fallback" style={{ width: size, height }} aria-hidden="true">
        🌐
      </span>
    );
  }

  return (
    <img
      className="country-flag"
      src={`https://flagcdn.com/${size * 2}x${height * 2}/${alpha2}.png`}
      srcSet={`https://flagcdn.com/${size}x${height}/${alpha2}.png 1x, https://flagcdn.com/${size * 2}x${height * 2}/${alpha2}.png 2x`}
      width={size}
      height={height}
      alt=""
      loading="lazy"
    />
  );
}