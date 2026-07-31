"""
Enrollment model and CRUD functions - certification tuition payments via
Stripe Checkout.

Mirrors models/donation.py's pattern closely: a row is created
(status="pending") the moment someone starts checkout, BEFORE they're
sent to Stripe, so a confirmation_code exists up front and reconciling a
Stripe webhook/event back to a row never depends on Stripe having
succeeded first. finalize_succeeded_enrollment() is the single place an
enrollment is ever marked paid, and is safe to call twice for the same
row (Stripe webhooks are "at least once" delivery, and this app also
double-checks payment status client-side as a fallback for local dev
with no public webhook URL).

Unlike donations (donor-chosen amount, no account required), tuition is
a FIXED price per certification and enrollling requires being logged in
- see CERTIFICATION_CATALOG in app.py, which is the server-side source
of truth for cert code -> name/tuition_cents. The amount is never taken
from the client, so nothing here trusts a browser-supplied price.
"""
import secrets
from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base, Session

STATUS_PENDING = "pending"
STATUS_SUCCEEDED = "succeeded"
STATUS_FAILED = "failed"
STATUS_REFUNDED = "refunded"  # fully refunded
STATUS_PARTIALLY_REFUNDED = "partially_refunded"


def _generate_confirmation_code():
    # e.g. "ITTI-CERT-7F3K9QRS" - mirrors donation.py's confirmation code
    # shape, with a CERT- prefix so it's visibly distinguishable from a
    # donation confirmation code if the two ever appear side by side.
    return f"ITTI-CERT-{secrets.token_hex(4).upper()}"


class Enrollment(Base):
    __tablename__ = "enrollments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    confirmation_code = Column(String(32), unique=True, nullable=False, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Denormalized snapshot of the catalog entry at the time of purchase
    # (name/price), not a live lookup - so a later catalog/price change
    # never rewrites the historical record of what someone actually paid.
    cert_code = Column(String(20), nullable=False, index=True)
    cert_name = Column(String(255), nullable=False)
    tuition_cents = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="usd")

    status = Column(String(24), nullable=False, default=STATUS_PENDING, index=True)

    stripe_checkout_session_id = Column(String(255), nullable=True, index=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)
    payment_method_types = Column(String(255), nullable=True)

    # Populated only if/when a refund is issued - see refund_enrollment()
    # below, which enforces the refund policy (<=7 days: 50%, >7 days: 0%)
    # rather than trusting an arbitrary amount.
    refunded_cents = Column(Integer, nullable=True)
    refunded_at = Column(DateTime, nullable=True)
    stripe_refund_id = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    user = relationship("User")

    def __repr__(self):
        return f"<Enrollment id={self.id} code={self.confirmation_code} cert={self.cert_code} status={self.status}>"

    @property
    def tuition_display(self):
        symbol = {"usd": "$"}.get(self.currency, "")
        return f"{symbol}{self.tuition_cents / 100:,.2f}" if symbol else f"{self.tuition_cents / 100:,.2f} {self.currency.upper()}"

    @property
    def refunded_display(self):
        if self.refunded_cents is None:
            return None
        symbol = {"usd": "$"}.get(self.currency, "")
        return f"{symbol}{self.refunded_cents / 100:,.2f}" if symbol else f"{self.refunded_cents / 100:,.2f} {self.currency.upper()}"

    def to_dict(self):
        return {
            "confirmation_code": self.confirmation_code,
            "cert_code": self.cert_code,
            "cert_name": self.cert_name,
            "tuition_cents": self.tuition_cents,
            "currency": self.currency,
            "tuition_display": self.tuition_display,
            "status": self.status,
            "refunded_cents": self.refunded_cents,
            "refunded_display": self.refunded_display,
            "refunded_at": self.refunded_at.isoformat() if self.refunded_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------- CRUD ----------

def create_enrollment(user_id, cert_code, cert_name, tuition_cents, currency="usd"):
    """Creates a pending enrollment row with a fresh confirmation code. Returns the Enrollment."""
    session = Session()
    try:
        enrollment = Enrollment(
            confirmation_code=_generate_confirmation_code(),
            user_id=user_id,
            cert_code=cert_code,
            cert_name=cert_name,
            tuition_cents=tuition_cents,
            currency=currency,
            status=STATUS_PENDING,
        )
        session.add(enrollment)
        session.commit()
        session.refresh(enrollment)
        return enrollment
    finally:
        session.close()


def attach_checkout_session(enrollment_id, stripe_checkout_session_id):
    session = Session()
    try:
        enrollment = session.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if enrollment is None:
            return None
        enrollment.stripe_checkout_session_id = stripe_checkout_session_id
        session.commit()
        session.refresh(enrollment)
        return enrollment
    finally:
        session.close()


def get_enrollment(enrollment_id):
    session = Session()
    try:
        return session.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    finally:
        session.close()


def get_enrollment_by_checkout_session(stripe_checkout_session_id):
    session = Session()
    try:
        return (
            session.query(Enrollment)
            .filter(Enrollment.stripe_checkout_session_id == stripe_checkout_session_id)
            .first()
        )
    finally:
        session.close()


def get_enrollments_for_user(user_id):
    session = Session()
    try:
        return (
            session.query(Enrollment)
            .filter(Enrollment.user_id == user_id)
            .order_by(Enrollment.created_at.desc())
            .all()
        )
    finally:
        session.close()


def finalize_succeeded_enrollment(enrollment_id, stripe_payment_intent_id=None, payment_method_types=None):
    """
    Marks an enrollment as succeeded. Only takes effect while still
    "pending", so a repeat call (webhook redelivery, or the thank-you
    page's own status check racing the webhook) is a harmless no-op.
    Returns (enrollment, just_finalized: bool).
    """
    session = Session()
    try:
        enrollment = session.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if enrollment is None:
            return None, False
        if enrollment.status == STATUS_SUCCEEDED:
            return enrollment, False
        enrollment.status = STATUS_SUCCEEDED
        if stripe_payment_intent_id:
            enrollment.stripe_payment_intent_id = stripe_payment_intent_id
        if payment_method_types:
            enrollment.payment_method_types = ",".join(payment_method_types)
        session.commit()
        session.refresh(enrollment)
        return enrollment, True
    finally:
        session.close()


def mark_enrollment_failed(enrollment_id):
    session = Session()
    try:
        enrollment = session.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if enrollment is None or enrollment.status == STATUS_SUCCEEDED:
            return enrollment
        enrollment.status = STATUS_FAILED
        session.commit()
        session.refresh(enrollment)
        return enrollment
    finally:
        session.close()


def record_refund(enrollment_id, refunded_cents, stripe_refund_id, full):
    """
    Records a refund already issued through Stripe (see refund_enrollment
    in app.py, which calls the Stripe API and then this). Marks the
    enrollment status "refunded" if the full tuition was refunded, or
    "partially_refunded" otherwise (the 50%-within-a-week tier).
    """
    session = Session()
    try:
        enrollment = session.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if enrollment is None:
            return None
        enrollment.refunded_cents = refunded_cents
        enrollment.refunded_at = datetime.utcnow()
        enrollment.stripe_refund_id = stripe_refund_id
        enrollment.status = STATUS_REFUNDED if full else STATUS_PARTIALLY_REFUNDED
        session.commit()
        session.refresh(enrollment)
        return enrollment
    finally:
        session.close()