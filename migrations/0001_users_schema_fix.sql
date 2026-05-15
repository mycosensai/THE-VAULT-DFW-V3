-- THE VAULT DFW V3
-- D1 users table repair for local auth, OAuth, and account creation

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  unionId TEXT UNIQUE,
  oauth_provider TEXT,
  oauth_provider_id TEXT,
  name TEXT,
  email TEXT UNIQUE,
  avatar TEXT,
  password TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  createdAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updatedAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  lastSignInAt INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
CREATE INDEX IF NOT EXISTS users_oauth_idx ON users(oauth_provider, oauth_provider_id);

-- Add missing columns for existing partial users tables.
-- Cloudflare D1/SQLite does not support IF NOT EXISTS for ADD COLUMN on all runtimes,
-- so run the ALTER statements manually only if PRAGMA table_info(users) shows the column is missing.

-- ALTER TABLE users ADD COLUMN unionId TEXT UNIQUE;
-- ALTER TABLE users ADD COLUMN oauth_provider TEXT;
-- ALTER TABLE users ADD COLUMN oauth_provider_id TEXT;
-- ALTER TABLE users ADD COLUMN name TEXT;
-- ALTER TABLE users ADD COLUMN email TEXT UNIQUE;
-- ALTER TABLE users ADD COLUMN avatar TEXT;
-- ALTER TABLE users ADD COLUMN password TEXT;
-- ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
-- ALTER TABLE users ADD COLUMN createdAt INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0;
-- ALTER TABLE users ADD COLUMN lastSignInAt INTEGER NOT NULL DEFAULT 0;
