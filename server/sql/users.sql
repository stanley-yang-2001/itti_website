-- ============================================================
-- users.sql
-- Schema and CRUD statements for the users table.
-- Placeholders use "?" (SQLite style). For Postgres/psycopg2,
-- swap "?" for "%s".
-- ============================================================

-- ---------- SCHEMA ----------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    picture_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);


-- ---------- CREATE ----------
-- name: create_user
INSERT INTO users (google_sub, email, name, picture_url)
VALUES (?, ?, ?, ?);


-- ---------- READ ----------
-- name: get_user_by_id
SELECT id, google_sub, email, name, picture_url, created_at
FROM users
WHERE id = ?;

-- name: get_user_by_google_sub
SELECT id, google_sub, email, name, picture_url, created_at
FROM users
WHERE google_sub = ?;

-- name: get_all_users
SELECT id, google_sub, email, name, picture_url, created_at
FROM users;


-- ---------- UPDATE ----------
-- name: update_user_name
UPDATE users
SET name = ?
WHERE id = ?;

-- name: update_user_picture
UPDATE users
SET picture_url = ?
WHERE id = ?;

-- name: update_user_email
UPDATE users
SET email = ?
WHERE id = ?;


-- ---------- DELETE ----------
-- name: delete_user
DELETE FROM users
WHERE id = ?;