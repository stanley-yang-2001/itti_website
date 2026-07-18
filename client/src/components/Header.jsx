import React from 'react';
import SearchBar from './SearchBar.jsx';

/**
 * Page-level search header for the Home globe view. Global branding now
 * lives in NavBar, so this only renders the search control.
 */
export default function Header({ features, onSelectFeature }) {
  return (
    <header>
      <SearchBar features={features} onSelectFeature={onSelectFeature} />
    </header>
  );
}
