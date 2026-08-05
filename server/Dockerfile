# Backend container for DigitalOcean App Platform.
# Build context should be the repo root; this file lives at server/Dockerfile.
FROM python:3.12-slim

WORKDIR /app

# System deps needed by psycopg2 (Postgres driver) at build time.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY server/requirements.txt server/requirements-prod.txt ./
RUN pip install --no-cache-dir -r requirements-prod.txt

COPY server/ .

# Run migrations, then start gunicorn. This runs on every deploy, which
# is what you want: alembic upgrade head is a no-op if there's nothing
# new to apply.
#
# --max-requests/--max-requests-jitter recycle each worker after a
# random 500-550 request count: on the basic-xxs instance sized in
# app.yaml (512 MiB total, shared across both workers), any slow
# per-request growth - an unclosed SQLAlchemy session, Sentry's
# breadcrumb buffer, Flask-Limiter's in-memory counters - would
# otherwise accumulate for the life of the process, since App
# Platform's instance_count: 1 here means these workers never
# otherwise restart on their own. The jitter staggers the two workers'
# restarts so they don't recycle at the same moment.
CMD alembic upgrade head && gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 60 --max-requests 500 --max-requests-jitter 50 app:app