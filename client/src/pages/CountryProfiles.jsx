import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Reveal from '../components/Reveal.jsx';
import CountryFlag from '../components/CountryFlag.jsx';
import UnavailableMessage from '../components/UnavailableMessage.jsx';
import { getNumericValue, getValueOrNull, getLatestYearRecord, hasProfile } from "../utils/countryData";
import { isBadRequest } from "../utils/apiError";
import "../styles/CountryProfiles.css";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Country Profiles page. Every country is listed at once, grouped under
 * a letter heading, rather than requiring a letter click to reveal
 * anything - the A-Z bar is jump-to-section nav (smooth-scrolls to that
 * letter's group) rather than a filter, and scrolls with the page like
 * everything else (no position: sticky).
 *
 * Each country is a row you click to expand inline, drawing on two
 * independent sources that a country can have either, both, or neither
 * of:
 *   - /api/country-profiles: a narrative historical overview + APA
 *     reference (server/data_scripts/country_profiles_extract.py),
 *     covering ~165 countries.
 *   - /api/countries: live GTBI/ETTI dashboard figures, covering a much
 *     smaller set - shown as both a quick stat readout and, where the
 *     narrative source also has a matching "dashboard note", the prose
 *     tying the two together.
 * A country counts as "available" if either source has something for
 * it; only a country with neither shows the shared "unavailable"
 * message (components/UnavailableMessage.jsx).
 *
 * country_data.json fields are never assumed to be numbers - every
 * ETTI/GTBI field can be the literal string "Data Pending" instead of
 * a real value (see utils/countryData.js), so any place this component
 * reads a numeric field goes through getNumericValue()/isDataPending()
 * rather than comparing or doing math on the raw value directly.
 */
export default function CountryProfiles() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState(null); // null = loading
  const [loadError, setLoadError] = useState(null);
  const [expandedCode, setExpandedCode] = useState(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetch("/api/countries"), fetch("/api/country-profiles")])
      .then(([countriesRes, profilesRes]) => {
        if (isBadRequest(countriesRes) || isBadRequest(profilesRes)) {
          navigate("/unavailable?from=%2Fcountry-profiles&fromLabel=Back%20to%20Country%20Profiles");
          return null;
        }
        if (!countriesRes.ok) throw new Error("Failed to load country data");
        // Narrative profiles are a nice-to-have on top of the dashboard data,
        // not the core of the page - degrade to "no profiles" rather than
        // failing the whole page if just this fetch has a problem.
        const profiles = profilesRes.ok ? profilesRes.json() : Promise.resolve({});
        return Promise.all([countriesRes.json(), profiles]);
      })
      .then((result) => {
        if (cancelled || result == null) return;
        const [data, profiles] = result;
        const list = Object.entries(data).map(([code, record]) => {
          const profile = profiles[code] || null;
          return {
            code,
            name: record?.name || profile?.name || code,
            available: hasProfile(record) || !!profile,
            gtbi: getLatestYearRecord(record?.GTBI),
            etti: getLatestYearRecord(record?.ETTI),
            profile,
          };
        });
        list.sort((a, b) => a.name.localeCompare(b.name));
        setCountries(list);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const groups = useMemo(() => {
    if (!countries) return [];
    const byLetter = new Map();
    countries.forEach((c) => {
      const letter = c.name.charAt(0).toUpperCase();
      if (!byLetter.has(letter)) byLetter.set(letter, []);
      byLetter.get(letter).push(c);
    });
    return ALPHABET.map((letter) => ({ letter, countries: byLetter.get(letter) || [] })).filter(
      (g) => g.countries.length > 0
    );
  }, [countries]);

  const availableLetters = useMemo(() => new Set(groups.map((g) => g.letter)), [groups]);

  function jumpToLetter(letter) {
    document.getElementById(`country-letter-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleExpanded(code) {
    setExpandedCode((current) => (current === code ? null : code));
  }

  return (
    <div className="country-profiles-page">
      <Reveal delay={0}>
        <div className="country-profiles-intro">
          <h1 className="country-profiles-heading display">Country Profiles</h1>
          <p className="country-profiles-subheading">
            Every country we track, in one list. Click a country to see its overview, or jump straight to a
            letter below.
          </p>
          <div className="country-profiles-legend">
            <span className="country-availability-dot country-availability-dot--available" aria-hidden="true" />
            Profile available
            <span className="country-availability-dot country-availability-dot--unavailable" aria-hidden="true" />
            Not yet available
          </div>
        </div>
      </Reveal>

      <div className="country-letter-jump" role="navigation" aria-label="Jump to letter">
        {ALPHABET.map((letter) => (
          <button
            key={letter}
            type="button"
            className={
              "country-letter-chip" + (!availableLetters.has(letter) ? " country-letter-chip--disabled" : "")
            }
            onClick={() => jumpToLetter(letter)}
            disabled={!availableLetters.has(letter)}
          >
            {letter}
          </button>
        ))}
      </div>

      {loadError && <p className="country-profiles-error">{loadError}</p>}
      {!loadError && countries === null && <p className="country-profiles-status">Loading countries…</p>}

      {!loadError && countries !== null && (
        <div className="country-profiles-sections">
          {groups.map((group, i) => (
            <Reveal key={group.letter} delay={Math.min(i * 40, 300)}>
              <section id={`country-letter-${group.letter}`} className="country-letter-section">
                <h2 className="country-letter-section-heading mono">{group.letter}</h2>
                <ul className="country-profiles-list">
                  {group.countries.map((c) => (
                    <li key={c.code} className="country-profile-item">
                      <button
                        type="button"
                        className="country-profile-row"
                        onClick={() => toggleExpanded(c.code)}
                        aria-expanded={expandedCode === c.code}
                      >
                        <CountryFlag code={c.code} />
                        <span className="country-profile-name">{c.name}</span>
                        <span
                          className={
                            "country-availability-dot " +
                            (c.available
                              ? "country-availability-dot--available"
                              : "country-availability-dot--unavailable")
                          }
                          title={c.available ? "Profile available" : "Not yet available"}
                        />
                        <span
                          className={
                            "country-profile-chevron" + (expandedCode === c.code ? " country-profile-chevron--open" : "")
                          }
                          aria-hidden="true"
                        >
                          ›
                        </span>
                      </button>

                      {expandedCode === c.code && (
                        <div className="country-profile-dropdown">
                          {c.available ? (
                            <CountryOverview country={c} />
                          ) : (
                            <UnavailableMessage variant="inline" />
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}

/** Shown when a country row expands and has either a narrative profile,
 *  live dashboard data, or both. */
function CountryOverview({ country }) {
  const { gtbi, etti, profile } = country;
  const gtbiScore = getNumericValue(gtbi?.gtbi);
  const traumaLevel = getValueOrNull(gtbi?.trauma_level);
  const burdenRate = getNumericValue(gtbi?.burden_rate);
  const ettiScore = getNumericValue(etti?.etti);
  const keyEvents = getValueOrNull(gtbi?.key_events);

  const stats = [
    gtbiScore != null && { label: "GTBI", value: gtbiScore.toFixed(1) },
    traumaLevel != null && { label: "Trauma Level", value: traumaLevel },
    ettiScore != null && { label: "ETTI", value: ettiScore.toFixed(1) },
    burdenRate != null && { label: "Burden Rate", value: burdenRate.toFixed(2) },
  ].filter(Boolean);

  return (
    <div className="country-overview">
      {profile?.overview && (
        <div className="country-overview-section">
          {profile.overview.paragraphs.map((p, i) => (
            <p key={i} className="country-overview-paragraph">{p}</p>
          ))}
          {profile.overview.reference && (
            <p className="country-overview-reference">
              <strong>Reference: </strong>
              {profile.overview.reference}
            </p>
          )}
        </div>
      )}

      {stats.length > 0 && (
        <div className="country-overview-stats">
          {stats.map((s) => (
            <div key={s.label} className="country-overview-stat">
              <span className="country-overview-stat-label">{s.label}</span>
              <span className="country-overview-stat-value mono">{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {keyEvents && <p className="country-overview-events">{keyEvents}</p>}

      {profile?.dashboard_note && (
        <div className="country-overview-section country-overview-dashboard-note">
          <h4 className="country-overview-subheading">Observatory Dashboard Profile</h4>
          {profile.dashboard_note.paragraphs.map((p, i) => (
            <p key={i} className="country-overview-paragraph">{p}</p>
          ))}
          {profile.dashboard_note.references?.length > 0 && (
            <div className="country-overview-references">
              <strong>APA 7 References</strong>
              {profile.dashboard_note.references.map((r, i) => (
                <p key={i} className="country-overview-reference">{r}</p>
              ))}
            </div>
          )}
        </div>
      )}

      <a href="/observatory" className="country-overview-link">
        Explore full data in the Observatory →
      </a>
    </div>
  );
}