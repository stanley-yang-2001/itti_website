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
import uuid

from flask import Flask, jsonify, abort, request, session
from flask_cors import CORS
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from models.database import Base, engine
from models.user import create_user, get_user, get_user_by_google_sub
from models.document import create_document, get_documents_by_user, get_document, delete_document
from models.user_event import create_user_event, get_events_by_user, CRUDAction

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
# Auth (Google Sign-In)
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
        user = create_user(google_sub=google_sub, email=email, name=name, picture_url=picture_url)

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
    is_visible to False rather than removing the file or DB row.
    Logs a DELETE event.
    """
    user_id = require_login()
    doc = get_document(document_id)
    if doc is None or doc.user_id != user_id or not doc.is_visible:
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