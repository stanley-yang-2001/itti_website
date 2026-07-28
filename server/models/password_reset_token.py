"""
PasswordResetToken model and CRUD functions.

The raw token is only ever returned once, at creation, so it can be put
into the reset link sent to the user. Only its SHA-256 hash is stored -
same principle as never storing a raw password, since anyone who could
read this table shouldn't be able to reset accounts with what they find.

Tokens expire (default 1 hour) and are single-use (`used_at` gets set
once redeemed). request_password_reset() also invalidates any older
unused tokens for the same user, so only the most recent reset link
someone requested actually works.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .database import Base, Session

DEFAULT_TOKEN_TTL = timedelta(hours=1)


def _hash_token(raw_token):
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User")

    def __repr__(self):
        return f"<PasswordResetToken id={self.id} user_id={self.user_id} used={self.used_at is not None}>"


# ---------- CRUD ----------

def create_reset_token(user_id, ttl=DEFAULT_TOKEN_TTL):
    """
    Creates a new reset token for a user and invalidates any previous
    unused tokens they had outstanding. Returns the RAW token (only
    time it's ever available in plaintext) - put this in the reset
    link, never log it or store it anywhere else.
    """
    session = Session()
    try:
        # Invalidate older unused tokens for this user so only the
        # latest reset request is honored.
        session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.utcnow()})

        raw_token = secrets.token_urlsafe(32)
        record = PasswordResetToken(
            user_id=user_id,
            token_hash=_hash_token(raw_token),
            expires_at=datetime.utcnow() + ttl,
        )
        session.add(record)
        session.commit()
        return raw_token
    finally:
        session.close()


def get_valid_token(raw_token):
    """
    Looks up a token by its raw value (hashing it to compare). Returns
    the PasswordResetToken row only if it exists, hasn't been used, and
    hasn't expired - otherwise returns None. Callers should treat "not
    found" and "expired/used" identically (don't leak which case it was).
    """
    session = Session()
    try:
        record = (
            session.query(PasswordResetToken)
            .filter(PasswordResetToken.token_hash == _hash_token(raw_token))
            .first()
        )
        if record is None:
            return None
        if record.used_at is not None or record.expires_at < datetime.utcnow():
            return None
        return record
    finally:
        session.close()


def mark_token_used(token_id):
    """Marks a token as redeemed so it can never be used again."""
    session = Session()
    try:
        record = session.query(PasswordResetToken).filter(PasswordResetToken.id == token_id).first()
        if record is None:
            return False
        record.used_at = datetime.utcnow()
        session.commit()
        return True
    finally:
        session.close()