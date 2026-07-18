"""
User model and CRUD functions.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship

from .database import Base, Session


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    google_sub = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, nullable=False, index=True)
    name = Column(String, nullable=True)
    picture_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    events = relationship("UserEvent", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"


# ---------- CRUD ----------

def create_user(google_sub, email, name=None, picture_url=None):
    """Create and persist a new user. Returns the created User."""
    session = Session()
    try:
        user = User(google_sub=google_sub, email=email, name=name, picture_url=picture_url)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
    finally:
        session.close()


def get_user(user_id):
    """Fetch a single user by id. Returns User or None."""
    session = Session()
    try:
        return session.query(User).filter(User.id == user_id).first()
    finally:
        session.close()


def get_user_by_google_sub(google_sub):
    """Fetch a single user by their Google sub. Returns User or None."""
    session = Session()
    try:
        return session.query(User).filter(User.google_sub == google_sub).first()
    finally:
        session.close()


def get_all_users():
    """Fetch all users. Returns a list of User."""
    session = Session()
    try:
        return session.query(User).all()
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
    """Delete a user by id. Returns True if deleted, False if not found."""
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