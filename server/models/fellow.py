"""
Fellow model and CRUD functions.

Backs two things:
  - The public Fellowship page's roster (GET /api/fellows) - what used
    to be the hardcoded, permanently-empty FELLOWS array in
    client/src/data/fellowship.js.
  - The admin Control panel's "Fellows" section (POST/PUT
    /api/fellows...) - add a new fellow, or edit an existing one's
    bio/photo/level.

`level` must be one of FELLOW_LEVEL_CODES - the same AFITTI/FITTI/
SFITTI/DFITTI codes defined in client/src/data/fellowship.js's
FELLOW_LEVELS (kept in sync by hand, same as that file's own note
about staying in sync with FITTI_Executive_Deck.pdf - there's no
single source of truth shared between the two right now).

photo_path stores whatever storage.py's save() returned (a local disk
path, or an S3 key) - never the original filename, since app.py's
upload handler always re-encodes the photo to a normalized JPEG at a
fixed size before it ever reaches storage (see resize_and_normalize_photo()
in app.py), so there's nothing meaningful about the original name/format
worth keeping.
"""

from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, Text

from .database import Base, Session

FELLOW_LEVEL_CODES = ("AFITTI", "FITTI", "SFITTI", "DFITTI")


class Fellow(Base):
    __tablename__ = "fellows"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    level = Column(String(10), nullable=False)  # one of FELLOW_LEVEL_CODES
    bio = Column(Text, nullable=False, default="")
    photo_path = Column(String, nullable=True)  # storage.py path/key; None until a photo is uploaded
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Fellow id={self.id} name={self.name!r} level={self.level}>"

    def to_public_dict(self):
        """
        Shape the Fellowship page's <FellowCard> expects (see
        client/src/data/fellowship.js's FELLOWS docstring comment for
        the original static-data shape this mirrors: id, name, level,
        bio, photo). `photo` is a URL the frontend can put straight in
        an <img src>, not the raw storage path - the actual file only
        ever gets served back out through GET /api/fellows/<id>/photo,
        the same "path stored in DB, served through by id" pattern
        report images use (see get_report_image() in app.py).
        """
        return {
            "id": self.id,
            "name": self.name,
            "level": self.level,
            "bio": self.bio,
            "photo": f"/api/fellows/{self.id}/photo" if self.photo_path else None,
        }


# ---------- CRUD ----------

def create_fellow(name, level, bio="", photo_path=None):
    session = Session()
    try:
        fellow = Fellow(name=name, level=level, bio=bio, photo_path=photo_path)
        session.add(fellow)
        session.commit()
        session.refresh(fellow)
        return fellow
    finally:
        session.close()


def get_fellow(fellow_id):
    """Fetch a single fellow by id. Returns Fellow or None."""
    session = Session()
    try:
        return session.query(Fellow).filter(Fellow.id == fellow_id).first()
    finally:
        session.close()


def get_all_fellows():
    """
    Fetch every fellow, newest first. Not paginated: the roster is
    curated by hand through the admin Control panel (nothing ever
    bulk-inserts fellows), so unlike the tables in report.py/user.py,
    unbounded growth from user activity isn't a real risk here - see
    pagination.py's own docstring for that concern.
    """
    session = Session()
    try:
        return session.query(Fellow).order_by(Fellow.created_at.desc()).all()
    finally:
        session.close()


def update_fellow(fellow_id, name=None, level=None, bio=None, photo_path=None):
    """
    Updates only the fields passed (None means "leave as-is" for
    name/level/bio - there's no way to intentionally blank out a
    fellow's name or level through this function, which matches the
    admin edit form always sending the full current value back for any
    field it doesn't change). photo_path is different: pass the
    sentinel value False (not None) to explicitly clear an existing
    photo, since None here means "no new photo uploaded, keep the
    current one" - the same three-state need app.py's edit route has.
    Returns the updated Fellow, or None if no fellow has that id.
    """
    session = Session()
    try:
        fellow = session.query(Fellow).filter(Fellow.id == fellow_id).first()
        if fellow is None:
            return None
        if name is not None:
            fellow.name = name
        if level is not None:
            fellow.level = level
        if bio is not None:
            fellow.bio = bio
        if photo_path is False:
            fellow.photo_path = None
        elif photo_path is not None:
            fellow.photo_path = photo_path
        session.commit()
        session.refresh(fellow)
        return fellow
    finally:
        session.close()


def delete_fellow(fellow_id):
    """Permanently removes a fellow row. Returns True if deleted, False if not found."""
    session = Session()
    try:
        fellow = session.query(Fellow).filter(Fellow.id == fellow_id).first()
        if fellow is None:
            return False
        session.delete(fellow)
        session.commit()
        return True
    finally:
        session.close()