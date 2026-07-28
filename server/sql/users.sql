-- ============================================================
-- users.sql
-- Schema and CRUD statements for the users table.
-- Placeholders use "?" (SQLite style). For Postgres/psycopg2,
-- swap "?" for "%s".
-- ============================================================

-- ---------- SCHEMA ----------
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_sub TEXT UNIQUE,              -- nullable: not set for email/password accounts
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,                   -- nullable: not set for Google-only accounts
    name TEXT,
    picture_url TEXT,
    status INTEGER NOT NULL DEFAULT 1,    -- 1 = visible/active, 0 = hidden (soft-deleted)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users (status);


-- ---------- CREATE ----------
-- name: create_user
INSERT INTO users (google_sub, email, password_hash, name, picture_url, status)
VALUES (?, ?, ?, ?, ?, 1);


-- ---------- READ ----------
-- Reads below default to status = 1 (visible). Use the _include_hidden
-- variant to also match soft-deleted users (e.g. for admin views).

-- name: get_user_by_id
SELECT id, google_sub, email, password_hash, name, picture_url, status, created_at
FROM users
WHERE id = ? AND status = 1;

-- name: get_user_by_id_include_hidden
SELECT id, google_sub, email, password_hash, name, picture_url, status, created_at
FROM users
WHERE id = ?;

-- name: get_user_by_google_sub
SELECT id, google_sub, email, password_hash, name, picture_url, status, created_at
FROM users
WHERE google_sub = ? AND status = 1;

-- name: get_user_by_email
SELECT id, google_sub, email, password_hash, name, picture_url, status, created_at
FROM users
WHERE email = ? AND status = 1;

-- name: get_all_users
SELECT id, google_sub, email, password_hash, name, picture_url, status, created_at
FROM users
WHERE status = 1;

-- name: get_all_users_include_hidden
SELECT id, google_sub, email, password_hash, name, picture_url, status, created_at
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

-- name: soft_delete_user
UPDATE users
SET status = 0
WHERE id = ?;

-- name: restore_user
UPDATE users
SET status = 1
WHERE id = ?;


-- ---------- DELETE ----------
-- Hard deletes are kept only for admin/cleanup or erasure-request use;
-- normal app flow should use soft_delete_user above instead.

-- name: hard_delete_user
DELETE FROM users
WHERE id = ?;