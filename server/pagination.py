"""
Shared pagination helpers.

Every model function that can return an unbounded number of rows (all
published reports, all users, ...) takes limit/offset and enforces
DEFAULT_PAGE_SIZE/MAX_PAGE_SIZE itself, rather than trusting callers to
remember to page - a route that forgets to pass limit/offset still gets
a bounded result instead of silently loading an entire table into
memory. parse_pagination_args() is the route-side half: it reads
?limit=&offset= from the query string and clamps them to the same
bounds before they reach the model layer.

DEFAULT_PAGE_SIZE is deliberately generous (well above what any of
these lists actually hold today) so existing callers that don't yet
pass ?limit=&offset= - e.g. the public Reports page, which currently
expects a plain JSON array and renders it in one go - see no visible
change. It's a ceiling against future unbounded growth, not a UX
pagination limit; add real "load more" UI (limit/offset + the
X-Total-Count response header set by paginated_json_response()) once
any of these lists is actually likely to exceed it.
"""
from flask import request, jsonify

DEFAULT_PAGE_SIZE = 100
MAX_PAGE_SIZE = 200


def clamp_limit(limit):
    """Coerces limit to an int in [1, MAX_PAGE_SIZE], defaulting to
    DEFAULT_PAGE_SIZE for anything missing or invalid."""
    try:
        limit = int(limit)
    except (TypeError, ValueError):
        return DEFAULT_PAGE_SIZE
    return max(1, min(limit, MAX_PAGE_SIZE))


def clamp_offset(offset):
    """Coerces offset to a non-negative int, defaulting to 0."""
    try:
        offset = int(offset)
    except (TypeError, ValueError):
        return 0
    return max(0, offset)


def parse_pagination_args():
    """Reads and clamps ?limit=&offset= from the current request's query string."""
    return clamp_limit(request.args.get("limit")), clamp_offset(request.args.get("offset"))


def paginated_json_response(to_dict_list, total, limit, offset):
    """
    Wraps an already-serializable list as the JSON body (a plain array,
    same shape existing clients already expect - no envelope object),
    with pagination metadata carried in headers instead: X-Total-Count,
    X-Limit, X-Offset. A client that ignores the headers still works
    exactly as before; one that reads them can build "load more" UI
    without any change to the body shape.
    """
    resp = jsonify(to_dict_list)
    resp.headers["X-Total-Count"] = str(total)
    resp.headers["X-Limit"] = str(limit)
    resp.headers["X-Offset"] = str(offset)
    return resp