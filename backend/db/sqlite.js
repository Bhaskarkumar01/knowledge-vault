import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'vault.db');

const raw = new Database(DB_PATH);
raw.pragma('journal_mode = WAL');
raw.pragma('foreign_keys = ON');

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
raw.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#A87C43',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK(type IN ('article','pdf','youtube','note')),
  title TEXT NOT NULL,
  url TEXT,
  content TEXT,
  excerpt TEXT,
  thumbnail TEXT,
  file_path TEXT,
  file_key TEXT,
  is_favorite INTEGER DEFAULT 0,
  progress INTEGER DEFAULT 0,
  last_reviewed_at TEXT,
  next_review_at TEXT,
  review_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
  title, content, excerpt, content='items', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
  INSERT INTO items_fts(rowid, title, content, excerpt) VALUES (new.rowid, new.title, new.content, new.excerpt);
END;
CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, content, excerpt) VALUES ('delete', old.rowid, old.title, old.content, old.excerpt);
END;
CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
  INSERT INTO items_fts(items_fts, rowid, title, content, excerpt) VALUES ('delete', old.rowid, old.title, old.content, old.excerpt);
  INSERT INTO items_fts(rowid, title, content, excerpt) VALUES (new.rowid, new.title, new.content, new.excerpt);
END;

CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_folder ON items(folder_id);
CREATE INDEX IF NOT EXISTS idx_items_favorite ON items(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
`);

// ---------------------------------------------------------------------------
// Unified query interface. These are synchronous, but every caller uses
// `await`, which is a harmless no-op on a plain (non-promise) value - this
// keeps route code identical whether it runs against SQLite or Postgres.
// ---------------------------------------------------------------------------
export const dialect = 'sqlite';

export function get(sql, params = []) {
  return raw.prepare(sql).get(...params);
}
export function all(sql, params = []) {
  return raw.prepare(sql).all(...params);
}
export function run(sql, params = []) {
  const info = raw.prepare(sql).run(...params);
  return { changes: info.changes };
}

/**
 * Full-text search over a user's items via FTS5. Returns matching item rows
 * ordered by relevance, filtered to folder_id/type when provided.
 */
export function searchItems({ userId, query, folderId, type }) {
  const clauses = ['i.user_id = ?'];
  const params = [userId];
  if (folderId) { clauses.push('i.folder_id = ?'); params.push(folderId); }
  if (type) { clauses.push('i.type = ?'); params.push(type); }

  const matchQuery = query.trim().split(/\s+/).map((t) => `${t.replace(/["*]/g, '')}*`).join(' ');
  const sql = `
    SELECT i.* FROM items_fts f
    JOIN items i ON i.rowid = f.rowid
    WHERE ${clauses.join(' AND ')} AND items_fts MATCH ?
    ORDER BY rank`;
  return all(sql, [...params, matchQuery]);
}

export default { dialect, get, all, run, searchItems };
