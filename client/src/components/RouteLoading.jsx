import React from 'react';

/**
 * Suspense fallback for lazy-loaded routes (see App.jsx). Only visible
 * for the brief moment a route's JS chunk is actually being fetched -
 * on a fast connection or a chunk the browser already cached from an
 * earlier visit, this never even flashes on screen.
 */
export default function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-label="Loading page">
      <span className="route-loading-dot" />
      <span className="route-loading-dot" />
      <span className="route-loading-dot" />
    </div>
  );
}