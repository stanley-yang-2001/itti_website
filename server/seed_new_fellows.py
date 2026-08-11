"""
One-off seed script: inserts Blessing Ojisor, Hannah Toth, and Stanley
Yang as real rows in the `fellows` table.

Why this exists: Fellows used to be the static FELLOWS array in
client/src/data/fellowship.js. That array still has these three
entries, but Fellowship.jsx no longer reads it - fellows are now
admin-managed (Profile > Control > Fellows) and served live from the
database via GET /api/fellows. Without this script (or manually
re-entering them through the Control panel), these three fellows
simply don't appear on the site anymore.

Run once, from the server/ directory, with the same DATABASE_URL /
STORAGE_BACKEND env the app itself uses (defaults to the local SQLite
app.db and local disk storage if unset - same as `python app.py`):

    cd server
    python seed_new_fellows.py

Safe to re-run: it skips any fellow whose name already exists in the
table instead of creating a duplicate.

Photos are read from client/public/images/fellows/ and pushed through
the exact same image_processing.normalize_photo() + storage.save()
path app.py's POST /api/fellows route uses, so the resulting rows are
indistinguishable from ones created by hand through the Control panel.
"""

import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # server/
sys.path.insert(0, BASE_DIR)

from werkzeug.datastructures import FileStorage  # noqa: E402

import image_processing  # noqa: E402
from storage import get_storage  # noqa: E402
from models.database import Base, engine  # noqa: E402
from models.fellow import Fellow, Session, create_fellow  # noqa: E402

REPO_ROOT = os.path.dirname(BASE_DIR)
PHOTOS_DIR = os.path.join(REPO_ROOT, "client", "public", "images", "fellows")
FELLOWS_UPLOAD_DIR = os.path.join(BASE_DIR, "fellow_uploads")

NEW_FELLOWS = [
    {
        "name": "Blessing Alims Ojisor",
        "level": "AFITTI",
        "photo_file": "blessing-ojisor.jpg",
        "bio": (
            "Blessing Alims Ojisor is an Associate Fellow with the International Truth & Trauma Institute, "
            "bringing a background in Peace Studies and Conflict Resolution to trauma informed governance and "
            "institutional reform. She made history and emerged as a First-Class-Honors best-graduating student "
            "and the first female president of the Student Union Government at the University of Calabar, "
            "Nigeria in the institution's 49th year, a portfolio that demonstrates her commitment to challenging "
            "entrenched systems.\n\n"
            "Through years of community development work, most notably as founder of the Bagori Care Foundation, "
            "along with structural governance experience, she now advances ITTI's mission by turning research "
            "into strategic interventions for national healing, civic stabilization, and gender inclusive policy."
        ),
    },
    {
        "name": "Hannah Toth",
        "level": "AFITTI",
        "photo_file": "hannah-toth.jpg",
        "bio": (
            "Hannah Toth is an Associate Fellow with the International Truth & Trauma Institute, working within "
            "the Collective Psych Trauma Observatory under Dr. Luke Chike Igweobi. Her work focuses on building "
            "quantitative frameworks for measuring collective trauma and election-related violence, including "
            "contributions to the Global Trauma Burden Index and Election Trauma Temperature Index.\n\n"
            "As a clinical psychology student and Division I collegiate runner, she brings the same discipline "
            "she applies to training to her research: grounded in evidence, methodical, and committed to clear, "
            "accurate data. Her interests span clinical psychology, PTSD, trauma, and public health disparities, "
            "and she is currently working on manuscripts that position collective trauma frameworks within "
            "clinical psychology as she prepares to pursue a PhD in the field."
        ),
    },
    {
        "name": "Stanley Yang",
        "level": "AFITTI",
        "photo_file": "stanley-yang.jpg",
        "bio": (
            "Stanley Yang is an Associate Fellow with the International Truth & Trauma Institute and a graduate "
            "of the University of Illinois Urbana-Champaign (UIUC). He has supported the Institute's research "
            "infrastructure by assisting in data collection for the Election Trauma Temperature Index (ETTI) "
            "Observatory, contributing to the quantitative foundation behind ITTI's trauma measurement "
            "frameworks.\n\n"
            "Beyond his research contributions, Stanley built ITTI's website, bringing technical expertise to "
            "the Institute's public-facing platform and helping ensure its research, observatories, and "
            "programs are accessible to a global audience.\n\n"
            "Driven and ambitious, Stanley is always looking ahead, eager to take on new opportunities and "
            "challenges that push him to grow and to expand the impact he can bring to ITTI's mission."
        ),
    },
]


def main():
    # Same as app.py's own startup: for local SQLite, just create any
    # missing tables rather than requiring `alembic upgrade head` first.
    if str(engine.url).startswith("sqlite"):
        Base.metadata.create_all(engine)

    fellow_storage = get_storage(FELLOWS_UPLOAD_DIR, s3_prefix="fellows")

    session = Session()
    try:
        existing_names = {f.name for f in session.query(Fellow).all()}
    finally:
        session.close()

    for entry in NEW_FELLOWS:
        if entry["name"] in existing_names:
            print(f"skip (already exists): {entry['name']}")
            continue

        photo_path = None
        photo_file = os.path.join(PHOTOS_DIR, entry["photo_file"])
        if os.path.isfile(photo_file):
            with open(photo_file, "rb") as fh:
                normalized_bytes, mimetype = image_processing.normalize_photo(fh)
            normalized = FileStorage(
                stream=__import__("io").BytesIO(normalized_bytes),
                filename="photo.jpg",
                content_type=mimetype,
            )
            photo_path, _size = fellow_storage.save("fellows", normalized.filename, normalized)
        else:
            print(f"warning: photo not found for {entry['name']} at {photo_file}, creating without one")

        fellow = create_fellow(name=entry["name"], level=entry["level"], bio=entry["bio"], photo_path=photo_path)
        print(f"created: id={fellow.id} name={fellow.name!r} level={fellow.level} photo={'yes' if photo_path else 'no'}")


if __name__ == "__main__":
    main()