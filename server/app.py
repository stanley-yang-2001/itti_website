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
point load_json() at a real datasource/DB — once live figures are
available; nothing else needs to change.

Auth (Google Sign-In + email/password), server-side session:
  POST /api/auth/google      -> verify a Google ID token, create/find user, start session
  POST /api/auth/signup      -> create an email/password account (always basic tier)
  POST /api/auth/login       -> log in with email/password
  GET  /api/auth/me          -> current session's user record
  POST /api/auth/logout      -> clear session
  DELETE /api/auth/me        -> soft-delete the logged-in user's account

Documents (upload / list / delete), with CRUD events logged for each
action. Uploading/deleting requires the "publisher" tier
(see decorators.py + docs/ACCESS_LEVELS.md); listing your own documents
and event history just requires being logged in. Permanent (hard) delete
is admin-only.
"""
import logging
import json
import os
import re

from dotenv import load_dotenv
from flask import Flask, jsonify, abort, request, session
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException
from werkzeug.security import generate_password_hash, check_password_hash
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from decorators import get_current_user, login_required, roles_required
from models.database import Base, DATABASE_URL, engine
from models.user import (
    create_user, get_user, get_user_by_google_sub, get_user_by_email,
    update_user, delete_user, ROLE_ADMIN,
)
from models.document import (
    create_document, get_documents_by_user, get_document, delete_document,
    hard_delete_document,
)
from models.user_event import create_user_event, get_events_by_user, CRUDAction
from models.password_reset_token import create_reset_token, get_valid_token, mark_token_used
from storage import get_storage
from email_backend import get_email_backend, send_password_reset_email

# Loads the repo-root .env (same file vite.config.js reads for
# GOOGLE_CLIENT_ID) so `python app.py` picks up the same values without
# needing them exported manually every time.
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("itti")

# Optional error tracking - completely inert unless SENTRY_DSN is set, so
# this is safe to leave in for local dev with no Sentry account at all.
SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration

    sentry_sdk.init(dsn=SENTRY_DSN, integrations=[FlaskIntegration()], traces_sample_rate=0.1)
    logger.info("Sentry error tracking enabled")

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
WORLD_DATA_PATH = os.path.join(DATA_DIR, "world-110m.json")
COUNTRY_DATA_PATH = os.path.join(DATA_DIR, "country_data.json")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")

IS_PRODUCTION = os.environ.get("FLASK_ENV") == "production"

# Set this to the Client ID from your Google Cloud OAuth credentials.
# Put it in the repo-root .env in production rather than hardcoding it.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
CLIENT_ORIGIN = os.environ.get("CLIENT_ORIGIN", "http://localhost:5173")

FLASK_SECRET_KEY = os.environ.get("FLASK_SECRET_KEY", "dev-secret-change-me")

# Refuse to boot with dev-default secrets in production - a misconfigured
# env var here is exactly the kind of mistake that's invisible until
# someone exploits it. Fails loudly and immediately instead.
if IS_PRODUCTION:
    missing = []
    if FLASK_SECRET_KEY == "dev-secret-change-me":
        missing.append("FLASK_SECRET_KEY")
    if not GOOGLE_CLIENT_ID:
        missing.append("GOOGLE_CLIENT_ID")
    if missing:
        raise RuntimeError(
            f"FLASK_ENV=production but these required env vars are unset/using dev "
            f"defaults: {', '.join(missing)}. Refusing to start."
        )

app = Flask(__name__)
app.secret_key = FLASK_SECRET_KEY

# Session cookie: Lax is fine for localhost:5173 <-> localhost:5000 (same
# registrable domain, different port = "same-site" for cookie purposes).
# If frontend and backend end up on different domains in production this
# needs SameSite=None + Secure instead - see docs/ACCESS_LEVELS.md.
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.config["SESSION_COOKIE_SECURE"] = IS_PRODUCTION
app.config["SESSION_COOKIE_HTTPONLY"] = True

# Hard cap on request body size (defends against giant uploads before
# they ever reach our own MAX_UPLOAD_BYTES check below).
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024  # 25 MB

# supports_credentials + an explicit origin (not a wildcard) is required
# for the session cookie to actually be sent/accepted cross-port in the
# browser. CLIENT_ORIGIN still needs updating to the real frontend domain
# once one exists - that part isn't code-solvable yet.
CORS(app, supports_credentials=True, origins=[CLIENT_ORIGIN])

limiter = Limiter(get_remote_address, app=app, storage_uri="memory://", default_limits=[])


@app.after_request
def set_security_headers(response):
    """Baseline hardening headers. This is a JSON API (not serving HTML
    pages), so CSP is locked down hard by default."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    if request.is_secure:
        response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
    return response


@app.errorhandler(429)
def handle_rate_limit_exceeded(e):
    """
    Flask-Limiter's default description for a 429 is its internal rate
    spec string (e.g. "10 per 1 minute") - accurate but not a sentence
    a visitor should have to parse. Swaps in a plain-language message;
    the specific limit that was hit is logged instead, for whoever's
    debugging.
    """
    logger.info("Rate limit exceeded on %s %s", request.method, request.path)
    return jsonify({
        "error": "Too Many Requests",
        "description": "Too many attempts. Please wait a bit before trying again.",
    }), 429


@app.errorhandler(HTTPException)
def handle_http_exception(e):
    """
    Flask/Werkzeug's default behavior for abort(...) is an HTML error
    page, not JSON. Every fetch() caller on the frontend does
    res.json().catch(() => ({})), so without this handler every
    abort(status, description="...") in this file is invisible to the
    UI - the real message gets silently discarded and every component
    falls back to its own generic hardcoded string instead. This makes
    every abort() response JSON, so the description text set throughout
    this file actually reaches the person using the site.
    description is always a short, safe, hand-written string at every
    call site in this file - never raw exception text (see
    globe_data.WorkbookValidationError and validation.py for the
    pattern to follow when adding new checks).
    """
    return jsonify({"error": e.name, "description": e.description}), e.code


@app.errorhandler(Exception)
def handle_uncaught_exception(e):
    """
    Catches anything NOT already handled above or by a route's own
    try/except - a real bug, a DB hiccup, etc. Logs the full exception
    server-side and returns one generic message, regardless of debug
    mode. Without this, an uncaught exception under app.run(debug=True)
    serves Werkzeug's interactive debugger over HTTP: full stack trace,
    source snippets, local variable values, and a remote code execution
    console, to anyone who triggers it.
    """
    logger.exception("Unhandled exception on %s %s", request.method, request.path)
    return jsonify({"error": "internal server error", "description": "Something went wrong. Please try again."}), 500


# Local SQLite dev DB: auto-create tables so `python app.py` just works
# with zero setup. Any real database (DATABASE_URL set, e.g. Postgres) is
# expected to be managed via migrations instead - see migrations/README
# and `alembic upgrade head`, run once before first boot and again after
# pulling any change with a new revision.
if DATABASE_URL.startswith("sqlite"):
    Base.metadata.create_all(engine)

storage = get_storage(UPLOAD_DIR)
email_backend = get_email_backend()

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB per file
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".txt", ".png", ".jpg", ".jpeg"}


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
    Verifies the token with Google, creates the user if new (always at
    ROLE_BASIC), and starts a Flask session (cookie-based).
    """
    body = request.get_json(silent=True) or {}
    credential = body.get("credential")
    if not credential:
        abort(400, description="Missing 'credential' in request body")

    if not GOOGLE_CLIENT_ID:
        abort(500, description="Server is missing GOOGLE_CLIENT_ID configuration")

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

    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    logger.info("google login user_id=%s", user.id)
    return jsonify(user.to_public_dict())


@app.post("/api/auth/signup")
@limiter.limit("5 per hour")
def auth_signup():
    """
    Body: { "email": "...", "password": "...", "name": "..." (optional) }
    Creates a new email/password account, always at ROLE_BASIC (see
    models/user.py) - nothing in this request can set a different role.
    Returns 409 if the email is already taken.
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

    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    logger.info("signup user_id=%s", user.id)
    return jsonify(user.to_public_dict()), 201


@app.post("/api/auth/login")
@limiter.limit("10 per minute")
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

    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    return jsonify(user.to_public_dict())


@app.post("/api/auth/forgot-password")
@limiter.limit("5 per hour")
def forgot_password():
    """
    Body: { "email": "..." }
    Always returns the same generic message regardless of whether the
    email is registered - this deliberately doesn't reveal which emails
    have accounts. If the account exists, a reset link is emailed via
    the configured backend (console-logged in dev by default, see
    email_backend.py).
    """
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()

    generic_response = jsonify({
        "message": "If an account exists for that email, a password reset link has been sent."
    })

    if not email or not EMAIL_RE.match(email):
        return generic_response

    user = get_user_by_email(email)
    if user is not None:
        raw_token = create_reset_token(user.id)
        reset_link = f"{CLIENT_ORIGIN}/reset-password?token={raw_token}"
        send_password_reset_email(email_backend, user.email, reset_link)
        logger.info("password reset requested user_id=%s", user.id)

    return generic_response


@app.post("/api/auth/reset-password")
@limiter.limit("10 per hour")
def reset_password():
    """
    Body: { "token": "...", "password": "..." }
    Redeems a reset token (single-use, expires after 1 hour - see
    models/password_reset_token.py) and sets a new password. Works even
    for accounts that only ever signed in with Google, since it's just
    setting password_hash - they'd gain the ability to also log in with
    a password afterward.
    """
    body = request.get_json(silent=True) or {}
    token = body.get("token") or ""
    password = body.get("password") or ""

    if len(password) < 8:
        abort(400, description="Password must be at least 8 characters")

    record = get_valid_token(token)
    if record is None:
        abort(400, description="This reset link is invalid or has expired")

    update_user(record.user_id, password_hash=generate_password_hash(password))
    mark_token_used(record.id)

    user = get_user(record.user_id)
    if user is None:
        abort(404, description="User not found")

    # Log them in immediately - they just proved account ownership via email.
    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    logger.info("password reset completed user_id=%s", user.id)
    return jsonify(user.to_public_dict())


@app.get("/api/auth/me")
@login_required
def auth_me():
    """Returns the logged-in user, or 401 if no session."""
    user = get_current_user()
    if user is None:
        session.pop("user_id", None)
        abort(404, description="User not found")
    return jsonify(user.to_public_dict())


@app.post("/api/auth/logout")
def auth_logout():
    session.pop("user_id", None)
    return jsonify({"status": "logged out"})


@app.delete("/api/auth/me")
@login_required
def delete_account():
    """
    Soft-deletes the logged-in user's account: sets status to 0
    (hidden) rather than removing the row. Their documents and event
    history stay intact. Logs the deletion as a DELETE event, then
    clears the session.
    """
    user = get_current_user()
    delete_user(user.id)
    create_user_event(user_id=user.id, document_id=None, action=CRUDAction.DELETE)
    session.pop("user_id", None)
    return jsonify({"status": "account deleted"})


# ---------------------------------------------------------------------------
# Documents (upload / list / delete), with CRUD events logged for each action
# ---------------------------------------------------------------------------

@app.post("/api/documents")
@roles_required("publisher", "admin")
def upload_document():
    """Uploads a file for the logged-in publisher and logs a CREATE event."""
    user = get_current_user()

    if "file" not in request.files:
        abort(400, description="No file part in request")
    file = request.files["file"]
    if file.filename == "":
        abort(400, description="No file selected")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        abort(400, description=f"File type '{ext or 'unknown'}' is not allowed")

    # Measure size without loading the whole file into memory.
    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > MAX_UPLOAD_BYTES:
        abort(400, description=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit")
    if size == 0:
        abort(400, description="File is empty")

    file_path, size_bytes = storage.save(user.id, file.filename, file)

    doc = create_document(
        user_id=user.id,
        filename=file.filename,
        file_path=file_path,
        mime_type=file.mimetype,
        size_bytes=size_bytes,
    )
    create_user_event(user_id=user.id, document_id=doc.id, action=CRUDAction.CREATE)

    return jsonify({
        "id": doc.id,
        "filename": doc.filename,
        "mime_type": doc.mime_type,
        "size_bytes": doc.size_bytes,
    }), 201


@app.get("/api/documents")
@login_required
def list_documents():
    """Lists the logged-in user's documents and logs a READ event."""
    user = get_current_user()
    docs = get_documents_by_user(user.id)
    create_user_event(user_id=user.id, document_id=None, action=CRUDAction.READ)
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
@roles_required("publisher", "admin")
def remove_document(document_id):
    """
    Soft-deletes a document owned by the logged-in publisher: flips
    status to 0 (hidden) rather than removing the file or DB row.
    Logs a DELETE event. For permanent removal see
    DELETE /api/documents/<id>/permanent (admin-only).
    """
    user = get_current_user()
    doc = get_document(document_id)
    if doc is None or doc.user_id != user.id or doc.status == 0:
        abort(404, description="Document not found")

    delete_document(document_id)
    create_user_event(user_id=user.id, document_id=document_id, action=CRUDAction.DELETE)

    return jsonify({"status": "deleted", "id": document_id})


@app.delete("/api/documents/<int:document_id>/permanent")
@roles_required("admin")
def remove_document_permanently(document_id):
    """
    Admin-only. Permanently deletes a document: removes the DB row (and,
    via cascade, its events) AND the underlying file/object. This is
    the route that finally wires up models/document.py's
    hard_delete_document, previously unused - see remaining_work.docx.
    """
    doc = get_document(document_id)
    if doc is None:
        abort(404, description="Document not found")

    storage.delete(doc.file_path)
    hard_delete_document(document_id)

    logger.warning("hard delete document_id=%s by admin_id=%s", document_id, get_current_user().id)
    return jsonify({"status": "permanently deleted", "id": document_id})


@app.get("/api/events")
@login_required
def list_events():
    """Lists the logged-in user's event history."""
    user = get_current_user()
    events = get_events_by_user(user.id)
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
    app.run(debug=not IS_PRODUCTION, port=5000)