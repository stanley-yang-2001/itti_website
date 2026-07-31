# Donations — setup guide

Everything the `/donate` flow needs *in code* is already built (embedded
Stripe Payment Element, confirmation email, confirmation codes stored in
the `donations` table, an admin-only donations list at
`/admin/donations`). The steps below are the parts that can't be done
from code — they require you to create accounts, click through Stripe's
dashboard, and set environment variables.

Copy `server/.env.example` to `server/.env` and fill it in as you go
through each step.

---

## 1. Create/access your Stripe account

If you don't already have one: sign up at https://dashboard.stripe.com/register.
Stripe accounts start in **test mode** — you can build and fully test the
whole flow before ever touching real money.

## 2. Get your API keys

Dashboard → **Developers → API keys** (https://dashboard.stripe.com/apikeys).

- Copy the **Secret key** (`sk_test_...` in test mode) → `STRIPE_SECRET_KEY`
- Copy the **Publishable key** (`pk_test_...`) → `STRIPE_PUBLISHABLE_KEY`

Test-mode keys are safe to use freely — no real charges happen, and
Stripe gives you [test card numbers](https://docs.stripe.com/testing)
(e.g. `4242 4242 4242 4242`, any future expiry, any CVC) to simulate a
real donation end to end.

Only switch to the live keys (`sk_live_...` / `pk_live_...`, same page,
toggle "View test data" off) once you've tested the full flow and are
ready to accept real donations.

## 3. Set up the webhook

Dashboard → **Developers → Webhooks** (https://dashboard.stripe.com/webhooks)
→ **Add endpoint**.

- Endpoint URL: `https://<your-domain>/api/donations/webhook`
- Events to send: select **`payment_intent.succeeded`** (that's the only
  one this app listens for)
- After creating it, click into the endpoint and copy the **Signing
  secret** (`whsec_...`) → `STRIPE_WEBHOOK_SECRET`

**Testing locally, before you have a public domain:** the donate flow
still works without this — the thank-you page independently re-checks
the payment status with Stripe and finalizes the donation itself if the
webhook hasn't (or can't) reach you yet. If you want to test the webhook
specifically before deploying, use the
[Stripe CLI](https://docs.stripe.com/stripe-cli): `stripe listen --forward-to
localhost:5000/api/donations/webhook` prints a temporary webhook secret
you can use locally.

## 4. Enable Apple Pay / Google Pay (optional but recommended)

Without this step, donors can still pay by card and (depending on your
Stripe account's country/settings) bank debit and Link — just not Apple
Pay or Google Pay wallet buttons.

1. Dashboard → **Settings → Payment methods** → find **Apple Pay** →
   **Add a new domain**.
2. Enter your production domain (e.g. `giveto.itti.org` or whatever
   `/donate` is served from).
3. Stripe gives you a file named
   `apple-developer-merchantid-domain-association`. Download it and
   replace `client/public/.well-known/apple-developer-merchantid-domain-association`
   in this repo with it exactly (same filename, no extension, raw
   contents — don't rename it or add `.txt`).
4. Deploy, then confirm it's reachable at
   `https://<your-domain>/.well-known/apple-developer-merchantid-domain-association`
   in a browser before clicking "Verify" in the Stripe dashboard.
5. Google Pay doesn't require a domain file — it becomes available
   automatically once Apple Pay's domain is verified and your Stripe
   account is otherwise eligible (card payments enabled, supported
   country).

## 5. Turn on real email delivery

Right now, unless you've already configured this, donation confirmation
emails (and password reset emails) are only written to the server log —
donors won't actually receive anything. In `server/.env`:

```
EMAIL_BACKEND=smtp
SMTP_HOST=<your provider's SMTP host>
SMTP_PORT=587
SMTP_USERNAME=<your provider's SMTP username>
SMTP_PASSWORD=<your provider's SMTP password/API key>
SMTP_FROM_EMAIL=donations@your-domain.org
```

Any SMTP provider works. A few common ones:

- **SendGrid**: host `smtp.sendgrid.net`, username literally `apikey`,
  password = an API key you create under Settings → API Keys.
- **Postmark**: host `smtp.postmarkapp.com`, username/password = your
  Server Token (same value for both).
- **Mailgun**: host `smtp.mailgun.org`, username/password from your
  domain's SMTP credentials page.
- **AWS SES**: host `email-smtp.<region>.amazonaws.com`, username/password
  = SMTP credentials generated from an IAM user (not your AWS keys
  directly).

Whichever you pick, verify your sending domain with that provider (SPF/DKIM
records) or emails will land in spam or get rejected outright.

## 6. Run the database migrations

Two new migrations ship with the donations feature:

```
cd server
alembic upgrade head
```

This creates the `donations` table and its indexes. Safe to run even if
you're not sure whether it's already been applied — Alembic tracks the
current revision and no-ops if there's nothing new to do.

## 7. Give someone admin access to view donations

The donations list at `/admin/donations` is gated to the `admin` role.
Promote an existing account:

```
cd server
python promote_user.py someone@example.com admin
```

They need to have signed up/signed in at least once already (Google or
email/password) for a row to exist to promote. See
`docs/ACCESS_LEVELS.md` for how roles work generally.

## 8. Test the whole flow end to end

With test-mode keys in place:

1. Go to `/donate`, pick an amount, fill in your own name/email.
2. On the payment step, use test card `4242 4242 4242 4242`, any future
   expiry, any CVC, any ZIP.
3. You should land on `/donate/thank-you` with a confirmation code.
4. Check the server log (or your inbox, if SMTP is configured) for the
   confirmation email.
5. Log in as the admin you promoted in step 7 and confirm the donation
   shows up at `/admin/donations`.
6. If you set up the webhook in step 3, check Dashboard → Developers →
   Webhooks → your endpoint → **Recent events** for a succeeded delivery.

Once that all works, flip `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY` to
your live keys (step 2) and repeat step 8 once with a small real donation
before announcing it publicly.