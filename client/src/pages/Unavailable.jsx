import { Link, useSearchParams } from "react-router-dom";
import UnavailableMessage from "../components/UnavailableMessage.jsx";
import "../styles/Unavailable.css";

/**
 * Generic "this isn't available" destination for the whole site - not
 * just missing country profiles anymore. Any page that fetches something
 * the user navigated directly to and gets a 400 Bad Request back (see
 * utils/apiError.js's isBadRequest) should send the user here rather
 * than showing a raw error string, since a 400 in that situation means
 * "what you were looking for was never going to exist" rather than
 * "something broke."
 *
 * The back link is configurable via query params so this stays generic
 * across every page that might land here:
 *   /unavailable?from=/country-profiles&fromLabel=Back%20to%20Country%20Profiles
 * Falls back to the homepage if none are given.
 */
export default function Unavailable() {
  const [params] = useSearchParams();
  const backTo = params.get("from") || "/";
  const backLabel = params.get("fromLabel") || "Back home";

  return (
    <div className="unavailable-page">
      <UnavailableMessage />
      <Link to={backTo} className="unavailable-back-link">
        {backLabel}
      </Link>
    </div>
  );
}