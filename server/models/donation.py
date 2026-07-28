"""
Donation model and CRUD functions.

A donation row is created (status="pending") the moment someone submits
the donate form, BEFORE they're sent to Stripe Checkout - so a
confirmation_code exists and can be embedded in the Checkout Session's
metadata up front, and reconciling a Stripe webhook/event back to a row
never depends on Stripe having succeeded first.

finalize_succeeded_donation() is the single place a donation is ever
marked paid. It's written to be safely callable twice for the same
donation (Stripe webhooks are explicitly "at least once" delivery, and
this app also double-checks payment status client-side as a fallback
for local dev with no public webhook URL) - the second call is a no-op
because it only acts when status is still "pending".
"""
import secrets
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text

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

    stripe_checkout_session_id = Column(String(255), nullable=True, index=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    # Comma-joined list of payment method types Stripe actually offered/used for
    # this session (e.g. "card", "card,cashapp,link") - informational only.
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


def attach_checkout_session(donation_id, stripe_checkout_session_id):
    """Records which Stripe Checkout Session a pending donation is waiting on."""
    session = Session()
    try:
        donation = session.query(Donation).filter(Donation.id == donation_id).first()
        if donation is None:
            return None
        donation.stripe_checkout_session_id = stripe_checkout_session_id
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


def get_donation_by_checkout_session(stripe_checkout_session_id):
    session = Session()
    try:
        return (
            session.query(Donation)
            .filter(Donation.stripe_checkout_session_id == stripe_checkout_session_id)
            .first()
        )
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