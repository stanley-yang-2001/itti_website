"""
Donation model and CRUD functions.

A donation row is created (status="pending") the moment someone submits
the donate form, BEFORE Stripe is ever involved - so a confirmation_code
exists and can be embedded in the PaymentIntent's metadata up front, and
reconciling a Stripe webhook/event back to a row never depends on Stripe
having succeeded first.

finalize_succeeded_donation() is the single place a donation is ever
marked paid. It's written to be safely callable twice for the same
donation (Stripe webhooks are explicitly "at least once" delivery, and
this app also double-checks payment status client-side as a fallback
for local dev with no public webhook URL) - the second call is a no-op
because it only acts when status is still "pending".
"""
import secrets
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text, func

from .database import Base, Session

STATUS_PENDING = "pending"
STATUS_SUCCEEDED = "succeeded"
STATUS_FAILED = "failed"


def _generate_confirmation_code():
    # e.g. "ITTI-7F3K9QRS" - short enough to read back over email/phone,
    # long enough (8 base32-ish chars from token_hex) that guessing
    # another donor's code isn't practical.
    return f"ITTI-{secrets.token_hex(4).upper()}"


class Donation(Base):
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, autoincrement=True)
    confirmation_code = Column(String(32), unique=True, nullable=False, index=True)

    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    email = Column(String(254), nullable=False, index=True)

    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="usd")

    status = Column(String(20), nullable=False, default=STATUS_PENDING, index=True)

    # Legacy: populated only by donations created before the switch to an
    # embedded Payment Element (see attach_payment_intent below). Left in
    # place rather than migrated away since it costs nothing to keep and
    # avoids rewriting historical rows.
    stripe_checkout_session_id = Column(String(255), nullable=True, index=True)
    stripe_payment_intent_id = Column(String(255), nullable=True, index=True)
    # Comma-joined list of payment method types Stripe actually offered/used for
    # this donation (e.g. "card", "card,cashapp,link") - informational only.
    payment_method_types = Column(String(255), nullable=True)

    # Free-text note from the donor, if the frontend ever grows one - not
    # currently collected by the form, but the column costs nothing to have
    # ready and avoids a migration later for such a low-risk addition.
    note = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Donation id={self.id} code={self.confirmation_code} status={self.status}>"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def amount_display(self):
        """e.g. 2500 cents, 'usd' -> '$25.00'"""
        symbol = {"usd": "$"}.get(self.currency, "")
        return f"{symbol}{self.amount_cents / 100:,.2f}" if symbol else f"{self.amount_cents / 100:,.2f} {self.currency.upper()}"

    def to_dict(self):
        return {
            "confirmation_code": self.confirmation_code,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "amount_cents": self.amount_cents,
            "currency": self.currency,
            "amount_display": self.amount_display,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    def to_admin_dict(self):
        """Everything in to_dict() plus internal/Stripe references - only
        ever returned from admin-only routes, unlike to_dict()."""
        data = self.to_dict()
        data.update({
            "id": self.id,
            "stripe_payment_intent_id": self.stripe_payment_intent_id,
            "payment_method_types": self.payment_method_types.split(",") if self.payment_method_types else [],
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        })
        return data


# ---------- CRUD ----------

def create_donation(first_name, last_name, email, amount_cents, currency="usd"):
    """Creates a pending donation row with a fresh confirmation code. Returns the Donation."""
    session = Session()
    try:
        donation = Donation(
            confirmation_code=_generate_confirmation_code(),
            first_name=first_name.strip(),
            last_name=last_name.strip(),
            email=email.strip().lower(),
            amount_cents=amount_cents,
            currency=currency,
            status=STATUS_PENDING,
        )
        session.add(donation)
        session.commit()
        session.refresh(donation)
        return donation
    finally:
        session.close()


def attach_payment_intent(donation_id, stripe_payment_intent_id):
    """Records which Stripe PaymentIntent a pending donation is waiting on."""
    session = Session()
    try:
        donation = session.query(Donation).filter(Donation.id == donation_id).first()
        if donation is None:
            return None
        donation.stripe_payment_intent_id = stripe_payment_intent_id
        session.commit()
        session.refresh(donation)
        return donation
    finally:
        session.close()


def get_donation(donation_id):
    session = Session()
    try:
        return session.query(Donation).filter(Donation.id == donation_id).first()
    finally:
        session.close()


def get_donation_by_confirmation_code(confirmation_code):
    session = Session()
    try:
        return session.query(Donation).filter(Donation.confirmation_code == confirmation_code).first()
    finally:
        session.close()


def get_donation_by_payment_intent(stripe_payment_intent_id):
    session = Session()
    try:
        return (
            session.query(Donation)
            .filter(Donation.stripe_payment_intent_id == stripe_payment_intent_id)
            .first()
        )
    finally:
        session.close()


def list_donations(status=None, search=None, limit=50, offset=0):
    """
    Admin-facing listing: newest first, optionally filtered by status and/or
    a search term matched against confirmation code, email, and name
    (case-insensitive substring match on each, OR'd together). Returns
    (donations, total_count) so the frontend can page through results
    without loading everything at once.
    """
    session = Session()
    try:
        query = session.query(Donation)
        if status:
            query = query.filter(Donation.status == status)
        if search:
            like = f"%{search.strip()}%"
            query = query.filter(
                (Donation.confirmation_code.ilike(like))
                | (Donation.email.ilike(like))
                | (Donation.first_name.ilike(like))
                | (Donation.last_name.ilike(like))
            )
        total = query.count()
        donations = (
            query.order_by(Donation.created_at.desc())
            .limit(limit)
            .offset(offset)
            .all()
        )
        return donations, total
    finally:
        session.close()


def get_donation_totals():
    """Lifetime succeeded-donation totals, for a small summary strip above the admin list."""
    session = Session()
    try:
        count, total_cents = (
            session.query(func.count(Donation.id), func.coalesce(func.sum(Donation.amount_cents), 0))
            .filter(Donation.status == STATUS_SUCCEEDED)
            .one()
        )
        return {"count": count, "total_cents": int(total_cents)}
    finally:
        session.close()


def finalize_succeeded_donation(donation_id, stripe_payment_intent_id=None, payment_method_types=None):
    """
    Marks a donation as succeeded. Only takes effect if the donation is
    still "pending" - a second call (e.g. the webhook firing again, or
    the thank-you page's own status check racing the webhook) is a
    harmless no-op rather than double-processing anything. Returns
    (donation, just_finalized: bool) so the caller knows whether THIS
    call was the one that should trigger the confirmation email.
    """
    session = Session()
    try:
        donation = session.query(Donation).filter(Donation.id == donation_id).first()
        if donation is None:
            return None, False
        if donation.status == STATUS_SUCCEEDED:
            return donation, False
        donation.status = STATUS_SUCCEEDED
        if stripe_payment_intent_id:
            donation.stripe_payment_intent_id = stripe_payment_intent_id
        if payment_method_types:
            donation.payment_method_types = ",".join(payment_method_types)
        session.commit()
        session.refresh(donation)
        return donation, True
    finally:
        session.close()


def mark_donation_failed(donation_id):
    session = Session()
    try:
        donation = session.query(Donation).filter(Donation.id == donation_id).first()
        if donation is None or donation.status == STATUS_SUCCEEDED:
            return donation
        donation.status = STATUS_FAILED
        session.commit()
        session.refresh(donation)
        return donation
    finally:
        session.close()