# Access levels — how they work and how to extend them

## Identity vs. access tier — two separate things

- **Identity** comes from either Google Sign-In (`POST /api/auth/google`)
  or email/password (`POST /api/auth/signup` + `POST /api/auth/login`).
  If someone signs in with Google using an email that already has a
  password account, the accounts are linked (same `User` row) rather than
  creating a duplicate.
- **Access tier** is `User.role`, independent of both how someone
  authenticated and `User.status` (which just tracks soft-deleted
  accounts, unrelated to permissions).

## Session inactivity timeout

A session is cleared after 30 minutes with no authenticated request -
see `SESSION_INACTIVITY_TIMEOUT` in `server/decorators.py`. This is
enforced inside `get_current_user()`, the single function every
`@login_required`/`@roles_required` route (and `/api/auth/me`) calls to
find the logged-in user - so the timeout applies everywhere those are
used, not just one route that happens to check it.

**Why 30 minutes:** OWASP classifies an app like this one (accounts
hold real permissions - publish/delete content, admin/reviewer roles -
but nothing financial or health-record-level sensitive) as "medium
risk," for which 15-30 minutes is the consistent recommendation across
OWASP's own session-management guidance, NIST 800-63B, and PCI-DSS-
adjacent standards. 30 minutes (the permissive end of that range) was
chosen to favor usability given this isn't a high-risk app.

**How it works:** the session dict carries a `last_active` timestamp,
stamped to "now" on every request that finds a valid session.
`get_current_user()` compares that timestamp to now on the *next*
request - if more than 30 minutes have elapsed, the session is cleared
and treated exactly as if the person had never logged in (a 401 with
`{"reason": "session_expired"}`, distinguishing it from a request that
was never authenticated at all). This is a **sliding** window, not a
fixed timer from login - any authenticated request resets the clock,
so someone actively using the site never gets logged out mid-session
no matter how long they've been on it in total.

This is separate from, and much shorter than,
`PERMANENT_SESSION_LIFETIME` (7 days, in `app.py`) - that's an absolute
ceiling on the signed cookie itself (the browser won't even send it back
after 7 days, inactive or not), while the 30-minute check is an
application-level rule enforced per-request regardless of what the
cookie's own expiry says. Both apply; whichever is stricter at any given
moment is what actually logs someone out.

**Frontend behavior:** `AuthContext.jsx` re-checks `/api/auth/me` every
5 minutes while a user is logged in (independent of whatever else
they're doing - e.g. reading a long report with no other clicks would
otherwise never surface an expired session until they happened to
click something). On a `session_expired` 401, it redirects to `/login`
with a message rather than leaving the person on a page that silently
stopped working.

Separately, `ProtectedRoute.jsx` re-verifies the session fresh with the
server (via `AuthContext`'s `checkSession()`) on every navigation to a
protected page, rather than trusting whatever `isAuthenticated` already
holds in React state - that flag can be up to 5 minutes stale (the
periodic poll's own interval), so without this a session that expired
in that gap would let someone through to a protected page anyway, which
would then just fail its own data-fetching silently instead of
prompting a login. This is what actually closes the gap for someone
*navigating to* a protected page after their session expired, as
opposed to already being on one when it expires (which the periodic
poll above handles).

## The four tiers today

| Role        | Granted how                                     | Can do                                       |
|-------------|----------------------------------------------------|------------------------------------------------|
| `basic`     | Automatically, on every signup/first Google sign-in | Browse the site, view their own documents/events |
| `publisher` | Manually, by an admin (`promote_user.py`)           | Everything `basic` can, plus upload/soft-delete documents and reports (a *published* report's deletion goes through a review request instead - see below) |
| `reviewer`  | Manually, by an admin (`promote_user.py`)           | Everything `publisher` can, plus deciding a publisher's request to delete their own published report |
| `admin`     | Manually, by another admin (`promote_user.py`)      | Everything `reviewer` can, plus permanently (hard) delete documents/reports, and instantly delete any report (published or not) without going through review |

`server/models/user.py` defines `ROLE_BASIC`, `ROLE_PUBLISHER`,
`ROLE_REVIEWER`, `ROLE_ADMIN`, and `VALID_ROLES`. Neither
`/api/auth/google` nor `/api/auth/signup` ever pass a role — new
accounts always land on `ROLE_BASIC`.

### Report deletion: instant vs. review-gated

Two different paths, depending on who's deleting what:

- **Admin, any report, any review_status** — `DELETE /api/reports/<id>`
  soft-deletes instantly, same as before this tier existed.
- **Publisher/reviewer, their own report, NOT yet published**
  (`pending_review`/`changes_requested`/`rejected`) — same instant
  `DELETE /api/reports/<id>`, since the report was never public and
  there's nothing for anyone else to weigh in on.
- **Publisher/reviewer, their own PUBLISHED report** —
  `DELETE /api/reports/<id>` returns 409. Instead:
  1. `POST /api/reports/<id>/request-deletion` with a required
     `reason` - the report stays visible on the public Reports page
     throughout (deliberately - see `REVIEW_STATUS_DELETION_REQUESTED`'s
     own comment in `models/report.py`), `review_status` becomes
     `deletion_requested`.
  2. A `reviewer` or `admin` (not the uploader) decides via
     `POST /api/reports/<id>/deletion-review` with
     `{"decision": "approve"}` or `{"decision": "deny"}` - unlike the
     3-approval/2-rejection publish workflow, **a single decision is
     final immediately** either way. Approve soft-deletes it (recording
     `deleted_via="deletion_review"`); deny puts it back to `published`.

Every report soft-deleted while it was published (either path above)
appears on the admin-only Deleted Reports page
(`GET /api/reports/deleted`), which supports bulk hard-delete
(`DELETE .../permanent`) or repost (`POST .../repost`, which just
restores visibility - no re-review).

## How a route becomes tier-gated

Two independent layers — use both:

**1. Backend (the real enforcement).** `server/decorators.py`:

```python
@app.post("/api/documents")
@roles_required("publisher", "admin")
def upload_document():
    ...

@app.delete("/api/documents/<int:document_id>/permanent")
@roles_required("admin")
def remove_document_permanently(document_id):
    ...
```

`roles_required` reads `session["user_id"]`, loads that `User` row live,
and checks `.role` against the allowed set. This means a role change
takes effect on the user's *next request* — no token to expire or
refresh. `login_required` is the same idea without the role check, for
routes that just need "someone is signed in".

**2. Frontend (the UX layer).** `client/src/components/ProtectedRoute.jsx`
redirects users away from pages they can't use; `NavBar.jsx` only shows
links for actions a user's role permits. Purely cosmetic — always pair
with the backend gate above; a determined user could hit the API
directly otherwise.

## How to promote someone

No self-service or API path exists for this on purpose. The person needs
an existing row (signed up/in at least once, via either method), then
from `server/`:

```bash
python promote_user.py someone@example.com publisher
python promote_user.py someone@example.com admin
python promote_user.py someone@example.com basic   # demote
```

## Soft delete vs. hard delete vs. role

Two separate deletion concepts exist for documents, and neither is about
permissions:

- **Soft delete** (`DELETE /api/documents/<id>`, publisher/admin):
  flips `status` to 0. The row, file, and event history all survive —
  this is what "delete" means for everyday use.
- **Hard delete** (`DELETE /api/documents/<id>/permanent`, admin only):
  actually removes the row (cascading to its events) and the underlying
  file/object via the storage backend. Irreversible — this exists for
  admin cleanup, not routine use, and is logged at `WARNING` level.

`User.status` works the same way for accounts — `delete_user()` only
ever soft-deletes; there's no hard-delete-a-user route today.

## Extending this further

- **A fourth tier:** add it to `VALID_ROLES` in `models/user.py`, then
  reference it in whatever `roles_required(...)` calls should include it.
- **An admin dashboard for promotions** instead of the CLI script: add
  `GET /api/users` + `PATCH /api/users/<id>/role`, gated with
  `@roles_required("admin")`, plus a small React admin page.
- **Per-resource ownership:** a separate check from role — e.g.
  `remove_document` already checks `doc.user_id == user.id` *in addition
  to* the role check, so publishers can only soft-delete their own
  documents, not each other's. `remove_document_permanently` currently
  skips the ownership check since it's admin-only by design; add one if
  you want admins restricted to their own uploads too.