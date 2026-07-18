"""
UserEvent model and CRUD functions.

Logs CRUD actions users perform on documents. document_id is nullable
so events not tied to a document (e.g. a future login/logout event)
can still be logged without violating the FK.
"""

import enum
from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship

from .database import Base, Session


class CRUDAction(str, enum.Enum):
    CREATE = "CREATE"
    READ = "READ"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class UserEvent(Base):
    __tablename__ = "user_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True, index=True)
    action = Column(Enum(CRUDAction), nullable=False)
    event_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="events")
    document = relationship("Document", back_populates="events")

    def __repr__(self):
        return (
            f"<UserEvent id={self.id} user_id={self.user_id} "
            f"action={self.action} document_id={self.document_id}>"
        )


# ---------- CRUD ----------

def create_user_event(user_id, action, document_id=None, event_metadata=None):
    """Create and persist a new user event. Returns the created UserEvent."""
    session = Session()
    try:
        event = UserEvent(
            user_id=user_id,
            document_id=document_id,
            action=action,
            event_metadata=event_metadata,
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        return event
    finally:
        session.close()


def get_user_event(event_id):
    """Fetch a single event by id. Returns UserEvent or None."""
    session = Session()
    try:
        return session.query(UserEvent).filter(UserEvent.id == event_id).first()
    finally:
        session.close()


def get_events_by_user(user_id):
    """Fetch all events for a given user. Returns a list of UserEvent."""
    session = Session()
    try:
        return session.query(UserEvent).filter(UserEvent.user_id == user_id).all()
    finally:
        session.close()


def get_events_by_document(document_id):
    """Fetch all events for a given document. Returns a list of UserEvent."""
    session = Session()
    try:
        return session.query(UserEvent).filter(UserEvent.document_id == document_id).all()
    finally:
        session.close()


def get_all_user_events():
    """Fetch all events. Returns a list of UserEvent."""
    session = Session()
    try:
        return session.query(UserEvent).all()
    finally:
        session.close()


def update_user_event(event_id, **fields):
    """
    Update fields on an event (e.g. update_user_event(1, action=CRUDAction.DELETE)).
    Returns the updated UserEvent, or None if not found.
    """
    session = Session()
    try:
        event = session.query(UserEvent).filter(UserEvent.id == event_id).first()
        if event is None:
            return None
        for key, value in fields.items():
            if hasattr(event, key):
                setattr(event, key, value)
        session.commit()
        session.refresh(event)
        return event
    finally:
        session.close()


def delete_user_event(event_id):
    """Delete an event by id. Returns True if deleted, False if not found."""
    session = Session()
    try:
        event = session.query(UserEvent).filter(UserEvent.id == event_id).first()
        if event is None:
            return False
        session.delete(event)
        session.commit()
        return True
    finally:
        session.close()