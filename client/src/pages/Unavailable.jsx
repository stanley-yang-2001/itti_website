import { Link } from "react-router-dom";
import "../styles/Unavailable.css";

/**
 * Generic placeholder page for content that doesn't exist yet
 * (e.g. individual country profile pages). Linked to from anywhere
 * that needs a "not built yet" destination.
 */
export default function Unavailable() {
  return (
    <div className="unavailable-page">
      <div className="unavailable-content">
        <h1>Sorry, this content is currently unavailable</h1>
        <p>Please check back later.</p>
        <Link to="/country-profiles" className="unavailable-back-link">
          Back to Country Profiles
        </Link>
      </div>
    </div>
  );
}