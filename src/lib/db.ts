import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Default data directory inside the Next.js app 
const dataDir = path.resolve(process.cwd(), 'data');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.resolve(dataDir, 'hdrezka.db');

// Initialize DB safely across API routes
const db = new Database(dbPath);
db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      created_at INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS watchlist (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      poster TEXT,
      type TEXT NOT NULL, -- 'watching' or 'plan_to_watch'
      status TEXT, -- JSON holding last season/episode or current time
      updated_at INTEGER,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, url)
    );

    CREATE TABLE IF NOT EXISTS catalog (
      id TEXT PRIMARY KEY, -- usually the numeric ID from HDRezka or numeric part of URL
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      orig_title TEXT,
      poster TEXT,
      type TEXT, -- 'movie', 'series', etc.
      year INTEGER,
      genres TEXT, -- comma-separated list
      country TEXT,
      translations TEXT, -- JSON string
      seasons TEXT, -- JSON string
      episodes TEXT, -- JSON string
      last_indexed_at INTEGER
    );

    -- Virtual table for Full-Text Search on titles
    CREATE VIRTUAL TABLE IF NOT EXISTS catalog_fts USING fts5(
      id UNINDEXED,
      title,
      orig_title,
      content='catalog',
      content_rowid='id'
    );

    -- Trigger to keep FTS index in sync
    CREATE TRIGGER IF NOT EXISTS catalog_ai AFTER INSERT ON catalog BEGIN
      INSERT INTO catalog_fts(rowid, id, title, orig_title) VALUES (new.rowid, new.id, new.title, new.orig_title);
    END;

    CREATE TRIGGER IF NOT EXISTS catalog_ad AFTER DELETE ON catalog BEGIN
      INSERT INTO catalog_fts(catalog_fts, rowid, id, title, orig_title) VALUES('delete', old.rowid, old.id, old.title, old.orig_title);
    END;

    CREATE TRIGGER IF NOT EXISTS catalog_au AFTER UPDATE ON catalog BEGIN
      INSERT INTO catalog_fts(catalog_fts, rowid, id, title, orig_title) VALUES('delete', old.rowid, old.id, old.title, old.orig_title);
      INSERT INTO catalog_fts(rowid, id, title, orig_title) VALUES (new.rowid, new.id, new.title, new.orig_title);
    END;

    CREATE TABLE IF NOT EXISTS sync_state (
      name TEXT PRIMARY KEY,
      current_page INTEGER DEFAULT 1,
      current_category TEXT,
      total_pages INTEGER DEFAULT 0,
      items_indexed INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      last_error TEXT,
      status TEXT DEFAULT 'idle', -- 'running', 'idle', 'paused', 'finished', 'error'
      last_updated INTEGER
    );
  `);

  // Migrations for sync_state columns added later
  const tableInfo = db.prepare("PRAGMA table_info(sync_state)").all() as any[];
  const columnNames = tableInfo.map(c => c.name);
  
  if (!columnNames.includes('current_category')) {
    db.exec("ALTER TABLE sync_state ADD COLUMN current_category TEXT;");
  }
  if (!columnNames.includes('error_count')) {
    db.exec("ALTER TABLE sync_state ADD COLUMN error_count INTEGER DEFAULT 0;");
  }
  if (!columnNames.includes('last_error')) {
    db.exec("ALTER TABLE sync_state ADD COLUMN last_error TEXT;");
  }

  // Migrations for catalog columns
  const catalogInfo = db.prepare("PRAGMA table_info(catalog)").all() as any[];
  const catalogColumns = catalogInfo.map(c => c.name);
  if (!catalogColumns.includes('country')) {
    db.exec("ALTER TABLE catalog ADD COLUMN country TEXT;");
  }

  // Seed default user if Database is freshly created
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count === 0) {
    db.prepare('INSERT INTO users (id, name, icon, created_at) VALUES (?, ?, ?, ?)').run(
      'default-zorg',
      'Zorg',
      '👨‍🚀',
      Date.now()
    );
  }
}

// Ensure init executes synchronously immediately when imported
initDb();

export default db;
