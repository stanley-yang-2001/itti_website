import Reveal from './Reveal.jsx';

/**
 * The shared "this isn't available" message - used both as the content of
 * the standalone /unavailable page (see pages/Unavailable.jsx, reached
 * whenever a page's fetch gets a 400 back) and inline, e.g. inside a
 * Country Profiles dropdown for a country with no profile data yet.
 * Same wording either way, since both cases mean the same thing to the
 * person looking at it: what you wanted isn't here (yet).
 *
 * variant="page" (default): full heading, for when this is the only
 * content on the screen.
 * variant="inline": smaller/quieter, for embedding inside another panel
 * (e.g. an expanded accordion row) alongside other content.
 */
export default function UnavailableMessage({ variant = 'page' }) {
  const inline = variant === 'inline';
  const Heading = inline ? 'p' : 'h1';

  return (
    <Reveal delay={0}>
      <div className={`unavailable-message${inline ? ' unavailable-message--inline' : ''}`}>
        <Heading className="unavailable-message-heading">
          Sorry, this content is currently unavailable
        </Heading>
        <p className="unavailable-message-body">Please check back later.</p>
      </div>
    </Reveal>
  );
}