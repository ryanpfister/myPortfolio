// SQLite setup + schema migrations.
// Uses better-sqlite3 (synchronous, fast, simple).

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, 'portfolio.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'tech',
    excerpt TEXT NOT NULL DEFAULT '',
    intro TEXT NOT NULL DEFAULT '',
    body_md TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    published INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_posts_published_date ON posts(published, date DESC);
  CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
`);

// ── Statements (prepared once, reused) ──────────────────────
const stmts = {
  listPublished: db.prepare(`
    SELECT id, slug, title, date, category, excerpt, tags, published, created_at, updated_at
    FROM posts WHERE published = 1 ORDER BY date DESC, id DESC
  `),
  listAll: db.prepare(`
    SELECT id, slug, title, date, category, excerpt, tags, published, created_at, updated_at
    FROM posts ORDER BY date DESC, id DESC
  `),
  bySlug: db.prepare(`SELECT * FROM posts WHERE slug = ?`),
  insert: db.prepare(`
    INSERT INTO posts (slug, title, date, category, excerpt, intro, body_md, tags, published, created_at, updated_at)
    VALUES (@slug, @title, @date, @category, @excerpt, @intro, @body_md, @tags, @published, @created_at, @updated_at)
  `),
  update: db.prepare(`
    UPDATE posts SET
      title = @title, date = @date, category = @category, excerpt = @excerpt,
      intro = @intro, body_md = @body_md, tags = @tags, published = @published,
      updated_at = @updated_at
    WHERE slug = @slug
  `),
  rename: db.prepare(`UPDATE posts SET slug = @new_slug, updated_at = @updated_at WHERE slug = @old_slug`),
  del: db.prepare(`DELETE FROM posts WHERE slug = ?`),
};

// ── Public API ──────────────────────────────────────────────
function listPosts({ includeDrafts = false } = {}) {
  return (includeDrafts ? stmts.listAll : stmts.listPublished).all();
}

function getPost(slug) {
  return stmts.bySlug.get(slug);
}

function createPost(data) {
  const now = Date.now();
  const row = {
    slug: data.slug,
    title: data.title || 'Untitled',
    date: data.date || new Date().toISOString().slice(0, 10),
    category: data.category || 'tech',
    excerpt: data.excerpt || '',
    intro: data.intro || '',
    body_md: data.body_md || '',
    tags: data.tags || '',
    published: data.published ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
  stmts.insert.run(row);
  return getPost(row.slug);
}

function updatePost(slug, data) {
  const existing = getPost(slug);
  if (!existing) return null;
  const now = Date.now();
  const row = {
    slug,
    title: data.title ?? existing.title,
    date: data.date ?? existing.date,
    category: data.category ?? existing.category,
    excerpt: data.excerpt ?? existing.excerpt,
    intro: data.intro ?? existing.intro,
    body_md: data.body_md ?? existing.body_md,
    tags: data.tags ?? existing.tags,
    published: data.published === undefined ? existing.published : (data.published ? 1 : 0),
    updated_at: now,
  };
  stmts.update.run(row);
  // If new_slug supplied, also rename
  if (data.new_slug && data.new_slug !== slug) {
    if (getPost(data.new_slug)) {
      const err = new Error('Slug already taken');
      err.code = 'SLUG_TAKEN';
      throw err;
    }
    stmts.rename.run({ old_slug: slug, new_slug: data.new_slug, updated_at: now });
    return getPost(data.new_slug);
  }
  return getPost(slug);
}

function deletePost(slug) {
  const r = stmts.del.run(slug);
  return r.changes > 0;
}

module.exports = { db, listPosts, getPost, createPost, updatePost, deletePost };
