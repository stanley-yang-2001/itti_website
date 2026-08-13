import React, { useState } from 'react';

function initials(name, email) {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Shows a user's avatar image, falling back to initials if there's no
 * picture_url or the image fails to load (e.g. a Google avatar URL
 * that 403s) rather than leaving a broken-image icon on the page.
 * Shared by Profile.jsx (the big header avatar) and NavBar.jsx (the
 * small top-right one) so both stay in sync.
 */
export default function Avatar({ name, email, pictureUrl, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = pictureUrl && !imageFailed;

  return (
    <div className={`avatar${className ? ` ${className}` : ''}`}>
      {showImage ? (
        <img src={pictureUrl} alt="" onError={() => setImageFailed(true)} />
      ) : (
        <span>{initials(name, email)}</span>
      )}
    </div>
  );
}