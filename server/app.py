"""
ITTI backend — Flask API

Serves:
  GET /api/world-data        -> full TopoJSON world topology (countries)
  GET /api/countries         -> dict of all country metric records, keyed by
                                 3-digit ISO numeric code (matches TopoJSON
                                 feature.id, zero-padded)
  GET /api/countries/<code>  -> single country's metric record

All country metrics (GTBI / ETTI / EVS / TIE / PDL / ITS) currently live as
placeholders (0) in data/country_data.json. Swap that file's values — or
point load_country_data() at a real datasource/DB — once live figures are
available; nothing else needs to change.
"""
import json
import os
import re
import uuid

from flask import Flask, jsonify, abort, request, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from models.database import Base, engine
from models.user import create_user, get_user, get_user_by_google_sub, get_user_by_email, update_user, delete_user
from models.document import create_document, get_documents_by_user, get_document, delete_document
from models.user_event import create_user_event, get_events_by_user, CRUDAction

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
WORLD_DATA_PATH = os.path.join(DATA_DIR, "world-110m.json")
COUNTRY_DATA_PATH = os.path.join(DATA_DIR, "country_data.json")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

# Set this to the Client ID from your Google Cloud OAuth credentials.
# Put it in an env var in production rather than hardcoding it.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-me")
CORS(app, supports_credentials=True)  # allow the React dev server (different port) to call this API, with cookies

# Create all tables on startup if they don't exist yet.
Base.metadata.create_all(engine)
os.makedirs(UPLOAD_DIR, exist_ok=True)


def current_user_id():
    """Returns the logged-in user's id from the session, or None."""
    return session.get("user_id")


def require_login():
    """Aborts with 401 if no user is logged in. Returns the user_id otherwise."""
    user_id = current_user_id()
    if user_id is None:
        abort(401, description="Not logged in")
    return user_id


def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/api/world-data")
def get_world_data():
    """Raw TopoJSON topology used to draw the globe."""
    return jsonify(load_json(WORLD_DATA_PATH))


@app.get("/api/countries")
def get_countries():
    """All country metric records, keyed by zero-padded ISO numeric code."""
    return jsonify(load_json(COUNTRY_DATA_PATH))


@app.get("/api/countries/<code>")
def get_country(code):
    """A single country's metric record."""
    data = load_json(COUNTRY_DATA_PATH)
    record = data.get(code.zfill(3)) or data.get(code)
    if record is None:
        abort(404, description=f"No data for country code '{code}'")
    return jsonify(record)


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


# ---------------------------------------------------------------------------
# Auth (Google Sign-In + email/password)
# ---------------------------------------------------------------------------

@app.post("/api/auth/google")
def auth_google():
    """
    Body: { "credential": "<Google ID token JWT from the frontend button>" }
    Verifies the token with Google, creates the user if new, and starts
    a Flask session (cookie-based).
    """
    body = request.get_json(silent=True) or {}
    credential = body.get("credential")
    if not credential:
        abort(400, description="Missing 'credential' in request body")

    try:
        claims = id_token.verify_oauth2_token(
            credential, google_requests.Request(), GOOGLE_CLIENT_ID
        )
    except ValueError:
        abort(401, description="Invalid Google credential")

    google_sub = claims["sub"]
    email = claims.get("email")
    name = claims.get("name")
    picture_url = claims.get("picture")

    user = get_user_by_google_sub(google_sub)
    if user is None:
        # An account with this email may already exist from an email/password
        # sign-up. Link the Google identity to it rather than erroring, since
        # email is unique and it's the same person.
        user = get_user_by_email(email)
        if user is not None:
            update_user(user.id, google_sub=google_sub, name=user.name or name, picture_url=user.picture_url or picture_url)
            user = get_user(user.id)
        else:
            user = create_user(google_sub=google_sub, email=email, name=name, picture_url=picture_url)

    session["user_id"] = user.id

    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
    })


@app.post("/api/auth/signup")
def auth_signup():
    """
    Body: { "email": "...", "password": "...", "name": "..." (optional) }
    Creates a new email/password account. Returns 409 if the email is
    already taken.
    """
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip() or None

    if not email or not EMAIL_RE.match(email):
        abort(400, description="A valid email is required")
    if len(password) < 8:
        abort(400, description="Password must be at least 8 characters")

    if get_user_by_email(email) is not None:
        abort(409, description="An account with this email already exists")

    password_hash = generate_password_hash(password)
    user = create_user(email=email, password_hash=password_hash, name=name)

    session["user_id"] = user.id

    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
    }), 201


@app.post("/api/auth/login")
def auth_login():
    """
    Body: { "email": "...", "password": "..." }
    Logs in with an email/password account created via /api/auth/signup.
    """
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    user = get_user_by_email(email)
    if user is None or not user.password_hash or not check_password_hash(user.password_hash, password):
        abort(401, description="Invalid email or password")

    session["user_id"] = user.id

    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
    })


@app.get("/api/auth/me")
def auth_me():
    """Returns the logged-in user, or 401 if no session."""
    user_id = require_login()
    user = get_user(user_id)
    if user is None:
        # Account no longer visible (e.g. soft-deleted) - clear the stale session.
        session.pop("user_id", None)
        abort(404, description="User not found")
    return jsonify({
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
    })


@app.post("/api/auth/logout")
def auth_logout():
    session.pop("user_id", None)
    return jsonify({"status": "logged out"})


@app.delete("/api/auth/me")
def delete_account():
    """
    Soft-deletes the logged-in user's account: sets status to 0
    (hidden) rather than removing the row. Their documents and event
    history stay intact. Logs the deletion as a DELETE event, then
    clears the session.
    """
    user_id = require_login()
    delete_user(user_id)
    create_user_event(user_id=user_id, document_id=None, action=CRUDAction.DELETE)
    session.pop("user_id", None)
    return jsonify({"status": "account deleted"})


# ---------------------------------------------------------------------------
# Documents (upload / list / delete), with CRUD events logged for each action
# ---------------------------------------------------------------------------

@app.post("/api/documents")
def upload_document():
    """Uploads a file for the logged-in user and logs a CREATE event."""
    user_id = require_login()

    if "file" not in request.files:
        abort(400, description="No file part in request")
    file = request.files["file"]
    if file.filename == "":
        abort(400, description="No file selected")

    user_dir = os.path.join(UPLOAD_DIR, str(user_id))
    os.makedirs(user_dir, exist_ok=True)

    # Prefix with a uuid to avoid collisions/overwrites from same-named uploads.
    stored_name = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(user_dir, stored_name)
    file.save(file_path)
    size_bytes = os.path.getsize(file_path)

    doc = create_document(
        user_id=user_id,
        filename=file.filename,
        file_path=file_path,
        mime_type=file.mimetype,
        size_bytes=size_bytes,
    )
    create_user_event(user_id=user_id, document_id=doc.id, action=CRUDAction.CREATE)

    return jsonify({
        "id": doc.id,
        "filename": doc.filename,
        "mime_type": doc.mime_type,
        "size_bytes": doc.size_bytes,
    }), 201


@app.get("/api/documents")
def list_documents():
    """Lists the logged-in user's documents and logs a READ event."""
    user_id = require_login()
    docs = get_documents_by_user(user_id)
    create_user_event(user_id=user_id, document_id=None, action=CRUDAction.READ)
    return jsonify([
        {
            "id": d.id,
            "filename": d.filename,
            "mime_type": d.mime_type,
            "size_bytes": d.size_bytes,
            "created_at": d.created_at.isoformat(),
        }
        for d in docs
    ])


@app.delete("/api/documents/<int:document_id>")
def remove_document(document_id):
    """
    Soft-deletes a document owned by the logged-in user: flips
    status to 0 (hidden) rather than removing the file or DB row.
    Logs a DELETE event.
    """
    user_id = require_login()
    doc = get_document(document_id)
    if doc is None or doc.user_id != user_id or doc.status == 0:
        abort(404, description="Document not found")

    delete_document(document_id)
    create_user_event(user_id=user_id, document_id=document_id, action=CRUDAction.DELETE)

    return jsonify({"status": "deleted", "id": document_id})


@app.get("/api/events")
def list_events():
    """Lists the logged-in user's event history."""
    user_id = require_login()
    events = get_events_by_user(user_id)
    return jsonify([
        {
            "id": e.id,
            "document_id": e.document_id,
            "action": e.action.value,
            "created_at": e.created_at.isoformat(),
        }
        for e in events
    ])


if __name__ == "__main__":
    app.run(debug=True, port=5000)