"""
validation.py

Centralized input validation for the Flask API. Every check exists so
that "the user submitted something we should reject" produces a clear,
specific, SAFE message (never raw exception text or other server
internals) instead of either a raw 500 or an unhelpful generic 400.

HOW TO ADD A NEW CHECK
-----------------------
1. Write a function shaped like:

       def check_something(value):
           '''One-line description of what this rejects.'''
           if <bad condition>:
               return "A specific, user-safe message explaining why."
           return None  # None means "this value is fine"

2. Register it in CHECKS below under a short name.
3. Call it from a route:

       error = run_check("something", value)
       if error:
           abort(400, description=error)

   ...or, to validate several fields at once and want the FIRST
   failure:

       error = validate_all([
           ("title", title),
           ("description", description),
       ])
       if error:
           abort(400, description=error)
"""

import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

MAX_TITLE_LENGTH = 200
MAX_DESCRIPTION_LENGTH = 2000
MAX_RESUBMISSION_NOTE_LENGTH = 2000
MAX_REVIEW_COMMENT_LENGTH = 2000
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128


def check_email(value):
    if not value or not value.strip():
        return "Email is required."
    if len(value) > 254:
        return "Email address is too long."
    if not EMAIL_RE.match(value.strip()):
        return "Enter a valid email address."
    return None


def check_password(value):
    if not value:
        return "Password is required."
    if len(value) < MIN_PASSWORD_LENGTH:
        return f"Password must be at least {MIN_PASSWORD_LENGTH} characters."
    if len(value) > MAX_PASSWORD_LENGTH:
        return f"Password must be under {MAX_PASSWORD_LENGTH} characters."
    return None


def check_report_title(value):
    """Rejects an empty or unreasonably long report title."""
    if value is None or not value.strip():
        return "Title is required."
    if len(value) > MAX_TITLE_LENGTH:
        return f"Title must be under {MAX_TITLE_LENGTH} characters."
    return None


def check_report_description(value):
    """Rejects an empty or unreasonably long report description."""
    if value is None or not value.strip():
        return "Description is required."
    if len(value) > MAX_DESCRIPTION_LENGTH:
        return f"Description must be under {MAX_DESCRIPTION_LENGTH} characters."
    return None


def check_resubmission_note(value):
    """Optional field - blank/omitted is fine, but length-capped if provided."""
    if value is None or not value.strip():
        return None
    if len(value) > MAX_RESUBMISSION_NOTE_LENGTH:
        return f"Resubmission note must be under {MAX_RESUBMISSION_NOTE_LENGTH} characters."
    return None


def check_review_comment(value):
    """
    Only validates LENGTH, not presence - "required for reject" is
    enforced in models/report_review.py's record_review(), since that
    depends on the decision (approve vs reject), which this
    single-value check has no access to.
    """
    if value is None or not value.strip():
        return None
    if len(value) > MAX_REVIEW_COMMENT_LENGTH:
        return f"Comment must be under {MAX_REVIEW_COMMENT_LENGTH} characters."
    return None


CHECKS = {
    "email": check_email,
    "password": check_password,
    "report_title": check_report_title,
    "report_description": check_report_description,
    "resubmission_note": check_resubmission_note,
    "review_comment": check_review_comment,
}


def run_check(check_name, value):
    """Looks up a check by name and runs it. Returns None (valid) or an error message."""
    check_fn = CHECKS.get(check_name)
    if check_fn is None:
        raise KeyError(f"No such validation check: '{check_name}'")
    return check_fn(value)


def validate_all(fields):
    """
    fields: list of (check_name, value) tuples. Runs each in order,
    returning the FIRST error message encountered (or None if every
    field passes).
    """
    for check_name, value in fields:
        error = run_check(check_name, value)
        if error:
            return error
    return None