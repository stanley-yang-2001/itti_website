import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Reveal from '../components/Reveal.jsx';
import '../styles/Donate.css';

const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 3; // covers async payment methods (e.g. bank debit) that don't settle instantly

export default function CertificationEnrollThankYou() {
  const [searchParams] = useSearchParams();
  // Stripe.js appends these after stripe.confirmPayment() redirects back
  // here: payment_intent/payment_intent_client_secret identify which
  // PaymentIntent to check, redirect_status is Stripe's own immediate
  // read on it (still re-verified server-side below, not trusted as-is).
  const paymentIntentId = searchParams.get('payment_intent');
  const redirectStatus = searchParams.get('redirect_status');

  const [enrollment, setEnrollment] = useState(null);
  const [status, setStatus] = useState(paymentIntentId ? 'loading' : 'missing-session');

  useEffect(() => {
    if (!paymentIntentId) return;
    if (redirectStatus === 'failed') {
      setStatus('failed');
      return;
    }

    let cancelled = false;
    let retries = 0;

    async function poll() {
      try {
        const res = await fetch(`/api/certifications/enrollments/payment-intent/${encodeURIComponent(paymentIntentId)}`, {
          credentials: 'include'
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setStatus('error');
          return;
        }
        setEnrollment(data);
        if (data.status === 'succeeded') {
          setStatus('succeeded');
        } else if (data.status === 'failed') {
          setStatus('failed');
        } else if (retries < MAX_RETRIES) {
          retries += 1;
          setTimeout(poll, RETRY_DELAY_MS);
        } else {
          setStatus('pending');
        }
      } catch {
        if (!cancelled) setStatus('error');
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [paymentIntentId, redirectStatus]);

  return (
    <div className="donate-page">
      <Reveal delay={0}>
        <div className="donate-thankyou-card">
          {status === 'missing-session' && (
            <>
              <h1 className="display">Nothing to confirm here</h1>
              <p>This page is shown after completing a certification enrollment payment.</p>
              <Link to="/certifications" className="donate-submit-button donate-thankyou-link">
                Browse Certifications
              </Link>
            </>
          )}

          {status === 'loading' && (
            <>
              <h1 className="display">Confirming your enrollment…</h1>
              <p>This only takes a moment.</p>
            </>
          )}

          {status === 'succeeded' && enrollment && (
            <>
              <h1 className="display">You're enrolled!</h1>
              <p className="donate-thankyou-message">
                Welcome to <strong>{enrollment.cert_name}</strong> ({enrollment.cert_code}&trade;). A receipt has
                been emailed to you.
              </p>
              <div className="donate-receipt">
                <div className="donate-receipt-row">
                  <span>Confirmation number</span>
                  <strong>{enrollment.confirmation_code}</strong>
                </div>
                <div className="donate-receipt-row">
                  <span>Certification</span>
                  <strong>{enrollment.cert_code}&trade;</strong>
                </div>
                <div className="donate-receipt-row">
                  <span>Tuition paid</span>
                  <strong>{enrollment.tuition_display}</strong>
                </div>
              </div>
              <p className="donate-thankyou-footnote">
                Keep this confirmation number for your records — it's also stored on file with us. Refunds are
                available within 7 days of purchase (50% of tuition); contact us with your confirmation number
                to request one.
              </p>
            </>
          )}

          {status === 'pending' && (
            <>
              <h1 className="display">Almost there</h1>
              <p>
                Your payment is still being confirmed by your bank or payment method — this can take a little
                longer for some payment types. You'll receive a confirmation email as soon as it clears; no
                need to try again.
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <h1 className="display">Payment didn't go through</h1>
              <p>Your card or payment method was declined and no charge was made. Please try again.</p>
              <Link to="/certifications" className="donate-submit-button donate-thankyou-link">
                Back to Certifications
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="display">We couldn't load this confirmation</h1>
              <p>
                If you completed a payment, don't worry — it may still be processing, and a receipt email will
                follow shortly. If you're unsure, please contact us.
              </p>
              <Link to="/certifications" className="donate-submit-button donate-thankyou-link">
                Back to Certifications
              </Link>
            </>
          )}
        </div>
      </Reveal>
    </div>
  );
}