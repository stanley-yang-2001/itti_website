"""
SavedChart model and CRUD functions.

Backs the Observatory page's "save chart to profile" button: a chart
built in the data query tool is a client-side construct (selected data
panels + a chart type + a variable), so what's persisted here is just
that construct's JSON config, not raw country data (the country data
itself is re-fetched from /api/countries at render time). This keeps a
saved chart automatically current if the underlying source spreadsheet
is ever re-published with corrected numbers.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship

from .database import Base, Session


class SavedChart(Base):
    __tablename__ = "saved_charts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    # "ETTI", "GTBI", or "mixed" (panels from both indicators on one chart).
    indicator = Column(String(10), nullable=False)
    # JSON-encoded { chartType, variable, panels: [{indicator, countryCode, countryName, year}, ...] }
    config = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="saved_charts")

    def __repr__(self):
        return f"<SavedChart id={self.id} user_id={self.user_id} title={self.title!r}>"

    def to_dict(self):
        import json

        return {
            "id": self.id,
            "title": self.title,
            "indicator": self.indicator,
            "config": json.loads(self.config),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ---------- CRUD ----------

def create_saved_chart(user_id, title, indicator, config_json):
    """config_json is already-serialized JSON text. Returns the created SavedChart."""
    session = Session()
    try:
        chart = SavedChart(user_id=user_id, title=title, indicator=indicator, config=config_json)
        session.add(chart)
        session.commit()
        session.refresh(chart)
        return chart
    finally:
        session.close()


def get_saved_chart(chart_id):
    """Fetch a single saved chart by id. Returns SavedChart or None."""
    session = Session()
    try:
        return session.query(SavedChart).filter(SavedChart.id == chart_id).first()
    finally:
        session.close()


def get_saved_charts_by_user(user_id):
    """Fetch all saved charts owned by a user, most recent first."""
    session = Session()
    try:
        return (
            session.query(SavedChart)
            .filter(SavedChart.user_id == user_id)
            .order_by(SavedChart.created_at.desc())
            .all()
        )
    finally:
        session.close()


def delete_saved_chart(chart_id):
    """Permanently removes a saved chart row. Returns True if deleted, False if not found."""
    session = Session()
    try:
        chart = session.query(SavedChart).filter(SavedChart.id == chart_id).first()
        if chart is None:
            return False
        session.delete(chart)
        session.commit()
        return True
    finally:
        session.close()