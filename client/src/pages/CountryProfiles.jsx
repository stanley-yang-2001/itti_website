import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Reveal from '../components/Reveal.jsx';
import CountryFlag from '../components/CountryFlag.jsx';
import UnavailableMessage from '../components/UnavailableMessage.jsx';
import useHashScroll from '../hooks/useHashScroll.js';
import SEO from '../components/SEO.jsx';
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
 * Each country is a row you click to expand inline. The expanded content
 * is sourced only from /api/country-profiles - the narrative overview
 * paragraphs and their APA reference, straight from
 * country_profile_section_of_our_international_observatory_website.docx
 * (server/data_scripts/country_profiles_extract.py), covering ~164
 * countries. /api/countries' live GTBI/ETTI dashboard figures and the
 * second source doc's "dashboard note" are not part of this document's
 * content and are intentionally not shown here - see the Observatory
 * page for that data. A country counts as "available" only if it has
 * this narrative profile; a country without one shows the shared
 * "unavailable" message (components/UnavailableMessage.jsx), even if
 * live dashboard figures exist for it elsewhere.
 */
export default function CountryProfiles() {
  useHashScroll();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
            available: !!profile,
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

  // Deep-link support: the globe's side panel links here with ?code=XX for
  // the country just clicked. Once countries are loaded, auto-expand that
  // country's row and scroll it into view - same idea as jumpToLetter, just
  // targeting a specific row instead of a whole letter section.
  useEffect(() => {
    if (!countries) return;
    const code = searchParams.get("code");
    if (!code) return;
    const match = countries.find((c) => c.code.toLowerCase() === code.toLowerCase());
    if (!match) return;
    setExpandedCode(match.code);
    // Wait a tick for the row (and its now-expanded dropdown) to render
    // before scrolling, so the scroll lands on the right final position.
    requestAnimationFrame(() => {
      document.getElementById(`country-profile-${match.code}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

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
      <SEO
        path="/country-profiles"
        title="Country Profiles"
        description="Browse GTBI and ETTI country profiles tracked by the International Truth & Trauma Institute — trauma burden and election trauma indicators for every country we cover."
      />
      <Reveal delay={0}>
        <div className="country-profiles-intro">
          <h1 className="country-profiles-heading display">Collective Trauma Profile By Country</h1>
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
                    <li key={c.code} id={`country-profile-${c.code}`} className="country-profile-item">
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

/** Shown when a country row expands. Only renders the narrative profile's
 *  own overview paragraphs + references (from country_profile_section_of_
 *  our_international_observatory_website.docx via /api/country-profiles) -
 *  no GTBI/ETTI dashboard stats, key events, or the second doc's
 *  "dashboard note", none of which come from that source document. A
 *  country only reaches this component when `available` (= !!profile)
 *  is true in the parent, so profile.overview is always present here. */
function CountryOverview({ country }) {
  const { profile } = country;
  const references = profile?.overview?.references || [];
  // Own toggle state per mounted row - resets closed on collapse/re-expand
  // (this component unmounts with its parent row), which matches how the
  // outer country row itself behaves rather than persisting open state
  // across countries.
  const [showReferences, setShowReferences] = useState(false);

  return (
    <div className="country-overview">
      {profile?.overview && (
        <div className="country-overview-section">
          {profile.overview.paragraphs.map((p, i) => (
            <p key={i} className="country-overview-paragraph">{p}</p>
          ))}

          {references.length > 0 && (
            <div className="country-overview-references-panel">
              <button
                type="button"
                className="country-overview-references-toggle"
                onClick={() => setShowReferences((open) => !open)}
                aria-expanded={showReferences}
              >
                <span
                  className={
                    "country-profile-chevron" + (showReferences ? " country-profile-chevron--open" : "")
                  }
                  aria-hidden="true"
                >
                  ›
                </span>
                {showReferences ? "Hide" : "Show"} reference{references.length === 1 ? "" : "s"} ({references.length})
              </button>
              {showReferences && (
                <ol className="country-overview-references-list">
                  {references.map((ref, i) => (
                    <li key={i} className="country-overview-reference-item">{ref}</li>
                  ))}
                </ol>
              )}
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