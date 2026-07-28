import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { checkEmail, checkName, checkDonationAmount } from '../utils/formValidation.js';
import Reveal from '../components/Reveal.jsx';
import '../styles/Donate.css';

const FALLBACK_PRESETS_CENTS = [2500, 5000, 10000, 25000]; // used only if /api/donations/presets can't be reached

function centsToDollarLabel(cents) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function Donate() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const wasCanceled = searchParams.get('canceled') === '1';

  const [presetsCents, setPresetsCents] = useState(FALLBACK_PRESETS_CENTS);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [customAmount, setCustomAmount] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Prefill from the logged-in account, if any — donating doesn't require
  // an account, this is purely a convenience when one exists.
  useEffect(() => {
    if (!user) return;
    if (user.email && !email) setEmail(user.email);
    if (user.name && !firstName && !lastName) {
      const [first, ...rest] = user.name.trim().split(/\s+/);
      setFirstName(first || '');
      setLastName(rest.join(' '));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetch('/api/donations/presets')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.presets_cents?.length) setPresetsCents(data.presets_cents);
      })
      .catch(() => {
        /* fall back to FALLBACK_PRESETS_CENTS, already the default state */
      });
  }, []);

  function selectPreset(cents) {
    setSelectedPreset(cents);
    setCustomAmount('');
  }

  function handleCustomAmountChange(e) {
    setCustomAmount(e.target.value);
    setSelectedPreset(null);
  }

  const amountDollars = selectedPreset != null ? selectedPreset / 100 : parseFloat(customAmount);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const validationError =
      checkName(firstName) ||
      checkName(lastName) ||
      checkEmail(email) ||
      checkDonationAmount(amountDollars);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/donations/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim(),
          amount_cents: Math.round(amountDollars * 100),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.description || data.error || 'Something went wrong. Please try again.');
      }
      // Hand off to Stripe's own hosted Checkout page — it decides which
      // payment methods to actually show (card, bank debit, wallets,
      // etc.), so nothing here has to enumerate them.
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="donate-page">
      <Reveal delay={0}>
        <div className="donate-hero">
          <p className="donate-hero-eyebrow mono">Support ITTI</p>
          <h1 className="donate-hero-title display">Make a Donation</h1>
          <p className="donate-hero-tagline">
            Your gift funds our work documenting and responding to election- and conflict-related trauma
            around the world. Every donation is processed securely through Stripe.
          </p>
        </div>
      </Reveal>

      <form className="donate-card" onSubmit={handleSubmit}>
        {wasCanceled && (
          <p className="donate-notice">Your payment was canceled — no charge was made. You can try again below.</p>
        )}
        {error && <p className="donate-error">{error}</p>}

        <Reveal delay={90}>
          <fieldset className="donate-fieldset">
            <legend>Choose an amount</legend>
            <div className="donate-amount-grid">
              {presetsCents.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  className={`donate-amount-chip${selectedPreset === cents ? ' active' : ''}`}
                  onClick={() => selectPreset(cents)}
                >
                  {centsToDollarLabel(cents)}
                </button>
              ))}
            </div>
            <label className="donate-field donate-custom-amount">
              <span>Custom amount (USD)</span>
              <div className="donate-custom-amount-input">
                <span className="donate-currency-prefix">$</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  placeholder="Other amount"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                />
              </div>
            </label>
          </fieldset>
        </Reveal>

        <Reveal delay={170}>
          <fieldset className="donate-fieldset">
            <legend>Your information</legend>
            <div className="donate-name-row">
              <label className="donate-field">
                <span>First name</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </label>
              <label className="donate-field">
                <span>Last name</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </label>
            </div>
            <label className="donate-field">
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <p className="donate-email-note">Your donation receipt and confirmation number will be sent here.</p>
          </fieldset>
        </Reveal>

        <Reveal delay={250}>
          <button type="submit" className="donate-submit-button" disabled={loading}>
            {loading ? 'Redirecting to secure checkout…' : 'Continue to secure checkout'}
          </button>
        </Reveal>
        <p className="donate-stripe-note">
          Payments are processed securely by Stripe. Card, bank, and wallet options (e.g. Apple Pay, Cash App
          Pay, Link) are offered automatically based on your device and location — ITTI never sees or stores
          your payment details.
        </p>
      </form>
    </div>
  );
}