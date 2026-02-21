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
  signal: { up: string[]; down: string[] }; // addresses that voted up/down
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
  autonomousCapUsd: number; // max USD value twin can act on autonomously
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

// ─── Swap Proposals ─────────────────────────────────────────
export type SwapProposalStatus = 'pending' | 'approved' | 'executing' | 'executed' | 'failed';

export interface SwapVote {
  voter: string;
  voterName: string;
  vote: 'yes' | 'no';
  isTwin: boolean;
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
  'message:signal': (data: { messageId: string; vote: 'up' | 'down'; address: string; action: 'add' | 'remove' }) => void;
  'user:join': (user: User) => void;
  'user:leave': (address: string) => void;
  'user:status': (data: { address: string; status: User['status'] }) => void;
  'twin:status': (data: TwinStatus) => void;
  'poll:update': (poll: Poll) => void;
  'price:update': (price: TokenPrice) => void;
  'channel:members': (data: { channelId: string; members: User[] }) => void;
  'user:typing': (data: { address: string; channelId: string; isTwin?: boolean }) => void;
  'user:stop-typing': (data: { address: string; channelId: string; isTwin?: boolean }) => void;
  'swap:update': (proposal: SwapProposalPayload) => void;
}

export interface ClientToServerEvents {
  'message:send': (data: { channelId: string; content: string; type?: MessageType }) => void;
  'message:signal': (data: { messageId: string; vote: 'up' | 'down' }) => void;
  'channel:join': (channelId: string) => void;
  'channel:leave': (channelId: string) => void;
  'user:authenticate': (data: { address: string; signature: string; message: string }) => void;
  'user:status': (status: User['status']) => void;
  'poll:vote': (data: { pollId: string; optionId: string }) => void;
  'user:typing': (channelId: string) => void;
  'user:stop-typing': (channelId: string) => void;
  'swap:vote': (data: { proposalId: string; vote: 'yes' | 'no' }) => void;
}

// ─── API Payloads ────────────────────────────────────────────────
export interface SwapProposalPayload {
  proposalId: string;
  tokenInSymbol: string;
  tokenOutSymbol: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  amountIn: string;
  amountOut: string;
  amountInUsd: number;
  quote?: UniswapQuote;
  votes: SwapVote[];
  totalMembers: number;
  status: SwapProposalStatus;
  txHash?: string;
  failReason?: string;
  createdAt: string;
  creator: string;
  creatorName: string;
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
