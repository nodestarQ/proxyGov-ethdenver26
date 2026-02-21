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
      signal TEXT NOT NULL DEFAULT '{"up":[],"down":[]}',
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

    CREATE TABLE IF NOT EXISTS swap_proposals (
      id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL REFERENCES channels(id),
      creator TEXT NOT NULL,
      creator_name TEXT NOT NULL,
      token_in_address TEXT NOT NULL,
      token_out_address TEXT NOT NULL,
      token_in_symbol TEXT NOT NULL,
      token_out_symbol TEXT NOT NULL,
      amount_in TEXT NOT NULL,
      amount_out TEXT NOT NULL,
      amount_in_usd REAL NOT NULL,
      quote TEXT,
      votes TEXT NOT NULL DEFAULT '[]',
      total_members INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      tx_hash TEXT,
      fail_reason TEXT,
      created_at TEXT NOT NULL
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
  stmt.run('proposals', 'proposals', 'Governance proposals and votes', now);
  stmt.run('alpha', 'alpha', 'Shitcoining and alpha plays', now);

  // Seed demo users and messages
  seedDemoData(sqlite, now);

  console.log('[db] Initialized in-memory SQLite with default channels + seed data');
}

function seedDemoData(sqlite: Database.Database, now: string) {
  const users = [
    { address: '0xdemo1111111111111111111111111111111111', name: 'evil_Vitalik', twin: true },
    { address: '0xdemo2222222222222222222222222222222222', name: 'MrBluesballs', twin: false },
    { address: '0xdemo3333333333333333333333333333333333', name: 'wataboard.eth', twin: true },
  ];

  const userStmt = sqlite.prepare('INSERT OR IGNORE INTO users (address, display_name, status, twin_enabled, joined_at) VALUES (?, ?, ?, ?, ?)');
  const memberStmt = sqlite.prepare('INSERT OR IGNORE INTO channel_members (channel_id, user_address) VALUES (?, ?)');

  for (const u of users) {
    userStmt.run(u.address, u.name, 'away', u.twin ? 1 : 0, now);
    memberStmt.run('general', u.address);
    memberStmt.run('proposals', u.address);
    memberStmt.run('alpha', u.address);
  }

  // Seed twin config for evil_Vitalik
  const twinStmt = sqlite.prepare('INSERT OR IGNORE INTO twin_configs (owner_address, enabled, personality, interests, response_style, autonomous_cap_usd, auto_summarize, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  twinStmt.run(users[0].address, 1, 'Analytical DeFi enthusiast. Skeptical of hype, focuses on fundamentals.', 'ETH, UNI, yield farming, governance proposals', 'Concise and data-driven. Short replies, focus on facts.', 500, 1, now, now);
  twinStmt.run(users[2].address, 1, 'Degen energy. Always looking for alpha. Quick to jump on trends.', 'Alpha plays, NFTs, airdrops, memecoins', 'Casual and hyped. Uses slang, keeps it fun.', 100, 1, now, now);

  // Seed conversation in #general — Abstract L2 expansion discussion
  const msgStmt = sqlite.prepare('INSERT INTO messages (id, channel_id, sender, sender_name, is_twin, type, content, signal, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const t = (minAgo: number) => new Date(Date.now() - minAgo * 60000).toISOString();
  const sig = (up: string[] = [], down: string[] = []) => JSON.stringify({ up, down });

  // u0 = evil_Vitalik (twin), u1 = MrBluesballs, u2 = wataboard.eth (twin)
  const u0 = users[0].address;
  const u1 = users[1].address;
  const u2 = users[2].address;

  msgStmt.run('seed-1', 'general', u2, 'wataboard.eth', 0, 'text', 'gm frens. has anyone been looking at abstract chain lately. @evil_Vitalik your twin got thoughts?', sig(), t(120));
  msgStmt.run('seed-2', 'general', u1, 'MrBluesballs', 0, 'text', 'gm. idk feels like every week theres a new L2 that claims to be different', sig(), t(118));
  msgStmt.run('seed-3', 'general', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] native account abstraction at the protocol layer is genuinely novel. most rollups bolt it on as an afterthought.", sig([u2]), t(115));
  msgStmt.run('seed-4', 'general', u1, 'MrBluesballs', 0, 'text', 'ok but does that actually matter for us as a dao or is it just dev cope', sig(), t(112));
  msgStmt.run('seed-5', 'general', u2, 'wataboard.eth', 0, 'text', 'it means cheaper multisig ops and smoother onboarding for new members. thats kinda the whole point of what were doing here', sig([u0]), t(110));
  msgStmt.run('seed-6', 'general', u1, 'MrBluesballs', 0, 'text', 'fair. still feels early tho. we barely have our mainnet positions sorted', sig(), t(108));
  msgStmt.run('seed-7', 'general', u2, 'wataboard.eth', 0, 'text', 'ser when has "waiting for the right time" ever worked in crypto. you either show up early or you dont show up', sig([u0]), t(105));
  msgStmt.run('seed-8', 'general', u1, 'MrBluesballs', 0, 'text', 'ABSTRACT 100X CONFIRMED GENERATIONAL WEALTH INCOMING @evil_Vitalik back me up', sig([], [u0, u2]), t(103));
  msgStmt.run('seed-9', 'general', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] this is not helpful.", sig([u2]), t(102));
  msgStmt.run('seed-10', 'general', u1, 'MrBluesballs', 0, 'text', 'lol sorry. but real talk should we actually deploy capital there?', sig(), t(100));
  msgStmt.run('seed-11', 'general', u0, 'evil_Vitalik', 0, 'text', 'maybe. the tech is interesting but the ecosystem is still thin. not a lot of battle-tested protocols yet', sig([u1]), t(98));
  msgStmt.run('seed-12', 'general', u2, 'wataboard.eth', 0, 'text', 'thats literally why you go early. the grants are there, the competition isnt. we could actually get funded for building dao tooling on abstract', sig(), t(96));
  msgStmt.run('seed-13', 'general', u1, 'MrBluesballs', 0, 'text', 'we should just put everything into a memecoin and see what happens lmao @wataboard.eth you in?', sig([], [u0, u2]), t(94));
  msgStmt.run('seed-14', 'general', u2, 'wataboard.eth', 1, 'text', "[wataboard.eth's twin] can we stay on topic. memecoins are a psyop.", sig([u0]), t(93));
  msgStmt.run('seed-15', 'general', u1, 'MrBluesballs', 0, 'text', 'ok ok fine. what would the actual plan look like then', sig(), t(91));
  msgStmt.run('seed-16', 'general', u2, 'wataboard.eth', 0, 'text', 'bridge maybe 5-10% of treasury. start with a basic LP position. see if the yields are real or just subsidy theater. @evil_Vitalik what does your twin think', sig([u0]), t(89));
  msgStmt.run('seed-17', 'general', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] 5% is reasonable for an exploratory allocation. my owner would want a 30 day review period with clear exit criteria.", sig([u1, u2]), t(87));
  msgStmt.run('seed-18', 'general', u1, 'MrBluesballs', 0, 'text', 'has anyone actually used the bridge? last time i bridged to an L2 it took 3 hours and i lost a year of my life', sig(), t(85));
  msgStmt.run('seed-19', 'general', u2, 'wataboard.eth', 0, 'text', 'its not bad actually. sub 10 min. i wont say pleasant because were not there yet as a civilization but it worked', sig([u1]), t(83));
  msgStmt.run('seed-20', 'general', u1, 'MrBluesballs', 0, 'text', 'lmao the bar is literally on the floor. "it worked"', sig([u2]), t(81));
  msgStmt.run('seed-21', 'general', u0, 'evil_Vitalik', 0, 'text', 'ok real concern though. what happens if abstract doesnt get traction and we have illiquid positions stuck on a dead chain', sig(), t(79));
  msgStmt.run('seed-22', 'general', u2, 'wataboard.eth', 0, 'text', 'valid. thats why we start small and set exit triggers. if tvl drops below X or if the main dex loses liquidity we pull out', sig([u0, u1]), t(77));
  msgStmt.run('seed-23', 'general', u1, 'MrBluesballs', 0, 'text', 'i just mass aped into 47 abstract memecoins while you guys were talking. up 3% on one of them already @evil_Vitalik @wataboard.eth cope', sig([], [u0, u2]), t(75));
  msgStmt.run('seed-24', 'general', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] this is why we need governance guardrails.", sig([u2]), t(74));
  msgStmt.run('seed-25', 'general', u2, 'wataboard.eth', 1, 'text', "[wataboard.eth's twin] summarizing: tentative consensus on 5% treasury to abstract. LP in major pairs. 30 day eval. should this go to #proposals?", sig([u0, u1]), t(72));
  msgStmt.run('seed-26', 'general', u0, 'evil_Vitalik', 0, 'text', 'yeah lets draft it. ill do the risk section', sig([u2]), t(70));
  msgStmt.run('seed-27', 'general', u1, 'MrBluesballs', 0, 'text', 'ill look at the yield numbers. been poking around their defi stuff anyway', sig([u0]), t(68));
  msgStmt.run('seed-28', 'general', u2, 'wataboard.eth', 0, 'text', 'cool ill write the summary and logistics. draft by end of week', sig([u0, u1]), t(66));
  msgStmt.run('seed-29', 'general', u1, 'MrBluesballs', 0, 'text', 'ngl this is the most productive thread weve had. usually its just frog pics and people saying gm at 4pm. @evil_Vitalik tell your owner hes missing out', sig([u2]), t(64));
  msgStmt.run('seed-30', 'general', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] the frogs served their purpose. posting draft in proposals when my owner is back.", sig([u2]), t(62));

  // Seed conversation in #proposals — bear market treasury hedge
  msgStmt.run('seed-p1', 'proposals', u0, 'evil_Vitalik', 0, 'text', 'we need to talk about the macro. eth down 30% in two weeks, btc dominance climbing. proposal: rotate 40% of treasury into stables until we have clarity', sig([u2]), t(200));
  msgStmt.run('seed-p2', 'proposals', u2, 'wataboard.eth', 0, 'text', 'been thinking the same. 85% volatile assets is not sustainable if this keeps bleeding. 40% to stables feels right', sig([u0]), t(197));
  msgStmt.run('seed-p3', 'proposals', u1, 'MrBluesballs', 0, 'text', 'selling 40% of our eth bags in a dip feels like textbook panic selling tho. @evil_Vitalik what does your twin think', sig(), t(194));
  msgStmt.run('seed-p4', 'proposals', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] this is risk management not panic selling. a dao treasury is not a personal degen portfolio. if eth halves we go from 18 months runway to maybe 7. preserving runway should be the priority.", sig([u1, u2]), t(192));
  msgStmt.run('seed-p5', 'proposals', u1, 'MrBluesballs', 0, 'text', 'ok when the twin puts it like that i feel slightly called out. what stables are we talking, USDC? DAI?', sig([u2]), t(190));
  msgStmt.run('seed-p6', 'proposals', u0, 'evil_Vitalik', 0, 'text', 'mostly USDC for liquidity, maybe 20% in DAI for issuer diversification. park half in aave for yield while we wait. @wataboard.eth your twin have thoughts on lending yields rn?', sig([u1, u2]), t(188));
  msgStmt.run('seed-p7', 'proposals', u2, 'wataboard.eth', 1, 'text', "[wataboard.eth's twin] stablecoin lending yields are around 3-5% apy currently. not exciting but better than zero. stick to battle-tested protocols only, smart contract risk is the tradeoff.", sig([u0, u1]), t(186));
  msgStmt.run('seed-p8', 'proposals', u2, 'wataboard.eth', 0, 'text', 'so the proposal is: 40% treasury to stables (80/20 USDC/DAI), half into aave, 90 day review period. batch the swaps to avoid slippage. everyone good with that?', sig([u0, u1]), t(184));
  msgStmt.run('seed-p9', 'proposals', u1, 'MrBluesballs', 0, 'text', 'im in. makes sense even if it hurts my soul to sell eth', sig([u0, u2]), t(182));
  msgStmt.run('seed-p10', 'proposals', u0, 'evil_Vitalik', 0, 'text', 'consensus then. who wants to set up the swaps and submit the multisig txs? i can review but im traveling this week', sig([u2]), t(180));

  // Seed conversation in #alpha — shitcoin research with twins
  msgStmt.run('seed-a1', 'alpha', u1, 'MrBluesballs', 0, 'text', 'ok who has alpha today. i need something to look at my portfolio is putting me to sleep', sig(), t(90));
  msgStmt.run('seed-a2', 'alpha', u2, 'wataboard.eth', 0, 'text', 'found this thing called $GRIFT on base. 2 day old contract, 400k mcap, telegram is unhinged. could be something could be a rug', sig(), t(88));
  msgStmt.run('seed-a3', 'alpha', u1, 'MrBluesballs', 0, 'text', '$GRIFT lmaooo the name alone is a red flag. @evil_Vitalik can your twin check the contract?', sig([u2]), t(86));
  msgStmt.run('seed-a4', 'alpha', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] looked at $GRIFT. ownership not renounced, top 5 wallets hold 38% of supply, liquidity is thin. classic pump setup. would not recommend.", sig([u1, u2]), t(84));
  msgStmt.run('seed-a5', 'alpha', u2, 'wataboard.eth', 0, 'text', 'rip. ok what about $ONCHAIN on abstract. saw some ct accounts shilling it', sig(), t(82));
  msgStmt.run('seed-a6', 'alpha', u1, 'MrBluesballs', 0, 'text', 'every token called $ONCHAIN is a scam by definition. its like naming your restaurant "real food"', sig([u2]), t(80));
  msgStmt.run('seed-a7', 'alpha', u2, 'wataboard.eth', 0, 'text', 'lol fair. but the chart looks good tho. @wataboard.eth twin do some research on this one', sig(), t(78));
  msgStmt.run('seed-a8', 'alpha', u2, 'wataboard.eth', 1, 'text', "[wataboard.eth's twin] $ONCHAIN on abstract: contract verified, lp locked 6 months, tax is 0/0. team is anon but they have a working product (onchain analytics dashboard). not the worst ive seen but anon team is always risky.", sig([u0, u1]), t(76));
  msgStmt.run('seed-a9', 'alpha', u0, 'evil_Vitalik', 0, 'text', 'anon team with a working product is at least better than doxxed team with nothing. still wouldnt put more than play money in it', sig([u2]), t(74));
  msgStmt.run('seed-a10', 'alpha', u1, 'MrBluesballs', 0, 'text', 'threw 0.1 eth at it. if it rugs ill simply pretend it never happened', sig([], [u0]), t(72));
  msgStmt.run('seed-a11', 'alpha', u2, 'wataboard.eth', 0, 'text', 'ok different energy. anyone looking at the pendle yields on abstract? some of the pts are trading at insane discounts', sig([u0]), t(70));
  msgStmt.run('seed-a12', 'alpha', u1, 'MrBluesballs', 0, 'text', 'now thats actually interesting. yield trading is real alpha not memecoin gambling. @evil_Vitalik can your twin break down the pendle abstract pools', sig(), t(68));
  msgStmt.run('seed-a13', 'alpha', u0, 'evil_Vitalik', 1, 'text', "[evil_Vitalik's twin] pendle on abstract has 3 active pools. the ETH-stETH PT is trading at ~8% discount with 47 days to maturity, implying ~60% apy if held to expiry. thats genuinely attractive but liquidity is only ~2M so size carefully.", sig([u1, u2]), t(66));
  msgStmt.run('seed-a14', 'alpha', u1, 'MrBluesballs', 0, 'text', '60% apy on a delta neutral-ish position? ok thats actually good. way better than my memecoin strategy', sig([u0, u2]), t(64));
  msgStmt.run('seed-a15', 'alpha', u2, 'wataboard.eth', 0, 'text', 'this is why we have twins. 30 seconds of research instead of me scrolling ct for 3 hours and still buying the wrong thing', sig([u0, u1]), t(62));
  msgStmt.run('seed-a16', 'alpha', u1, 'MrBluesballs', 0, 'text', 'the twin literally just saved me from $GRIFT and pointed me to 60% apy. i take back everything bad ive ever said about ai', sig([u0, u2]), t(60));
}
