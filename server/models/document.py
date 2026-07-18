"""
Document model and CRUD functions.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship

from .database import Base, Session


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="documents")
    events = relationship("UserEvent", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document id={self.id} filename={self.filename}>"


# ---------- CRUD ----------

def create_document(user_id, filename, file_path, mime_type=None, size_bytes=None):
    """Create and persist a new document. Returns the created Document."""
    session = Session()
    try:
        doc = Document(
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            mime_type=mime_type,
            size_bytes=size_bytes,
        )
        session.add(doc)
        session.commit()
        session.refresh(doc)
        return doc
    finally:
        session.close()


def get_document(document_id):
    """Fetch a single document by id. Returns Document or None."""
    session = Session()
    try:
        return session.query(Document).filter(Document.id == document_id).first()
    finally:
        session.close()


def get_documents_by_user(user_id):
    """Fetch all documents owned by a given user. Returns a list of Document."""
    session = Session()
    try:
        return session.query(Document).filter(Document.user_id == user_id).all()
    finally:
        session.close()


def get_all_documents():
    """Fetch all documents. Returns a list of Document."""
    session = Session()
    try:
        return session.query(Document).all()
    finally:
        session.close()


def update_document(document_id, **fields):
    """
    Update fields on a document (e.g. update_document(1, filename="new.pdf")).
    Returns the updated Document, or None if not found.
    """
    session = Session()
    try:
        doc = session.query(Document).filter(Document.id == document_id).first()
        if doc is None:
            return None
        for key, value in fields.items():
            if hasattr(doc, key):
                setattr(doc, key, value)
        session.commit()
        session.refresh(doc)
        return doc
    finally:
        session.close()


def delete_document(document_id):
    """Delete a document by id. Returns True if deleted, False if not found."""
    session = Session()
    try:
        doc = session.query(Document).filter(Document.id == document_id).first()
        if doc is None:
            return False
        session.delete(doc)
        session.commit()
        return True
    finally:
        session.close()