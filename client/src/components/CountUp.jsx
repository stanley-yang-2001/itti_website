import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number counting up. Deliberately restrained for the
 * context this site is used in (trauma statistics, not a game score):
 * a single smooth ease-out with no bounce/overshoot, and it's skipped
 * entirely for reduced-motion users.
 *
 * On first mount - i.e. right after a country is clicked on the globe,
 * since SidePanel gives each <Score> a `key` tied to the country's ISO
 * code, forcing a fresh CountUp instance per country - it counts up
 * from 0. On any later change to `value` within that same mounted
 * instance (e.g. switching the GTBI/ETTI year dropdown for the same
 * country), it animates smoothly from whatever's currently displayed
 * instead of resetting to 0, so the motion reads as "this number
 * changed" rather than restarting from scratch.
 */
export default function CountUp({ value, decimals = 2, duration = 800 }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const firstRender = useRef(true);
  const rafRef = useRef(null);

  useEffect(() => {
    const to = value;
    const from = firstRender.current ? 0 : fromRef.current;
    firstRender.current = false;

    if (typeof to !== 'number' || Number.isNaN(to)) {
      setDisplay(to);
      fromRef.current = to;
      return undefined;
    }

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(to);
      fromRef.current = to;
      return undefined;
    }

    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out, no overshoot
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  if (typeof display !== 'number' || Number.isNaN(display)) return <>{display}</>;
  return <>{display.toFixed(decimals)}</>;
}