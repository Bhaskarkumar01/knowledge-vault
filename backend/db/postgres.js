import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  max: Number(process.env.PG_POOL_MAX || 10),
});

// ---------------------------------------------------------------------------
// Schema (idempotent - safe to run on every boot)
// ---------------------------------------------------------------------------
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (now()::text)
);

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#A87C43',
  created_at TEXT DEFAULT (now()::text)
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
  created_at TEXT DEFAULT (now()::text),
  updated_at TEXT DEFAULT (now()::text),
  search_vector tsvector
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_items_user ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_folder ON items(folder_id);
CREATE INDEX IF NOT EXISTS idx_items_favorite ON items(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_items_search ON items USING GIN(search_vector);

-- Keep search_vector in sync with title/content/excerpt on every write.
CREATE OR REPLACE FUNCTION items_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.excerpt, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS items_search_vector_trigger ON items;
CREATE TRIGGER items_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content, excerpt ON items
  FOR EACH ROW EXECUTE FUNCTION items_search_vector_update();
`;

let ready = pool.query(SCHEMA_SQL).catch((err) => {
  console.error('Failed to initialize Postgres schema:', err);
  process.exit(1);
});

/** Converts `?` placeholders (as used throughout the route code) into `$1, $2, ...`. */
function toPositional(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

export const dialect = 'postgres';

export async function get(sql, params = []) {
  await ready;
  const res = await pool.query(toPositional(sql), params);
  return res.rows[0];
}
export async function all(sql, params = []) {
  await ready;
  const res = await pool.query(toPositional(sql), params);
  return res.rows;
}
export async function run(sql, params = []) {
  await ready;
  const res = await pool.query(toPositional(sql), params);
  return { changes: res.rowCount };
}

/**
 * Full-text search over a user's items via a maintained tsvector column.
 * Returns matching item rows ordered by relevance, filtered to
 * folder_id/type when provided.
 */
export async function searchItems({ userId, query, folderId, type }) {
  await ready;
  const clauses = ['user_id = $1', 'search_vector @@ websearch_to_tsquery('
    + "'english', $2)"];
  const params = [userId, query];
  let idx = 3;
  if (folderId) { clauses.push(`folder_id = $${idx++}`); params.push(folderId); }
  if (type) { clauses.push(`type = $${idx++}`); params.push(type); }

  const sql = `
    SELECT *, ts_rank(search_vector, websearch_to_tsquery('english', $2)) AS rank
    FROM items
    WHERE ${clauses.join(' AND ')}
    ORDER BY rank DESC`;
  const res = await pool.query(sql, params);
  return res.rows;
}

export default { dialect, get, all, run, searchItems };
