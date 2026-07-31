import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { CERTIFICATIONS } from '../data/certifications.js';
import '../styles/Donate.css';

// Kept in sync with server/app.py's REFUND_PARTIAL_WINDOW_DAYS /
// REFUND_PARTIAL_FRACTION - the server enforces this for real (see
// refund_enrollment), this is just the same policy shown before purchase
// so nobody pays without seeing it first.
const REFUND_POLICY_TEXT =
  'Enrollments canceled within 7 days of purchase are eligible for a 50% refund of tuition paid. ' +
  'No refunds are available after 7 days from the date of purchase.';

export default function CertificationEnroll() {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const canceled = searchParams.get('canceled') === '1';
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const cert = CERTIFICATIONS.find((c) => c.code === code?.toUpperCase());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Login is required to enroll (see app.py's checkout-session route) -
    // bounce to login and bring the user right back here afterward,
    // rather than letting them hit "Proceed to Payment" only to get a 401.
    if (!authLoading && !isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent(`/certifications/enroll/${code}`)}`, { replace: true });
    }
  }, [authLoading, isAuthenticated, code, navigate]);

  if (!cert) {
    return (
      <div className="donate-page">
        <Reveal delay={0}>
          <div className="donate-thankyou-card">
            <h1 className="display">Certification not found</h1>
            <p>We couldn't find a certification matching "{code}".</p>
            <Link to="/certifications" className="donate-submit-button donate-thankyou-link">
              Back to Certifications
            </Link>
          </div>
        </Reveal>
      </div>
    );
  }

  async function handleProceedToPayment() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/certifications/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cert_code: cert.code })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.description || 'Something went wrong starting checkout. Please try again.');
        setSubmitting(false);
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      setError('Something went wrong starting checkout. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="donate-page">
      <div className="donate-hero">
        <p className="donate-hero-eyebrow">Certification Enrollment</p>
        <h1 className="donate-hero-title">
          {cert.code}&trade; &mdash; {cert.name}
        </h1>
        <p className="donate-hero-tagline">{cert.tagline}</p>
      </div>

      <Reveal delay={0}>
        <div className="donate-card">
          {canceled && (
            <p className="donate-thankyou-footnote">
              Checkout was canceled - no charge was made. You can start again below whenever you're ready.
            </p>
          )}

          <div className="donate-receipt">
            <div className="donate-receipt-row">
              <span>Certification</span>
              <strong>{cert.code}&trade;</strong>
            </div>
            <div className="donate-receipt-row">
              <span>Tuition</span>
              <strong>{cert.tuition}</strong>
            </div>
          </div>

          <div>
            <p className="donate-hero-eyebrow" style={{ textAlign: 'left' }}>Refund Policy</p>
            <p className="donate-thankyou-footnote" style={{ margin: 0 }}>{REFUND_POLICY_TEXT}</p>
          </div>

          {error && <p className="donate-error">{error}</p>}

          <button
            type="button"
            className="donate-submit-button"
            onClick={handleProceedToPayment}
            disabled={submitting}
          >
            {submitting ? 'Redirecting to payment…' : `Proceed to Payment — ${cert.tuition}`}
          </button>
          <p className="donate-thankyou-footnote" style={{ textAlign: 'center' }}>
            You'll be redirected to Stripe to complete payment securely.
          </p>
        </div>
      </Reveal>
    </div>
  );
}