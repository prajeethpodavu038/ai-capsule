// server/db.js
//
// SQLite storage for AI Capsule using better-sqlite3 (synchronous, no ORM).
// The schema follows the assignment spec (Section 6) exactly, with the
// addition of a small `users` table so the dashboard can show a friendly
// name/avatar for the signed-in GitHub user (not required by the spec, but
// harmless and useful for the demo).

const path = require('node:path');
const fs = require('node:fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'ai_capsule.sqlite3');

// Make sure the directory for the DB file exists (matters for the default ./data path).
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS capsules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    project_name TEXT NOT NULL,
    prompt_title TEXT NOT NULL,
    prompt_version TEXT,
    prompt_text TEXT NOT NULL,
    response_summary TEXT,
    category TEXT,
    usefulness TEXT,
    reviewed INTEGER DEFAULT 0,
    improved INTEGER DEFAULT 0,
    screenshot_url TEXT,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_capsules_user_id ON capsules(user_id);

  -- Not required by the assignment spec, only used to greet the user by
  -- name/avatar on the dashboard without re-calling the GitHub API each time.
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    avatar_url TEXT,
    last_login_at TEXT
  );
`);

module.exports = db;
