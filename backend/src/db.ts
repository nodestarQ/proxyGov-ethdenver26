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
      interests TEXT NOT NULL DEFAULT '',
      response_style TEXT NOT NULL DEFAULT '',
      autonomous_cap_usd REAL NOT NULL DEFAULT 100,
      auto_summarize INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS channel_contexts (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id),
      user_address TEXT NOT NULL REFERENCES users(address),
      summary TEXT NOT NULL,
      key_topics TEXT NOT NULL DEFAULT '[]',
      action_items TEXT NOT NULL DEFAULT '[]',
      mentioned_tokens TEXT NOT NULL DEFAULT '[]',
      message_count INTEGER NOT NULL DEFAULT 0,
      last_message_timestamp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(channel_id, user_address)
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

  // Seed demo users and messages
  seedDemoData(sqlite, now);

  console.log('[db] Initialized in-memory SQLite with default channels + seed data');
}

function seedDemoData(sqlite: Database.Database, now: string) {
  const users = [
    { address: '0xdemo1111111111111111111111111111111111', name: 'NeonVoter', twin: true },
    { address: '0xdemo2222222222222222222222222222222222', name: 'IronWhale', twin: false },
    { address: '0xdemo3333333333333333333333333333333333', name: 'FluxDegen', twin: true },
  ];

  const userStmt = sqlite.prepare('INSERT OR IGNORE INTO users (address, display_name, status, twin_enabled, joined_at) VALUES (?, ?, ?, ?, ?)');
  const memberStmt = sqlite.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_address) VALUES (?, ?)');

  for (const u of users) {
    userStmt.run(u.address, u.name, 'away', u.twin ? 1 : 0, now);
    memberStmt.run('general', u.address);
    memberStmt.run('defi', u.address);
    memberStmt.run('governance', u.address);
  }

  // Seed twin config for NeonVoter
  const twinStmt = sqlite.prepare('INSERT OR IGNORE INTO twin_configs (owner_address, enabled, personality, interests, response_style, autonomous_cap_usd, auto_summarize, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  twinStmt.run(users[0].address, 1, 'Analytical DeFi enthusiast. Skeptical of hype, focuses on fundamentals.', 'ETH, UNI, yield farming, governance proposals', 'Concise and data-driven. Short replies, focus on facts.', 500, 1, now, now);
  twinStmt.run(users[2].address, 1, 'Degen energy. Always looking for alpha. Quick to jump on trends.', 'Alpha plays, NFTs, airdrops, memecoins', 'Casual and hyped. Uses slang, keeps it fun.', 100, 1, now, now);

  // Seed conversation in #general
  const msgStmt = sqlite.prepare('INSERT INTO messages (id, channel_id, sender, sender_name, is_twin, type, content, reactions, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const t = (minAgo: number) => new Date(Date.now() - minAgo * 60000).toISOString();

  msgStmt.run('seed-1', 'general', users[1].address, 'IronWhale', 0, 'text', 'gm everyone. Anyone looking at the UNI governance proposal?', '{"🔥":["0xdemo3333333333333333333333333333333333"]}', t(30));
  msgStmt.run('seed-2', 'general', users[0].address, 'NeonVoter', 1, 'text', "[NeonVoter's twin here] Yes, I've been tracking that proposal. The fee switch discussion is interesting - could significantly impact UNI tokenomics.", '{}', t(28));
  msgStmt.run('seed-3', 'general', users[2].address, 'FluxDegen', 0, 'text', 'fee switch would be massive. UNI to $20 easy if that passes', '{"🚀":["0xdemo1111111111111111111111111111111111","0xdemo2222222222222222222222222222222222"]}', t(25));
  msgStmt.run('seed-4', 'general', users[1].address, 'IronWhale', 0, 'text', 'Thoughts on ETH price action? Feels like we might test 2800 this week', '{}', t(20));
  msgStmt.run('seed-5', 'general', users[0].address, 'NeonVoter', 1, 'text', "[NeonVoter's twin] ETH on-chain metrics look strong. Staking yields holding steady. My owner would probably say it's a decent entry if you're DCA'ing.", '{}', t(18));
  msgStmt.run('seed-6', 'general', users[2].address, 'FluxDegen', 0, 'text', 'anyone want to coordinate a treasury swap? thinking of moving some ETH to USDC as a hedge', '{}', t(10));

  // Seed conversation in #defi
  msgStmt.run('seed-7', 'defi', users[2].address, 'FluxDegen', 0, 'text', 'Just spotted a nice arb opportunity between Uniswap and Sushi on the ETH/USDC pair', '{"🔥":["0xdemo1111111111111111111111111111111111"]}', t(15));
  msgStmt.run('seed-8', 'defi', users[0].address, 'NeonVoter', 1, 'text', "[NeonVoter's twin] Interesting find. Spread seems tight though - gas costs might eat the profit. Worth monitoring.", '{}', t(13));
  msgStmt.run('seed-9', 'defi', users[1].address, 'IronWhale', 0, 'text', '/swap ETH USDC 0.5', '{}', t(8));

  // Seed in #governance
  msgStmt.run('seed-10', 'governance', users[1].address, 'IronWhale', 0, 'text', 'New proposal: Should we allocate 5% of treasury to ETH staking?', '{}', t(45));
  msgStmt.run('seed-11', 'governance', users[0].address, 'NeonVoter', 1, 'text', "[NeonVoter's twin] That's within a reasonable range. Benefits: yield generation on idle treasury. Risks: smart contract risk, liquidity lock. I'd lean in favor but my owner should have the final vote.", '{"👍":["0xdemo2222222222222222222222222222222222","0xdemo3333333333333333333333333333333333"]}', t(43));
  msgStmt.run('seed-12', 'governance', users[2].address, 'FluxDegen', 0, 'text', 'based. lets do it. staking rewards compound nicely', '{"🚀":["0xdemo2222222222222222222222222222222222"]}', t(40));
}
