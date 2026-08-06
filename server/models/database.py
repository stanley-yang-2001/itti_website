"""
Shared SQLAlchemy setup: Base class, engine, and session factory.
All model files import from here so they share one metadata object
and one connection.

DATABASE_URL controls which database is used:
  - unset -> SQLite at server/app.db (local dev default, zero setup)
  - postgresql://user:pass@host:5432/dbname -> PostgreSQL (production)

Nothing else in the codebase needs to change to switch databases -
every model uses plain SQLAlchemy Core/ORM, no SQLite-specific syntax.
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # server/
DEFAULT_SQLITE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'app.db')}"

DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_SQLITE_URL)

# SQLite needs this flag to be usable from Flask's multi-threaded dev
# server; PostgreSQL (and other real databases) don't need or want it.
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# pool_pre_ping avoids "server closed the connection unexpectedly" errors
# after a Postgres connection has sat idle past the server's timeout -
# irrelevant for SQLite but harmless to pass either way.
#
# pool_size/max_overflow are set explicitly rather than left at
# SQLAlchemy's defaults (5 + 10 = up to 15 connections per process).
# app.yaml runs 2 gunicorn worker processes, each with its own engine/
# pool, on a 512MB instance - at the default settings that's up to 30
# possible Postgres connections plus their per-connection overhead from
# a single tiny box. 3 + 2 = 5 per worker (10 total) is comfortably
# above this app's actual concurrency (gunicorn's sync workers handle
# one request at a time each) while capping the worst case.
engine = create_engine(
    DATABASE_URL, echo=False, pool_pre_ping=True, connect_args=connect_args,
    pool_size=3, max_overflow=2,
)
Base = declarative_base()
Session = sessionmaker(bind=engine)