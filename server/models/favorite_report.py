"""
FavoriteReport model and CRUD functions.

Lets a logged-in user bookmark a Report (from its card on the Reports
page) for quick access later from their Profile. Mirrors saved_chart.py's
shape: a thin join row rather than a denormalized copy of the report, so
a favorite always reflects the report's current title/review_status
instead of a stale snapshot from whenever it was favorited.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint

from .database import Base, Session


class FavoriteReport(Base):
    __tablename__ = "favorite_reports"
    __table_args__ = (
        UniqueConstraint("user_id", "report_id", name="uq_favorite_reports_user_report"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<FavoriteReport user_id={self.user_id} report_id={self.report_id}>"


# ---------- CRUD ----------

def add_favorite_report(user_id, report_id):
    """Idempotent: returns the existing favorite if one's already there, otherwise creates it."""
    session = Session()
    try:
        existing = (
            session.query(FavoriteReport)
            .filter(FavoriteReport.user_id == user_id, FavoriteReport.report_id == report_id)
            .first()
        )
        if existing:
            return existing
        fav = FavoriteReport(user_id=user_id, report_id=report_id)
        session.add(fav)
        session.commit()
        session.refresh(fav)
        return fav
    finally:
        session.close()


def remove_favorite_report(user_id, report_id):
    """Returns True if a favorite was found and removed, False if none existed."""
    session = Session()
    try:
        fav = (
            session.query(FavoriteReport)
            .filter(FavoriteReport.user_id == user_id, FavoriteReport.report_id == report_id)
            .first()
        )
        if fav is None:
            return False
        session.delete(fav)
        session.commit()
        return True
    finally:
        session.close()


def get_favorite_report_ids(user_id):
    """A set of report_ids the user has favorited - cheap for the frontend to check membership against."""
    session = Session()
    try:
        rows = session.query(FavoriteReport.report_id).filter(FavoriteReport.user_id == user_id).all()
        return {r[0] for r in rows}
    finally:
        session.close()


def get_favorite_reports_by_user(user_id):
    """
    Returns the user's favorited Report rows, most-recently-favorited
    first. Joins through favorite_reports rather than returning the join
    rows themselves, since callers want the reports' own data
    (to_public_dict()), not the join table's.
    """
    from .report import Report  # local import: avoids a report.py <-> favorite_report.py circular import

    session = Session()
    try:
        rows = (
            session.query(Report)
            .join(FavoriteReport, FavoriteReport.report_id == Report.id)
            .filter(FavoriteReport.user_id == user_id)
            .order_by(FavoriteReport.created_at.desc())
            .all()
        )
        return rows
    finally:
        session.close()