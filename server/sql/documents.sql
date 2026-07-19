-- ============================================================
-- documents.sql
-- Schema and CRUD statements for the documents table.
-- Placeholders use "?" (SQLite style). For Postgres/psycopg2,
-- swap "?" for "%s".
-- ============================================================

-- ---------- SCHEMA ----------
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    size_bytes BIGINT,
    is_visible BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_is_visible ON documents (is_visible);


-- ---------- CREATE ----------
-- name: create_document
INSERT INTO documents (user_id, filename, file_path, mime_type, size_bytes)
VALUES (?, ?, ?, ?, ?);


-- ---------- READ ----------
-- name: get_document_by_id
SELECT id, user_id, filename, file_path, mime_type, size_bytes, is_visible, created_at
FROM documents
WHERE id = ?;

-- name: get_documents_by_user
SELECT id, user_id, filename, file_path, mime_type, size_bytes, is_visible, created_at
FROM documents
WHERE user_id = ? AND is_visible = 1;

-- name: get_documents_by_user_include_hidden
SELECT id, user_id, filename, file_path, mime_type, size_bytes, is_visible, created_at
FROM documents
WHERE user_id = ?;

-- name: get_all_documents
SELECT id, user_id, filename, file_path, mime_type, size_bytes, is_visible, created_at
FROM documents
WHERE is_visible = 1;


-- ---------- UPDATE ----------
-- name: update_document_filename
UPDATE documents
SET filename = ?
WHERE id = ?;

-- name: update_document_file_path
UPDATE documents
SET file_path = ?
WHERE id = ?;

-- name: soft_delete_document
UPDATE documents
SET is_visible = 0
WHERE id = ?;

-- name: restore_document
UPDATE documents
SET is_visible = 1
WHERE id = ?;


-- ---------- DELETE ----------
-- Hard deletes are kept only for admin/cleanup use; normal app flow
-- should use soft_delete_document above instead.

-- name: hard_delete_document
DELETE FROM documents
WHERE id = ?;

-- name: hard_delete_documents_by_user
DELETE FROM documents
WHERE user_id = ?;