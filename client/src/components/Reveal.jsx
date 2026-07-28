import React, { useEffect, useRef, useState, cloneElement } from 'react';

/** Combines the wrapped child's existing ref (if it has one) with our own,
 * so wrapping something in <Reveal> never breaks a ref it was already
 * using for something else (e.g. scroll-spy section tracking). */
function mergeRefs(...refs) {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else ref.current = node;
    });
  };
}

/**
 * Wraps a single element and fades/slides it in the first time it
 * scrolls into view, instead of everything on the page just being
 * there on load. Stagger a group of these with increasing `delay`
 * values (e.g. i * 90) to get a cascading, one-after-another reveal
 * as the user scrolls down a page.
 *
 * Doesn't add any wrapping DOM node - the ref/className/style needed
 * to animate get merged directly onto the child via cloneElement, so
 * it's safe to drop into flex/grid layouts without disturbing them.
 *
 * Reveals once and stays revealed (doesn't re-hide on scroll away),
 * which is the usual expectation for this kind of effect and avoids
 * content flickering in and out while scrolling up and down.
 */
export default function Reveal({ children, delay = 0 }) {
  const ownRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ownRef.current;
    if (!el) return undefined;

    // Respect reduced-motion users by just showing content immediately
    // rather than observing at all.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const child = React.Children.only(children);
  const mergedClassName = [child.props.className, 'reveal-on-scroll', visible ? 'is-visible' : '']
    .filter(Boolean)
    .join(' ');
  const mergedStyle = { ...child.props.style, transitionDelay: `${delay}ms` };

  return cloneElement(child, {
    ref: mergeRefs(ownRef, child.ref),
    className: mergedClassName,
    style: mergedStyle
  });
}