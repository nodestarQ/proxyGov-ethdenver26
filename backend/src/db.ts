import 'dotenv/config';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

const sqlite = new Database(':memory:');
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

// Create tables
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      address TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      ens_name TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'offline',
      twin_enabled INTEGER NOT NULL DEFAULT 0,
      joined_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channel_members (
      channel_id TEXT NOT NULL REFERENCES channels(id),
      user_address TEXT NOT NULL REFERENCES users(address),
      PRIMARY KEY (channel_id, user_address)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id),
      sender TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      is_twin INTEGER NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL,
      reactions TEXT NOT NULL DEFAULT '{}',
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS twin_configs (
      owner_address TEXT PRIMARY KEY REFERENCES users(address),
      enabled INTEGER NOT NULL DEFAULT 0,
      personality TEXT NOT NULL DEFAULT '',
      interests TEXT NOT NULL DEFAULT '[]',
      response_style TEXT NOT NULL DEFAULT 'concise',
      max_swap_size_eth REAL NOT NULL DEFAULT 0.1,
      auto_summarize INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS polls (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id),
      creator TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL
    );
  `);

  // Seed default channels
  const now = new Date().toISOString();
  const stmt = sqlite.prepare('INSERT OR IGNORE INTO channels (id, name, description, created_at) VALUES (?, ?, ?, ?)');
  stmt.run('general', 'general', 'General DAO discussion', now);
  stmt.run('defi', 'defi', 'DeFi opportunities and swaps', now);
  stmt.run('governance', 'governance', 'Governance proposals and votes', now);

  console.log('[db] Initialized in-memory SQLite with default channels');
}
