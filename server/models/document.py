"""
Document model and CRUD functions.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship

from .database import Base, Session

STATUS_VISIBLE = 1
STATUS_HIDDEN = 0


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=True)
    size_bytes = Column(BigInteger, nullable=True)
    # 1 = visible (default), 0 = hidden (soft-deleted). Row and file both
    # stay on disk either way; "deleting" just flips this to 0.
    status = Column(Integer, nullable=False, default=STATUS_VISIBLE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="documents")
    events = relationship("UserEvent", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document id={self.id} filename={self.filename} status={self.status}>"


# ---------- CRUD ----------

def create_document(user_id, filename, file_path, mime_type=None, size_bytes=None):
    """Create and persist a new document with status=1 (visible). Returns the created Document."""
    session = Session()
    try:
        doc = Document(
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            mime_type=mime_type,
            size_bytes=size_bytes,
            status=STATUS_VISIBLE,
        )
        session.add(doc)
        session.commit()
        session.refresh(doc)
        return doc
    finally:
        session.close()


def get_document(document_id):
    """Fetch a single document by id, regardless of status. Returns Document or None."""
    session = Session()
    try:
        return session.query(Document).filter(Document.id == document_id).first()
    finally:
        session.close()


def get_documents_by_user(user_id, include_hidden=False):
    """
    Fetch documents owned by a given user. By default only status=1
    (visible) documents are returned; pass include_hidden=True to also
    get status=0 (hidden) ones. Returns a list of Document.
    """
    session = Session()
    try:
        query = session.query(Document).filter(Document.user_id == user_id)
        if not include_hidden:
            query = query.filter(Document.status == STATUS_VISIBLE)
        return query.all()
    finally:
        session.close()


def get_all_documents(include_hidden=False):
    """
    Fetch all documents. By default only status=1 (visible) documents
    are returned; pass include_hidden=True to also get status=0
    (hidden) ones. Returns a list of Document.
    """
    session = Session()
    try:
        query = session.query(Document)
        if not include_hidden:
            query = query.filter(Document.status == STATUS_VISIBLE)
        return query.all()
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
    """
    Soft-delete a document: sets status to 0 (hidden) rather than
    removing the row. The file on disk and the event history both
    stay intact. Returns True if found and hidden, False if not found.
    """
    session = Session()
    try:
        doc = session.query(Document).filter(Document.id == document_id).first()
        if doc is None:
            return False
        doc.status = STATUS_HIDDEN
        session.commit()
        return True
    finally:
        session.close()


def restore_document(document_id):
    """
    Undo a soft delete: sets status back to 1 (visible).
    Returns True if found and restored, False if not found.
    """
    session = Session()
    try:
        doc = session.query(Document).filter(Document.id == document_id).first()
        if doc is None:
            return False
        doc.status = STATUS_VISIBLE
        session.commit()
        return True
    finally:
        session.close()


def hard_delete_document(document_id):
    """
    Permanently removes a document row from the database (bypasses
    the soft-delete). Use sparingly, e.g. for admin cleanup jobs.
    Returns True if deleted, False if not found.
    """
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