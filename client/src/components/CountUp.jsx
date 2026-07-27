import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number counting from its previous value to `value` over
 * `duration` ms. Deliberately restrained for the context this site is
 * used in (trauma statistics, not a game score): a single smooth
 * ease-out with no bounce/overshoot, and it's skipped entirely for
 * reduced-motion users. Renders the number as-is (no animation) on
 * first mount so it doesn't visibly count up from 0 the instant a
 * country panel opens - it only animates on subsequent changes (e.g.
 * switching the year dropdown), which is the useful case: showing
 * that a number actually changed.
 */
export default function CountUp({ value, decimals = 2, duration = 650 }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const firstRender = useRef(true);
  const rafRef = useRef(null);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      fromRef.current = value;
      setDisplay(value);
      return undefined;
    }

    const from = fromRef.current;
    const to = value;

    if (typeof to !== 'number' || Number.isNaN(to) || typeof from !== 'number') {
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