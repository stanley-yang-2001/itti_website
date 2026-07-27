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

import stripe
from dotenv import load_dotenv
from flask import Flask, jsonify, abort, request, session, send_file
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
    update_user, delete_user, restore_user, STATUS_HIDDEN,
    ROLE_ADMIN, ROLE_PUBLISHER,
)
from models.document import (
    create_document, get_documents_by_user, get_document, delete_document,
    hard_delete_document,
)
from models.report import (
    create_report, get_report, get_published_reports, get_pending_reports,
    get_changes_requested_reports, get_reports_by_uploader,
    delete_report, hard_delete_report, resubmit_report,
)
from models.report_review import record_review, get_reviews_for_report, ReviewError
from models.user_event import create_user_event, get_events_by_user, CRUDAction
from models.password_reset_token import create_reset_token, get_valid_token, mark_token_used
from models.saved_chart import (
    create_saved_chart, get_saved_chart, get_saved_charts_by_user, delete_saved_chart,
)
from models.donation import (
    create_donation, get_donation, get_donation_by_confirmation_code,
    get_donation_by_checkout_session, attach_checkout_session,
    finalize_succeeded_donation, mark_donation_failed,
)
from storage import get_storage
from email_backend import get_email_backend, send_password_reset_email, send_donation_confirmation_email
import validation

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

# Donations (Stripe Checkout). STRIPE_SECRET_KEY is required for the
# donate flow to work at all; STRIPE_WEBHOOK_SECRET is required to trust
# incoming webhook calls as genuinely from Stripe (without it the
# /api/donations/webhook route refuses every request rather than trusting
# unsigned payloads). Get both from the Stripe Dashboard - API keys page
# for the secret key, Webhooks page (after adding an endpoint pointing at
# /api/donations/webhook) for the webhook signing secret.
STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY

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
    if not STRIPE_SECRET_KEY:
        missing.append("STRIPE_SECRET_KEY")
    if not STRIPE_WEBHOOK_SECRET:
        missing.append("STRIPE_WEBHOOK_SECRET")
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
REPORTS_UPLOAD_DIR = os.path.join(BASE_DIR, "report_uploads")
report_storage = get_storage(REPORTS_UPLOAD_DIR, s3_prefix="reports")
email_backend = get_email_backend()

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20 MB per file
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".csv", ".txt", ".png", ".jpg", ".jpeg"}

# Reports only accept a PDF or Word doc as the report itself, and a
# real image (if provided at all) as the cover picture - narrower than
# the general document upload above, since these are the two specific
# file roles the Reports page actually renders.
ALLOWED_REPORT_FILE_EXTENSIONS = {".pdf", ".doc", ".docx"}
ALLOWED_REPORT_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_REPORT_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB per cover image


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
    # Normalize the same way /api/auth/signup and /api/auth/login do. Google
    # claims are almost always already lowercase, but that's not guaranteed
    # (e.g. some Workspace/custom-domain accounts) - without this, a casing
    # mismatch would bypass the email lookup below and silently create a
    # second account instead of linking to the existing one.
    email = (claims.get("email") or "").strip().lower()
    name = claims.get("name")
    picture_url = claims.get("picture")

    # include_hidden=True on both lookups: a soft-deleted account (google_sub
    # or email) would otherwise be invisible here, and create_user() below
    # would then crash on the unique google_sub/email constraint instead of
    # reactivating the existing row.
    user = get_user_by_google_sub(google_sub, include_hidden=True)
    if user is None:
        # An account with this email may already exist from an email/password
        # sign-up. Link the Google identity to it rather than erroring, since
        # email is unique and it's the same person.
        user = get_user_by_email(email, include_hidden=True)
        if user is not None:
            update_user(user.id, google_sub=google_sub, name=user.name or name, picture_url=user.picture_url or picture_url)
        else:
            user = create_user(google_sub=google_sub, email=email, name=name, picture_url=picture_url)

    if user.status == STATUS_HIDDEN:
        # They previously deleted this account; signing back in (Google or
        # password) is treated as an intentional reactivation rather than a
        # dead end.
        restore_user(user.id)
        logger.info("google login reactivated soft-deleted user_id=%s", user.id)

    user = get_user(user.id)

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
    Returns 409 if the email belongs to an active account. If the email
    belongs to a previously soft-deleted account instead, reactivates it
    with the new name/password rather than erroring - their old
    documents/event history come back with it.
    """
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    name = (body.get("name") or "").strip() or None

    if not email or not EMAIL_RE.match(email):
        abort(400, description="A valid email is required")
    if len(password) < 8:
        abort(400, description="Password must be at least 8 characters")

    # include_hidden=True: a previously-deleted account with this email
    # still holds the row (soft delete never removes it), and the unique
    # constraint on email means a plain create_user() call below would
    # otherwise crash with an IntegrityError instead of a clean response.
    existing = get_user_by_email(email, include_hidden=True)
    if existing is not None:
        if existing.status != STATUS_HIDDEN:
            abort(409, description="An account with this email already exists")

        # They previously deleted this account. Treat signing up again with
        # the same email as reactivating it (with the new password/name)
        # rather than a dead end - their old documents/event history are
        # still attached to this same row and come back with it.
        password_hash = generate_password_hash(password)
        update_user(existing.id, password_hash=password_hash, name=name or existing.name)
        restore_user(existing.id)
        user = get_user(existing.id)
        logger.info("signup reactivated soft-deleted user_id=%s", user.id)
    else:
        password_hash = generate_password_hash(password)
        user = create_user(email=email, password_hash=password_hash, name=name)
        logger.info("signup user_id=%s", user.id)

    session.clear()
    session["user_id"] = user.id
    session.permanent = True

    return jsonify(user.to_public_dict()), 201


@app.post("/api/auth/login")
@limiter.limit("10 per minute")
def auth_login():
    """
    Body: { "email": "...", "password": "..." }
    Logs in with an email/password account created via /api/auth/signup.
    If the account was previously soft-deleted, a correct password
    reactivates it rather than being rejected.
    """
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    # include_hidden=True: without this a soft-deleted account can never log
    # back in at all (get_user_by_email would silently act as if no account
    # existed), even with the correct password and no way to recover it.
    user = get_user_by_email(email, include_hidden=True)
    if user is None or not user.password_hash or not check_password_hash(user.password_hash, password):
        abort(401, description="Invalid email or password")

    if user.status == STATUS_HIDDEN:
        # Correct password proves ownership, so treat this as an intentional
        # reactivation rather than leaving the account permanently locked
        # out - same behavior as signing up again or via Google (see those
        # handlers). Their documents/event history are still attached to
        # this same row and come back with it.
        restore_user(user.id)
        user = get_user(user.id)
        logger.info("login reactivated soft-deleted user_id=%s", user.id)

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


# ---------------------------------------------------------------------------
# Reports (public content: title, description, a PDF/DOCX, an optional
# cover image) with a peer-review workflow gating what's public.
#
#   pending_review --(3 distinct approvals, not from the uploader)--> published
#   pending_review --(any single reject, with a required comment)--> changes_requested
#   changes_requested --(uploader resubmits)--> pending_review, version += 1
#
# Only PUBLISHED reports are visible to the general public. pending_review
# and changes_requested reports are only visible to their own uploader or
# to a publisher/admin (the reviewer pool) - see _can_view_report below.
# ---------------------------------------------------------------------------

def _can_view_report(report, user):
    """
    True if `user` (may be None, i.e. a guest) is allowed to see this
    report at all. Published+visible reports are public. Anything else
    (pending_review, changes_requested, or soft-deleted) is only
    visible to the report's own uploader or to a publisher/admin -
    i.e. the same pool of people who can act on it.
    """
    if report.status != 1:
        return user is not None and (user.role == ROLE_ADMIN)
    if report.review_status == "published":
        return True
    if user is None:
        return False
    return user.id == report.uploaded_by or user.role in (ROLE_PUBLISHER, ROLE_ADMIN)


@app.get("/api/reports")
def list_reports():
    """All PUBLISHED, visible reports, newest first. Public - no login required."""
    reports = get_published_reports()
    return jsonify([r.to_public_dict() for r in reports])


@app.get("/api/reports/pending")
@roles_required("publisher", "admin")
def list_pending_reports_route():
    """Reports awaiting review, oldest first. Peer Review page - publisher/admin only."""
    reports = get_pending_reports()
    return jsonify([r.to_public_dict() for r in reports])


@app.get("/api/reports/changes-requested")
@roles_required("publisher", "admin")
def list_changes_requested_reports_route():
    """
    Reports sent back to their uploader for changes, most recently
    updated first. Shown in a separate section of the Peer Review page
    per product decision - visible to reviewers, but not part of
    anyone's active review queue until the uploader resubmits.
    """
    reports = get_changes_requested_reports()
    return jsonify([r.to_public_dict() for r in reports])


@app.get("/api/reports/<int:report_id>")
def get_report_route(report_id):
    """A single report's metadata. Public only once published; otherwise
    restricted to the uploader or a publisher/admin - see _can_view_report."""
    report = get_report(report_id)
    if report is None:
        abort(404, description="Report not found")
    user = get_current_user()
    if not _can_view_report(report, user):
        abort(404, description="Report not found")
    return jsonify(report.to_public_dict())


@app.get("/api/reports/<int:report_id>/file")
def download_report_file(report_id):
    """Streams/redirects to the report's actual PDF/DOCX. Same visibility rule as get_report_route."""
    report = get_report(report_id)
    if report is None:
        abort(404, description="Report not found")
    user = get_current_user()
    if not _can_view_report(report, user):
        abort(404, description="Report not found")
    return report_storage.get_file_response(report.file_path, download_name=report.original_filename)


@app.get("/api/reports/<int:report_id>/image")
def get_report_image(report_id):
    """Streams/redirects to the report's cover image, if one was provided. Same visibility rule as get_report_route."""
    report = get_report(report_id)
    if report is None or report.image_path is None:
        abort(404, description="No image for this report")
    user = get_current_user()
    if not _can_view_report(report, user):
        abort(404, description="No image for this report")
    return report_storage.get_file_response(
        report.image_path, download_name=f"report-{report.id}-cover", mimetype=report.image_mime_type
    )


def _save_report_upload(user_id, file, image):
    """
    Shared file-handling logic for both a first upload and a
    resubmission: validates extensions/sizes, saves via report_storage,
    and cleans up the report file if the image is rejected afterward.
    Returns (file_path, file_type, file_size_bytes, original_filename,
    image_path, image_mime_type) - image fields are None if no image
    was provided.
    """
    if file is None or file.filename == "":
        abort(400, description="No file selected")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_REPORT_FILE_EXTENSIONS:
        abort(400, description="Reports must be a PDF or Word document (.pdf, .doc, .docx)")

    file.stream.seek(0, os.SEEK_END)
    size = file.stream.tell()
    file.stream.seek(0)
    if size > MAX_UPLOAD_BYTES:
        abort(400, description=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)}MB limit")
    if size == 0:
        abort(400, description="File is empty")

    file_path, file_size_bytes = report_storage.save(user_id, file.filename, file)
    file_type = ext.lstrip(".")

    image_path = None
    image_mime_type = None
    if image is not None and image.filename != "":
        image_ext = os.path.splitext(image.filename)[1].lower()
        if image_ext not in ALLOWED_REPORT_IMAGE_EXTENSIONS:
            report_storage.delete(file_path)
            abort(400, description="Cover image must be a PNG, JPG, or WEBP file")

        image.stream.seek(0, os.SEEK_END)
        image_size = image.stream.tell()
        image.stream.seek(0)
        if image_size > MAX_REPORT_IMAGE_BYTES:
            report_storage.delete(file_path)
            abort(400, description=f"Cover image exceeds the {MAX_REPORT_IMAGE_BYTES // (1024 * 1024)}MB limit")

        image_path, _ = report_storage.save(user_id, image.filename, image)
        image_mime_type = image.mimetype

    return file_path, file_type, file_size_bytes, file.filename, image_path, image_mime_type


@app.post("/api/reports")
@roles_required("publisher", "admin")
@limiter.limit("20 per hour")
def upload_report():
    """
    Multipart form fields:
      - "title": string, required
      - "description": string, required
      - "file": the report itself, .pdf/.doc/.docx, required
      - "image": an optional cover image (.png/.jpg/.jpeg/.webp)

    Lands as review_status=pending_review - it appears on the Peer
    Review page, not the public Reports page, until it clears review.
    """
    user = get_current_user()

    title = (request.form.get("title") or "").strip()
    description = (request.form.get("description") or "").strip()

    error = validation.validate_all([
        ("report_title", title),
        ("report_description", description),
    ])
    if error:
        abort(400, description=error)

    if "file" not in request.files:
        abort(400, description="No file part in request")

    file_path, file_type, file_size_bytes, original_filename, image_path, image_mime_type = (
        _save_report_upload(user.id, request.files["file"], request.files.get("image"))
    )

    report = create_report(
        uploaded_by=user.id,
        title=title,
        description=description,
        file_path=file_path,
        file_type=file_type,
        original_filename=original_filename,
        file_size_bytes=file_size_bytes,
        image_path=image_path,
        image_mime_type=image_mime_type,
    )
    create_user_event(user_id=user.id, document_id=None, action=CRUDAction.CREATE)
    logger.info("report uploaded id=%s by user_id=%s", report.id, user.id)

    return jsonify(report.to_public_dict()), 201


@app.post("/api/reports/<int:report_id>/resubmit")
@roles_required("publisher", "admin")
@limiter.limit("20 per hour")
def resubmit_report_route(report_id):
    """
    Multipart form fields (title/description/resubmission_note
    optional; file required - a resubmission always brings a file,
    even if unchanged):
      - "title", "description": string
      - "resubmission_note": string, optional note to reviewers about
        what changed, addressing their rejection comment
      - "file": a new .pdf/.doc/.docx, required
      - "image": an optional new cover image

    Only usable by the report's own uploader, and only while it's in
    changes_requested. Bumps version and resets to pending_review.
    """
    user = get_current_user()
    report = get_report(report_id)
    if report is None or report.uploaded_by != user.id:
        abort(404, description="Report not found")
    if report.review_status != "changes_requested":
        abort(400, description="This report isn't awaiting a resubmission.")

    title = request.form.get("title")
    description = request.form.get("description")
    resubmission_note = request.form.get("resubmission_note")

    if title is not None:
        error = validation.run_check("report_title", title.strip())
        if error:
            abort(400, description=error)
        title = title.strip()
    if description is not None:
        error = validation.run_check("report_description", description.strip())
        if error:
            abort(400, description=error)
        description = description.strip()
    if resubmission_note is not None:
        error = validation.run_check("resubmission_note", resubmission_note.strip())
        if error:
            abort(400, description=error)
        resubmission_note = resubmission_note.strip() or None

    if "file" not in request.files:
        abort(400, description="No file part in request")

    file_path, file_type, file_size_bytes, original_filename, image_path, image_mime_type = (
        _save_report_upload(user.id, request.files["file"], request.files.get("image"))
    )

    updated = resubmit_report(
        report_id,
        title=title,
        description=description,
        resubmission_note=resubmission_note,
        file_path=file_path,
        file_type=file_type,
        original_filename=original_filename,
        file_size_bytes=file_size_bytes,
        image_path=image_path,
        image_mime_type=image_mime_type,
    )
    logger.info("report resubmitted id=%s by user_id=%s new_version=%s", report_id, user.id, updated.version)

    return jsonify(updated.to_public_dict())


@app.post("/api/reports/<int:report_id>/review")
@roles_required("publisher", "admin")
@limiter.limit("60 per hour")
def review_report_route(report_id):
    """
    Body: { "decision": "approve" | "reject", "comment": "..." }
    comment is required when decision is "reject", optional otherwise.
    All the actual rules (can't review your own report, report must be
    pending_review, 3rd approval auto-publishes) are enforced in
    models/report_review.record_review() - this route just translates
    its ReviewError into a 400.
    """
    user = get_current_user()
    body = request.get_json(silent=True) or {}
    decision = (body.get("decision") or "").strip().lower()
    comment = (body.get("comment") or "").strip() or None

    if comment is not None:
        error = validation.run_check("review_comment", comment)
        if error:
            abort(400, description=error)

    try:
        updated_report = record_review(report_id, user.id, decision, comment)
    except ReviewError as e:
        abort(400, description=str(e))

    create_user_event(user_id=user.id, document_id=None, action=CRUDAction.UPDATE)
    logger.info("report review id=%s reviewer_id=%s decision=%s -> review_status=%s",
                report_id, user.id, decision, updated_report.review_status)

    return jsonify(updated_report.to_public_dict())


@app.get("/api/reports/<int:report_id>/reviews")
@roles_required("publisher", "admin")
def list_report_reviews_route(report_id):
    """All review decisions for a report (every version, newest first). Publisher/admin only."""
    report = get_report(report_id)
    if report is None:
        abort(404, description="Report not found")
    reviews = get_reviews_for_report(report_id)
    return jsonify([r.to_public_dict() for r in reviews])


@app.delete("/api/reports/<int:report_id>")
@roles_required("publisher", "admin")
def remove_report(report_id):
    """
    Soft-deletes a report: flips status to 0 (hidden) rather than
    removing the files or DB row. Publishers may only remove their own
    reports; admins may remove any.
    """
    user = get_current_user()
    report = get_report(report_id)
    if report is None or report.status == 0:
        abort(404, description="Report not found")
    if report.uploaded_by != user.id and user.role != ROLE_ADMIN:
        abort(404, description="Report not found")  # same as "not found" - don't reveal it exists but isn't theirs

    delete_report(report_id)
    create_user_event(user_id=user.id, document_id=None, action=CRUDAction.DELETE)
    return jsonify({"status": "deleted", "id": report_id})


@app.delete("/api/reports/<int:report_id>/permanent")
@roles_required("admin")
def remove_report_permanently(report_id):
    """Admin-only. Permanently deletes a report: removes the DB row and both underlying files."""
    report = get_report(report_id)
    if report is None:
        abort(404, description="Report not found")

    report_storage.delete(report.file_path)
    if report.image_path:
        report_storage.delete(report.image_path)
    hard_delete_report(report_id)

    logger.warning("hard delete report_id=%s by admin_id=%s", report_id, get_current_user().id)
    return jsonify({"status": "permanently deleted", "id": report_id})


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


# ---------------------------------------------------------------------------
# Observatory saved charts - lets a logged-in user save a chart built in the
# Observatory's data query tool to their profile, and re-list it later. Only
# the chart's config (indicator/variable/chart type/which country-year
# panels) is stored; the actual figures are re-read from /api/countries at
# render time, so a saved chart always reflects the latest published data.
# ---------------------------------------------------------------------------

MAX_SAVED_CHARTS_PER_USER = 200


@app.post("/api/observatory/saved-charts")
@login_required
def save_observatory_chart():
    user = get_current_user()
    body = request.get_json(silent=True) or {}

    title = (body.get("title") or "").strip()
    indicator = (body.get("indicator") or "").strip()
    config = body.get("config")

    if not title:
        abort(400, description="A chart title is required")
    if indicator not in {"ETTI", "GTBI", "mixed"}:
        abort(400, description="indicator must be 'ETTI', 'GTBI', or 'mixed'")
    if not isinstance(config, dict):
        abort(400, description="config must be an object")

    existing = get_saved_charts_by_user(user.id)
    if len(existing) >= MAX_SAVED_CHARTS_PER_USER:
        abort(400, description=f"You can save at most {MAX_SAVED_CHARTS_PER_USER} charts")

    chart = create_saved_chart(
        user_id=user.id,
        title=title,
        indicator=indicator,
        config_json=json.dumps(config),
    )
    return jsonify(chart.to_dict()), 201


@app.get("/api/observatory/saved-charts")
@login_required
def list_observatory_charts():
    user = get_current_user()
    charts = get_saved_charts_by_user(user.id)
    return jsonify([c.to_dict() for c in charts])


@app.delete("/api/observatory/saved-charts/<int:chart_id>")
@login_required
def remove_observatory_chart(chart_id):
    user = get_current_user()
    chart = get_saved_chart(chart_id)
    if chart is None or chart.user_id != user.id:
        abort(404, description="Saved chart not found")

    delete_saved_chart(chart_id)
    return jsonify({"status": "deleted", "id": chart_id})


# ---------------------------------------------------------------------------
# Donations - Stripe Checkout. Open to anyone, logged in or not.
#
# Flow:
#   1. POST /api/donations/checkout-session creates a "pending" Donation
#      row (so a confirmation_code exists up front) and a Stripe Checkout
#      Session with automatic_payment_methods enabled - Stripe itself
#      decides which methods to actually offer (card, Cash App Pay,
#      Link, US bank debit, etc.) based on the amount, currency, and
#      what's turned on in the Stripe Dashboard, so nothing here has to
#      hardcode a payment method list.
#   2. The browser is redirected to Stripe's hosted checkout_url. On
#      success, Stripe redirects back to /donate/thank-you?session_id=...
#   3. Two independent paths both funnel through the same
#      finalize_succeeded_donation() (models/donation.py), which is safe
#      to call twice for one donation:
#        a. POST /api/donations/webhook - Stripe's own server-to-server
#           notification, the authoritative path in production.
#        b. GET /api/donations/session/<session_id> - called by the
#           thank-you page itself, so the flow still works end-to-end in
#           local dev with no public webhook URL configured at all.
#      Whichever one gets there first sends the confirmation email
#      (guarded by finalize_succeeded_donation's just_finalized flag) -
#      the other is a no-op.
# ---------------------------------------------------------------------------

DONATION_PRESETS_CENTS = [2500, 5000, 10000, 25000]  # $25 / $50 / $100 / $250
DONATION_CURRENCY = "usd"


@app.get("/api/donations/presets")
def get_donation_presets():
    """Preset donation amounts (in cents), so the frontend never hardcodes them separately."""
    return jsonify({"presets_cents": DONATION_PRESETS_CENTS, "currency": DONATION_CURRENCY})


@app.post("/api/donations/checkout-session")
@limiter.limit("20 per hour")
def create_donation_checkout_session():
    if not STRIPE_SECRET_KEY:
        abort(503, description="Donations aren't configured on this server yet. Please try again later.")

    body = request.get_json(silent=True) or {}
    first_name = (body.get("first_name") or "").strip()
    last_name = (body.get("last_name") or "").strip()
    email = (body.get("email") or "").strip()
    amount_cents = body.get("amount_cents")

    error = (
        validation.check_donor_name(first_name, "First name")
        or validation.check_donor_name(last_name, "Last name")
        or validation.run_check("email", email)
        or validation.check_donation_amount(amount_cents)
    )
    if error:
        abort(400, description=error)

    donation = create_donation(first_name, last_name, email, amount_cents, currency=DONATION_CURRENCY)

    try:
        checkout_session = stripe.checkout.Session.create(
            mode="payment",
            automatic_payment_methods={"enabled": True},
            customer_email=email,
            line_items=[{
                "price_data": {
                    "currency": DONATION_CURRENCY,
                    "product_data": {
                        "name": "Donation to the International Truth & Trauma Institute",
                        "description": f"Confirmation {donation.confirmation_code}",
                    },
                    "unit_amount": amount_cents,
                },
                "quantity": 1,
            }],
            metadata={
                "donation_id": str(donation.id),
                "confirmation_code": donation.confirmation_code,
            },
            success_url=f"{CLIENT_ORIGIN}/donate/thank-you?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{CLIENT_ORIGIN}/donate?canceled=1",
        )
    except stripe.StripeError as e:
        logger.warning("Stripe checkout session creation failed for donation_id=%s: %s", donation.id, e)
        mark_donation_failed(donation.id)
        abort(502, description="We couldn't reach our payment processor. Please try again in a moment.")

    attach_checkout_session(donation.id, checkout_session.id)

    return jsonify({
        "checkout_url": checkout_session.url,
        "confirmation_code": donation.confirmation_code,
    }), 201


def _finalize_from_stripe_session(stripe_session):
    """
    Shared by the webhook and the thank-you page's status check: given a
    Stripe Checkout Session object that's already known to be paid, looks
    up the matching Donation by its metadata and finalizes it. Sends the
    confirmation email exactly once (only on the call that actually
    transitions the row from pending -> succeeded).
    """
    donation_id = (stripe_session.get("metadata") or {}).get("donation_id")
    if not donation_id:
        logger.warning("Stripe session %s has no donation_id in metadata", stripe_session.get("id"))
        return None

    payment_intent = stripe_session.get("payment_intent")
    payment_intent_id = payment_intent if isinstance(payment_intent, str) else (payment_intent or {}).get("id")

    donation, just_finalized = finalize_succeeded_donation(
        int(donation_id),
        stripe_payment_intent_id=payment_intent_id,
        payment_method_types=stripe_session.get("payment_method_types"),
    )
    if donation and just_finalized:
        try:
            send_donation_confirmation_email(email_backend, donation)
        except Exception:
            # The donation itself is already recorded as succeeded either
            # way - a failed email send shouldn't look like a failed
            # donation to the donor, so this is logged, not raised.
            logger.exception("Failed to send donation confirmation email for donation_id=%s", donation.id)
    return donation


@app.post("/api/donations/webhook")
def stripe_donation_webhook():
    """
    Stripe's server-to-server notification - NOT a browser request, so it
    intentionally isn't behind login/CORS/session logic. Authenticity is
    verified via Stripe's signature scheme instead (STRIPE_WEBHOOK_SECRET),
    which is why this reads the raw body rather than request.get_json().
    """
    if not STRIPE_WEBHOOK_SECRET:
        abort(503, description="Webhook not configured")

    payload = request.get_data()
    sig_header = request.headers.get("Stripe-Signature", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.SignatureVerificationError):
        logger.warning("Rejected donation webhook: invalid payload or signature")
        abort(400, description="Invalid signature")

    if event["type"] == "checkout.session.completed":
        stripe_session = event["data"]["object"]
        if stripe_session.get("payment_status") == "paid":
            _finalize_from_stripe_session(stripe_session)

    return jsonify({"received": True})


@app.get("/api/donations/session/<session_id>")
@limiter.limit("60 per hour")
def get_donation_by_session(session_id):
    """
    Called by the thank-you page right after a Stripe redirect. Re-checks
    the session with Stripe directly and finalizes the donation if it's
    paid but the webhook hasn't landed yet (or isn't configured at all,
    e.g. local dev) - see _finalize_from_stripe_session for why this is
    safe to run alongside the webhook rather than in place of it.
    """
    if not STRIPE_SECRET_KEY:
        abort(503, description="Donations aren't configured on this server yet.")

    try:
        stripe_session = stripe.checkout.Session.retrieve(session_id)
    except stripe.StripeError:
        abort(404, description="Donation session not found")

    if stripe_session.get("payment_status") == "paid":
        donation = _finalize_from_stripe_session(stripe_session)
    else:
        donation = get_donation_by_checkout_session(session_id)

    if donation is None:
        abort(404, description="Donation not found")

    return jsonify(donation.to_dict())


if __name__ == "__main__":
    app.run(debug=not IS_PRODUCTION, port=5000)