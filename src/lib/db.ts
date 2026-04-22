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

  `);

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
