import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * React Router doesn't reset scroll position between route changes on its
 * own. This site's html/body sizing also makes <body> the actual scrolling
 * container rather than the window (see About.jsx's getScroller), so we
 * reset that element directly rather than window.scrollTo.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const candidate = document.scrollingElement;
    const scroller = candidate && candidate.scrollHeight > candidate.clientHeight ? candidate : document.body;
    scroller.scrollTo(0, 0);
    // Cover both, in case scrollingElement/body disagree in a given browser.
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}