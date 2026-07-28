import React from 'react';
import Reveal from '../components/Reveal.jsx';

/**
 * Generic placeholder used by every nav section that doesn't have real
 * content yet. Swap each route's element for a dedicated page component
 * as that section gets built out.
 */
export default function PlaceholderPage({ title }) {
  return (
    <Reveal delay={0}>
      <div className="page-placeholder">
        <h2 className="display">{title}</h2>
        <p>This section is coming soon.</p>
      </div>
    </Reveal>
  );
}