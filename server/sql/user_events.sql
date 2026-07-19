-- ============================================================
-- user_events.sql
-- Schema and CRUD statements for the user_events table.
-- Placeholders use "?" (SQLite style). For Postgres/psycopg2,
-- swap "?" for "%s". event_metadata is stored as TEXT (JSON string)
-- for SQLite; use JSONB if migrating to Postgres.
-- ============================================================

-- ---------- SCHEMA ----------
CREATE TABLE IF NOT EXISTS user_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    document_id INTEGER,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE')),
    event_metadata TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events (user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_document_id ON user_events (document_id);


-- ---------- CREATE ----------
-- name: create_user_event
INSERT INTO user_events (user_id, document_id, action, event_metadata)
VALUES (?, ?, ?, ?);


-- ---------- READ ----------
-- name: get_user_event_by_id
SELECT id, user_id, document_id, action, event_metadata, created_at
FROM user_events
WHERE id = ?;

-- name: get_events_by_user
SELECT id, user_id, document_id, action, event_metadata, created_at
FROM user_events
WHERE user_id = ?;

-- name: get_events_by_document
SELECT id, user_id, document_id, action, event_metadata, created_at
FROM user_events
WHERE document_id = ?;

-- name: get_all_user_events
SELECT id, user_id, document_id, action, event_metadata, created_at
FROM user_events;


-- ---------- UPDATE ----------
-- name: update_user_event_action
UPDATE user_events
SET action = ?
WHERE id = ?;

-- name: update_user_event_metadata
UPDATE user_events
SET event_metadata = ?
WHERE id = ?;


-- ---------- DELETE ----------
-- name: delete_user_event
DELETE FROM user_events
WHERE id = ?;

-- name: delete_events_by_document
DELETE FROM user_events
WHERE document_id = ?;