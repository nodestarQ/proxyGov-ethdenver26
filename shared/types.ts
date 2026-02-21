// ─── User & Wallet ───────────────────────────────────────────────
export interface User {
  address: string;
  ensName?: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'away' | 'offline';
  twinEnabled: boolean;
  joinedAt: string;
}

// ─── Messages ────────────────────────────────────────────────────
export type MessageType = 'text' | 'swap-proposal' | 'poll' | 'summary' | 'opportunity' | 'system';

export interface Message {
  id: string;
  channelId: string;
  sender: string;          // wallet address
  senderName: string;
  isTwin: boolean;         // sent by AI twin on behalf of owner
  type: MessageType;
  content: string;         // text or JSON payload
  reactions: Record<string, string[]>; // emoji → [addresses]
  timestamp: string;
}

// ─── Channels ────────────────────────────────────────────────────
export interface Channel {
  id: string;
  name: string;
  description?: string;
  members: string[];       // wallet addresses
  createdAt: string;
}

// ─── AI Twin ─────────────────────────────────────────────────────
export interface TwinConfig {
  ownerAddress: string;
  enabled: boolean;
  personality: string;     // free-text personality description
  interests: string;       // free-text interests/topics
  responseStyle: string;   // free-text response style
  maxSwapSizeEth: number;  // max swap twin can propose
  autoSummarize: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TwinStatus {
  ownerAddress: string;
  enabled: boolean;
  lastActive?: string;
  messagesSent: number;
}

// ─── Uniswap / DeFi ─────────────────────────────────────────────
export interface UniswapQuote {
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  amountOut: string;
  priceImpact: string;
  gasEstimate: string;
  route: string;
  timestamp: string;
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoUrl?: string;
}

export interface TokenPrice {
  symbol: string;
  address: string;
  priceUsd: number;
  change24h?: number;
  timestamp: string;
}

// ─── Polls ───────────────────────────────────────────────────────
export interface Poll {
  id: string;
  channelId: string;
  creator: string;
  question: string;
  options: PollOption[];
  expiresAt?: string;
  createdAt: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];         // wallet addresses
}

// ─── Socket.IO Events ───────────────────────────────────────────
export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:reaction': (data: { messageId: string; emoji: string; address: string; action: 'add' | 'remove' }) => void;
  'user:join': (user: User) => void;
  'user:leave': (address: string) => void;
  'user:status': (data: { address: string; status: User['status'] }) => void;
  'twin:status': (data: TwinStatus) => void;
  'poll:update': (poll: Poll) => void;
  'price:update': (price: TokenPrice) => void;
  'channel:members': (data: { channelId: string; members: User[] }) => void;
}

export interface ClientToServerEvents {
  'message:send': (data: { channelId: string; content: string; type?: MessageType }) => void;
  'message:react': (data: { messageId: string; emoji: string }) => void;
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  'user:authenticate': (data: { address: string; signature: string; message: string }) => void;
  'user:status': (status: User['status']) => void;
  'poll:vote': (data: { pollId: string; optionId: string }) => void;
}

// ─── API Payloads ────────────────────────────────────────────────
export interface SwapProposalPayload {
  tokenIn: string;   // symbol
  tokenOut: string;   // symbol
  amount: string;
  quote?: UniswapQuote;
}

export interface SummaryPayload {
  channelId: string;
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  mentionedTokens: string[];
  messageCount: number;
  timeRange: { from: string; to: string };
  isUpToDate?: boolean;
}

export interface OpportunityPayload {
  type: 'defi' | 'governance' | 'alpha';
  title: string;
  description: string;
  relevance: string;
  urgency: 'low' | 'medium' | 'high';
  relatedTokens?: string[];
}
