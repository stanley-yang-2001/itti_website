import React from 'react';

/**
 * Generic placeholder used by every nav section that doesn't have real
 * content yet. Swap each route's element for a dedicated page component
 * as that section gets built out.
 */
export default function PlaceholderPage({ title }) {
  return (
    <div className="page-placeholder">
      <h2 className="display">{title}</h2>
      <p>This section is coming soon.</p>
    </div>
  );
}
