"""
PasswordResetCode model and CRUD functions.

Same hashing principle as password_reset_token.py: only a SHA-256 hash
of the code is stored, never the raw digits, so reading this table
can't be used to reset anyone's password. Unlike the token flow (a
clickable link), this is a short numeric code the user types into the
Verify Reset Code page - shorter TTL (10 minutes, vs. the link's 1
hour) since it's meant to be entered right after the email arrives,
plus a bounded number of guesses so the 6-digit space (1M possibilities)
can't just be brute-forced against a single outstanding code.

request_password_reset_code() invalidates any older unused code for the
same user, same as the token flow - only the most recently requested
code (or resend) is ever valid. Resending is just calling this again.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base, Session

DEFAULT_CODE_TTL = timedelta(minutes=10)
MAX_VERIFY_ATTEMPTS = 5

# Cooldown between resend requests for the same user, enforced in
# create_reset_code() itself (not just the route's rate limiter) so any
# caller gets the same protection against hammering the resend button.
RESEND_COOLDOWN = timedelta(seconds=30)


def _hash_code(raw_code):
    return hashlib.sha256(raw_code.encode("utf-8")).hexdigest()


def _generate_code():
    """Random 6-digit code, zero-padded (e.g. '004821') - a fixed 6
    digits reads more like a code and less like a truncated number."""
    return f"{secrets.randbelow(1_000_000):06d}"


class PasswordResetCode(Base):
    __tablename__ = "password_reset_codes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    code_hash = Column(String, nullable=False, index=True)
    attempts = Column(Integer, default=0, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")

    def __repr__(self):
        return f"<PasswordResetCode id={self.id} user_id={self.user_id} used={self.used_at is not None}>"


# ---------- CRUD ----------

def create_reset_code(user_id, ttl=DEFAULT_CODE_TTL):
    """
    Creates a new 6-digit reset code for a user, invalidating any
    previous unused code they had outstanding. Returns the RAW code
    (only time it's available in plaintext) - put this in the email,
    never log it. Used for both the initial send and every resend.

    Raises RuntimeError if called again within RESEND_COOLDOWN of the
    user's last outstanding code - callers (the resend route) should
    catch this and turn it into a user-facing "please wait" message.
    """
    session = Session()
    try:
        latest = (
            session.query(PasswordResetCode)
            .filter(
                PasswordResetCode.user_id == user_id,
                PasswordResetCode.used_at.is_(None),
            )
            .order_by(PasswordResetCode.created_at.desc())
            .first()
        )
        if latest is not None and datetime.utcnow() - latest.created_at < RESEND_COOLDOWN:
            raise RuntimeError("Please wait before requesting another code.")

        # Invalidate every older unused code for this user so only the
        # newest one (this one) is honored.
        session.query(PasswordResetCode).filter(
            PasswordResetCode.user_id == user_id,
            PasswordResetCode.used_at.is_(None),
        ).update({"used_at": datetime.utcnow()})

        raw_code = _generate_code()
        record = PasswordResetCode(
            user_id=user_id,
            code_hash=_hash_code(raw_code),
            expires_at=datetime.utcnow() + ttl,
        )
        session.add(record)
        session.commit()
        return raw_code
    finally:
        session.close()


def invalidate_active_codes(user_id):
    """
    Marks every unused code for this user as used, with no replacement.
    Used when the user backs out of the flow to re-enter their email
    (see /api/auth/forgot-password/back) - the previously sent code
    should stop working the moment they abandon it, same as it would if
    they'd successfully verified it.
    """
    session = Session()
    try:
        session.query(PasswordResetCode).filter(
            PasswordResetCode.user_id == user_id,
            PasswordResetCode.used_at.is_(None),
        ).update({"used_at": datetime.utcnow()})
        session.commit()
    finally:
        session.close()


def get_active_code_for_user(user_id):
    """The current outstanding (unused, unexpired) code row for a user,
    or None. Used to check attempts before verifying a guess."""
    session = Session()
    try:
        record = (
            session.query(PasswordResetCode)
            .filter(
                PasswordResetCode.user_id == user_id,
                PasswordResetCode.used_at.is_(None),
            )
            .order_by(PasswordResetCode.created_at.desc())
            .first()
        )
        if record is None:
            return None
        if record.expires_at < datetime.utcnow():
            return None
        return record
    finally:
        session.close()


def verify_code(user_id, raw_code):
    """
    Checks a guessed code against the user's current active code.
    Returns "ok", "mismatch", "expired", or "too_many_attempts".

    Every call (right or wrong) increments the attempt counter first,
    so a flood of guesses against an expired-but-not-yet-cleaned-up row
    still gets capped. A correct guess marks the code used so it can't
    be replayed. This does NOT check any rate limit beyond
    MAX_VERIFY_ATTEMPTS - the route itself also applies Flask-Limiter.
    """
    session = Session()
    try:
        record = (
            session.query(PasswordResetCode)
            .filter(
                PasswordResetCode.user_id == user_id,
                PasswordResetCode.used_at.is_(None),
            )
            .order_by(PasswordResetCode.created_at.desc())
            .first()
        )
        if record is None:
            return "expired"
        if record.expires_at < datetime.utcnow():
            return "expired"
        if record.attempts >= MAX_VERIFY_ATTEMPTS:
            return "too_many_attempts"

        record.attempts += 1

        if record.code_hash != _hash_code(raw_code):
            session.commit()
            return "mismatch"

        record.used_at = datetime.utcnow()
        session.commit()
        return "ok"
    finally:
        session.close()