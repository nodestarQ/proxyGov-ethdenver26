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
  reactions: text('reactions').default('{}').notNull(), // JSON string
  timestamp: text('timestamp').notNull()
});

export const twinConfigs = sqliteTable('twin_configs', {
  ownerAddress: text('owner_address').primaryKey().references(() => users.address),
  enabled: integer('enabled', { mode: 'boolean' }).default(false).notNull(),
  personality: text('personality').default('').notNull(),
  interests: text('interests').default('[]').notNull(), // JSON array
  responseStyle: text('response_style', { enum: ['concise', 'detailed', 'casual'] }).default('concise').notNull(),
  maxSwapSizeEth: real('max_swap_size_eth').default(0.1).notNull(),
  autoSummarize: integer('auto_summarize', { mode: 'boolean' }).default(true).notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
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
