import { Helmet } from 'react-helmet-async';

// Update this if ittiglobal.org ever stops being the production domain -
// it feeds canonical URLs and Open Graph/Twitter absolute URLs below.
const SITE_URL = 'https://ittiglobal.org';
const DEFAULT_OG_IMAGE = `${SITE_URL}/itti-logo.png`;
const SITE_NAME = 'International Truth & Trauma Institute';

/**
 * Per-page SEO tags: title, description, canonical URL, Open Graph, and
 * Twitter Card. Renders nothing visible - react-helmet-async injects
 * these into <head> on mount/update.
 *
 * path: the route's path (e.g. "/about") - used to build the canonical
 *   URL and Open Graph url. Always pass this.
 * title: page-specific title. Rendered as "{title} | International
 *   Truth & Trauma Institute" (skip the suffix yourself - it's added
 *   here). Falls back to just the site name if omitted (Home does this).
 * description: page-specific meta description (~150-160 chars is the
 *   sweet spot for search snippets, but not enforced here).
 * image: absolute URL for Open Graph/Twitter image. Defaults to the
 *   site logo.
 * noindex: pass true for account/utility pages (login, settings, etc.)
 *   that shouldn't show up in search results or be crawled for links.
 */
export default function SEO({ path, title, description, image, noindex = false }) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonicalUrl = `${SITE_URL}${path || ''}`;
  const ogImage = image || DEFAULT_OG_IMAGE;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:image" content={ogImage} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}