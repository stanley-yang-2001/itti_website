import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// This site's html/body sizing makes <body> the actual scrolling
// container rather than the window - see About.jsx's getScroller,
// which this mirrors.
function getScroller() {
  const candidate = document.scrollingElement;
  if (candidate && candidate.scrollHeight > candidate.clientHeight) return candidate;
  return document.body;
}

/**
 * Scrolls to the element whose id matches the current URL hash, once,
 * on mount or whenever the hash changes - e.g. visiting /fellows#advisors
 * lands on the Advisors section instead of just the top of the page.
 *
 * For pages with a full sidebar/scrollspy nav (About.jsx, Docs.jsx,
 * PrivacyPolicy.jsx), use their own scrollToSection instead - they
 * already track section refs and an "active" highlight state that this
 * generic version doesn't know about. This hook is for simpler pages
 * that just need plain elements with matching ids to be reachable by
 * hash, with no nav/highlight state to keep in sync.
 */
export default function useHashScroll() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);

    // The target element may not exist yet on the very first frame if
    // this page's sections depend on data that's still loading (e.g.
    // CountryProfiles' per-letter sections, which only render once the
    // country list has fetched). Retry across a few frames rather than
    // giving up after one - cheap, and self-cancels the moment it finds
    // the element or runs out of attempts.
    let attempts = 0;
    let raf;
    function tryScroll() {
      const el = document.getElementById(id);
      if (el) {
        const scroller = getScroller();
        const navbarHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--navbar-height')) || 0;
        const top = el.getBoundingClientRect().top + scroller.scrollTop - navbarHeight - 16;
        scroller.scrollTo({ top, behavior: 'smooth' });
        return;
      }
      attempts += 1;
      if (attempts < 20) raf = requestAnimationFrame(tryScroll);
    }
    raf = requestAnimationFrame(tryScroll);
    return () => cancelAnimationFrame(raf);
  }, [hash]);
}