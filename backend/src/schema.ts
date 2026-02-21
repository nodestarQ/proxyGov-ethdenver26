import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  address: text('address').primaryKey(),
  displayName: text('display_name').notNull(),
  ensName: text('ens_name'),
  avatarUrl: text('avatar_url'),
  status: text('status', { enum: ['online', 'away', 'offline'] }).default('offline').notNull(),
  twinEnabled: integer('twin_enabled', { mode: 'boolean' }).default(false).notNull(),
  joinedAt: text('joined_at').notNull()
});

export const channels = sqliteTable('channels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull()
});

export const channelMembers = sqliteTable('channel_members', {
  channelId: text('channel_id').notNull().references(() => channels.id),
  userAddress: text('user_address').notNull().references(() => users.address)
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  sender: text('sender').notNull(),
  senderName: text('sender_name').notNull(),
  isTwin: integer('is_twin', { mode: 'boolean' }).default(false).notNull(),
  type: text('type', { enum: ['text', 'swap-proposal', 'poll', 'summary', 'opportunity', 'system'] }).default('text').notNull(),
  content: text('content').notNull(),
  signal: text('signal').default('{"up":[],"down":[]}').notNull(), // JSON string
  timestamp: text('timestamp').notNull()
});

export const twinConfigs = sqliteTable('twin_configs', {
  ownerAddress: text('owner_address').primaryKey().references(() => users.address),
  enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
  personality: text('personality').default('').notNull(),
  interests: text('interests').default('').notNull(),
  responseStyle: text('response_style').default('').notNull(),
  autonomousCapUsd: real('autonomous_cap_usd').default(100).notNull(),
  autoSummarize: integer('auto_summarize', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const channelContexts = sqliteTable('channel_contexts', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  userAddress: text('user_address').notNull().references(() => users.address),
  summary: text('summary').notNull(),
  keyTopics: text('key_topics').notNull().default('[]'),       // JSON string
  actionItems: text('action_items').notNull().default('[]'),   // JSON string
  mentionedTokens: text('mentioned_tokens').notNull().default('[]'), // JSON string
  messageCount: integer('message_count').notNull().default(0),
  lastMessageTimestamp: text('last_message_timestamp').notNull(),
  createdAt: text('created_at').notNull()
});

export const swapProposals = sqliteTable('swap_proposals', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  creator: text('creator').notNull(),
  creatorName: text('creator_name').notNull(),
  tokenInAddress: text('token_in_address').notNull(),
  tokenOutAddress: text('token_out_address').notNull(),
  tokenInSymbol: text('token_in_symbol').notNull(),
  tokenOutSymbol: text('token_out_symbol').notNull(),
  amountIn: text('amount_in').notNull(),
  amountOut: text('amount_out').notNull(),
  amountInUsd: real('amount_in_usd').notNull(),
  quote: text('quote'), // JSON string
  votes: text('votes').notNull().default('[]'), // JSON string
  totalMembers: integer('total_members').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'executing', 'executed', 'failed'] }).default('pending').notNull(),
  txHash: text('tx_hash'),
  failReason: text('fail_reason'),
  createdAt: text('created_at').notNull()
});

export const polls = sqliteTable('polls', {
  id: text('id').primaryKey(),
  channelId: text('channel_id').notNull().references(() => channels.id),
  creator: text('creator').notNull(),
  question: text('question').notNull(),
  options: text('options').notNull(), // JSON string
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull()
});
