import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import '../styles/Donate.css';

const RETRY_DELAY_MS = 3000;
const MAX_RETRIES = 3; // covers async payment methods (e.g. bank debit) that don't settle instantly

export default function DonateThankYou() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [donation, setDonation] = useState(null);
  const [status, setStatus] = useState(sessionId ? 'loading' : 'missing-session');

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    let retries = 0;

    async function poll() {
      try {
        const res = await fetch(`/api/donations/session/${encodeURIComponent(sessionId)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setStatus('error');
          return;
        }
        setDonation(data);
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
  }, [sessionId]);

  return (
    <div className="donate-page">
      <div className="donate-thankyou-card">
        {status === 'missing-session' && (
          <>
            <h1 className="display">Nothing to confirm here</h1>
            <p>This page is shown after completing a donation. If you meant to donate, start below.</p>
            <Link to="/donate" className="donate-submit-button donate-thankyou-link">Make a donation</Link>
          </>
        )}

        {status === 'loading' && (
          <>
            <h1 className="display">Confirming your donation…</h1>
            <p>This only takes a moment.</p>
          </>
        )}

        {status === 'succeeded' && donation && (
          <>
            <h1 className="display">Thank you, {donation.first_name}!</h1>
            <p className="donate-thankyou-message">
              Your donation means a great deal to our work. A receipt has been emailed to{' '}
              <strong>{donation.email}</strong>.
            </p>
            <div className="donate-receipt">
              <div className="donate-receipt-row">
                <span>Confirmation number</span>
                <strong>{donation.confirmation_code}</strong>
              </div>
              <div className="donate-receipt-row">
                <span>Donor</span>
                <strong>{donation.first_name} {donation.last_name}</strong>
              </div>
              <div className="donate-receipt-row">
                <span>Amount</span>
                <strong>{donation.amount_display}</strong>
              </div>
            </div>
            <p className="donate-thankyou-footnote">
              Keep this confirmation number for your records — it's also stored on file with us as a
              reference for this gift.
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
            <Link to="/donate" className="donate-submit-button donate-thankyou-link">Try again</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="display">We couldn't load this confirmation</h1>
            <p>
              If you completed a payment, don't worry — it may still be processing, and a receipt email will
              follow shortly. If you're unsure, please contact us with your email address.
            </p>
            <Link to="/donate" className="donate-submit-button donate-thankyou-link">Back to Donate</Link>
          </>
        )}
      </div>
    </div>
  );
}