"""
Route-level access control.

This app authenticates via a server-side session (a signed cookie set in
/api/auth/google or /api/auth/login — see app.py), not a bearer token, so
these decorators read from `flask.session` rather than a JWT.

Usage:

    @app.get("/api/documents")
    @login_required
    def list_documents():
        ...

    @app.post("/api/documents")
    @roles_required("publisher")
    def upload_document():
        ...
"""
from functools import wraps

from flask import jsonify, session

from models.user import get_user


def get_current_user():
    """Return the logged-in User, or None. Safe to call from any route.
    Only ever returns a status=visible user — get_user() already filters
    out soft-deleted accounts by default."""
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_user(user_id)


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if get_current_user() is None:
            return jsonify({"error": "authentication required"}), 401
        return fn(*args, **kwargs)

    return wrapper


def roles_required(*roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            if user is None:
                return jsonify({"error": "authentication required"}), 401
            if user.role not in roles:
                return jsonify({"error": "insufficient permissions"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator