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
CMD alembic upgrade head && gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 60 app:app