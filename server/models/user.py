"""
User model and CRUD functions.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from .database import Base, Session

STATUS_VISIBLE = 1
STATUS_HIDDEN = 0


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    # Nullable because a user may sign up with email/password instead of Google.
    google_sub = Column(String, unique=True, nullable=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    # Nullable because a user may sign up with Google instead of a password.
    password_hash = Column(String, nullable=True)
    name = Column(String, nullable=True)
    picture_url = Column(String, nullable=True)
    # 1 = visible/active (default), 0 = hidden (soft-deleted account).
    # The row is never removed; "deleting" an account just flips this to 0.
    status = Column(Integer, nullable=False, default=STATUS_VISIBLE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    events = relationship("UserEvent", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email} status={self.status}>"


# ---------- CRUD ----------

def create_user(email, google_sub=None, password_hash=None, name=None, picture_url=None):
    """
    Create and persist a new user with status=1 (visible). Either
    google_sub (Google sign-in) or password_hash (email/password
    sign-up) should be provided, but this isn't enforced at the DB
    level so both auth methods can share a table. Returns the created
    User.
    """
    session = Session()
    try:
        user = User(
            google_sub=google_sub,
            email=email,
            password_hash=password_hash,
            name=name,
            picture_url=picture_url,
            status=STATUS_VISIBLE,
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


def get_user(user_id, include_hidden=False):
    """
    Fetch a single user by id. By default only a status=1 (visible)
    user is returned; pass include_hidden=True to also match status=0
    (hidden) users. Returns User or None.
    """
    session = Session()
    try:
        query = session.query(User).filter(User.id == user_id)
        if not include_hidden:
            query = query.filter(User.status == STATUS_VISIBLE)
        return query.first()
    finally:
        session.close()


def get_user_by_google_sub(google_sub, include_hidden=False):
    """
    Fetch a single user by their Google sub. By default only a status=1
    (visible) user is returned. Returns User or None.
    """
    session = Session()
    try:
        query = session.query(User).filter(User.google_sub == google_sub)
        if not include_hidden:
            query = query.filter(User.status == STATUS_VISIBLE)
        return query.first()
    finally:
        session.close()


def get_user_by_email(email, include_hidden=False):
    """
    Fetch a single user by email. By default only a status=1 (visible)
    user is returned. Returns User or None.
    """
    session = Session()
    try:
        query = session.query(User).filter(User.email == email)
        if not include_hidden:
            query = query.filter(User.status == STATUS_VISIBLE)
        return query.first()
    finally:
        session.close()


def get_all_users(include_hidden=False):
    """
    Fetch all users. By default only status=1 (visible) users are
    returned; pass include_hidden=True to also get status=0 (hidden)
    ones. Returns a list of User.
    """
    session = Session()
    try:
        query = session.query(User)
        if not include_hidden:
            query = query.filter(User.status == STATUS_VISIBLE)
        return query.all()
    finally:
        session.close()


def update_user(user_id, **fields):
    """
    Update fields on a user (e.g. update_user(1, name="New Name")).
    Returns the updated User, or None if not found.
    """
    session = Session()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if user is None:
            return None
        for key, value in fields.items():
            if hasattr(user, key):
                setattr(user, key, value)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


def delete_user(user_id):
    """
    Soft-delete a user: sets status to 0 (hidden) rather than removing
    the row. Their documents and event history both stay intact.
    Returns True if found and hidden, False if not found.
    """
    session = Session()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if user is None:
            return False
        user.status = STATUS_HIDDEN
        session.commit()
        return True
    finally:
        session.close()


def restore_user(user_id):
    """
    Undo a soft delete: sets status back to 1 (visible).
    Returns True if found and restored, False if not found.
    """
    session = Session()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if user is None:
            return False
        user.status = STATUS_VISIBLE
        session.commit()
        return True
    finally:
        session.close()


def hard_delete_user(user_id):
    """
    Permanently removes a user row from the database (bypasses the
    soft-delete). Use sparingly, e.g. for admin cleanup or GDPR-style
    erasure requests. Returns True if deleted, False if not found.
    """
    session = Session()
    try:
        user = session.query(User).filter(User.id == user_id).first()
        if user is None:
            return False
        session.delete(user)
        session.commit()
        return True
    finally:
        session.close()