"""
Report model and CRUD functions.

Reports are public site content (unlike Document, which is a user's
private uploaded files) - a publisher uploads a title, description, a
PDF/DOCX file, and an optional cover image, and every visitor can browse
and download the result on the Reports page. Soft-delete (status)
follows the same convention as Document: hiding a report never deletes
the underlying file or its row, just flips visibility.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, BigInteger
from sqlalchemy.orm import relationship

from .database import Base, Session

STATUS_VISIBLE = 1
STATUS_HIDDEN = 0


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)

    file_path = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "pdf" or "docx", derived from the upload's extension
    file_size_bytes = Column(BigInteger, nullable=True)
    original_filename = Column(String, nullable=False)

    # All nullable: the cover image is optional at upload time.
    image_path = Column(String, nullable=True)
    image_mime_type = Column(String, nullable=True)

    # 1 = visible (default), 0 = hidden (soft-deleted). Row and files
    # both stay in storage either way; "deleting" just flips this to 0.
    status = Column(Integer, nullable=False, default=STATUS_VISIBLE, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    uploader = relationship("User")

    def __repr__(self):
        return f"<Report id={self.id} title={self.title!r} status={self.status}>"

    def to_public_dict(self):
        """Fields safe to send to the client for the Reports page."""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "file_type": self.file_type,
            "file_size_bytes": self.file_size_bytes,
            "original_filename": self.original_filename,
            "has_image": self.image_path is not None,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------- CRUD ----------

def create_report(uploaded_by, title, description, file_path, file_type,
                   original_filename, file_size_bytes=None,
                   image_path=None, image_mime_type=None):
    """Create and persist a new report with status=1 (visible). Returns the created Report."""
    session = Session()
    try:
        report = Report(
            uploaded_by=uploaded_by,
            title=title,
            description=description,
            file_path=file_path,
            file_type=file_type,
            original_filename=original_filename,
            file_size_bytes=file_size_bytes,
            image_path=image_path,
            image_mime_type=image_mime_type,
            status=STATUS_VISIBLE,
        )
        session.add(report)
        session.commit()
        session.refresh(report)
        return report
    finally:
        session.close()


def get_report(report_id):
    """Fetch a single report by id, regardless of status. Returns Report or None."""
    session = Session()
    try:
        return session.query(Report).filter(Report.id == report_id).first()
    finally:
        session.close()


def get_all_reports(include_hidden=False):
    """
    Fetch all reports, newest first. By default only status=1 (visible)
    reports are returned; pass include_hidden=True to also get status=0
    (hidden) ones. Returns a list of Report.
    """
    session = Session()
    try:
        query = session.query(Report)
        if not include_hidden:
            query = query.filter(Report.status == STATUS_VISIBLE)
        return query.order_by(Report.created_at.desc()).all()
    finally:
        session.close()


def get_reports_by_uploader(user_id, include_hidden=False):
    """Fetch reports uploaded by a given user, newest first. Returns a list of Report."""
    session = Session()
    try:
        query = session.query(Report).filter(Report.uploaded_by == user_id)
        if not include_hidden:
            query = query.filter(Report.status == STATUS_VISIBLE)
        return query.order_by(Report.created_at.desc()).all()
    finally:
        session.close()


def delete_report(report_id):
    """
    Soft-delete a report: sets status to 0 (hidden) rather than removing
    the row. The files on disk/storage both stay intact. Returns True if
    found and hidden, False if not found.
    """
    session = Session()
    try:
        report = session.query(Report).filter(Report.id == report_id).first()
        if report is None:
            return False
        report.status = STATUS_HIDDEN
        session.commit()
        return True
    finally:
        session.close()


def restore_report(report_id):
    """Undo a soft delete: sets status back to 1 (visible). Returns True if found and restored."""
    session = Session()
    try:
        report = session.query(Report).filter(Report.id == report_id).first()
        if report is None:
            return False
        report.status = STATUS_VISIBLE
        session.commit()
        return True
    finally:
        session.close()


def hard_delete_report(report_id):
    """
    Permanently removes a report row from the database (bypasses the
    soft-delete). Use sparingly, e.g. for admin cleanup jobs. Returns
    True if deleted, False if not found.
    """
    session = Session()
    try:
        report = session.query(Report).filter(Report.id == report_id).first()
        if report is None:
            return False
        session.delete(report)
        session.commit()
        return True
    finally:
        session.close()