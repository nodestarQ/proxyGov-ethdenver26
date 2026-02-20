# proxyGov - ETHDenver 2026 BUIDLathon

DAO coordination chat app where each member has a human presence + an AI twin that stays active when the human is away.

## Project Structure

Monorepo with 3 services + shared types:

- `web/` - SvelteKit 5 (Svelte 5 runes) + TailwindCSS v4 frontend
- `backend/` - Express 5 + Socket.IO + Drizzle ORM (SQLite) API server
- `ai-agent/` - Express + Anthropic Claude SDK twin brain service
- `shared/` - TypeScript types shared across all services

## Commands

```bash
pnpm dev            # Start all 3 services concurrently
pnpm dev:web        # SvelteKit dev server (port 5173, proxies to backend)
pnpm dev:backend    # Express + Socket.IO (port 3002)
pnpm dev:agent      # AI twin service (port 3001)
pnpm build          # Build web frontend (adapter-static → web/build/)
pnpm docker:up      # Build web + docker compose up
```

## Architecture

```
Browser ←→ Socket.IO (ws://backend:3002) ←→ Backend ←→ AI Agent (http://ai-agent:3001)
       ←→ REST (/api/*)                          ←→ Uniswap API (external)
                                                  ←→ SQLite (in-memory)
```

- Web → Backend: Socket.IO for real-time chat + REST for CRUD
- Backend → AI Agent: Internal HTTP (respond, summarize, analyze)
- Backend → Uniswap: REST calls to Uniswap Trading API
- AI Agent → Claude: Anthropic SDK calls (claude-sonnet-4-20250514)

## Key Tech Decisions

- **Port 3002** for backend (3000 is occupied on dev machine)
- **Express v5** - uses `/{*path}` syntax for catch-all routes (not `*`)
- **Svelte 5 runes** - stores use `$state`, `$derived`, `$effect` (not legacy stores)
- **adapter-static** - SvelteKit builds to static files, served by backend in prod
- **In-memory SQLite** - resets on restart, seed data auto-loads
- **pnpm workspaces** - monorepo with `pnpm-workspace.yaml`
- **better-sqlite3** requires native rebuild: `pnpm --filter proxygov-backend rebuild better-sqlite3`

## UI / UX

**Mobile-first, Signal-style layout:**
- Phone-frame container (max-width 430px, centered on desktop with border rails)
- Full-width on mobile, uses `100dvh` for proper mobile viewport
- Screen-based navigation (no sidebar): channels → chat → twin → settings
- Directional slide transitions between screens (`svelte/transition` fly)
- `.phone-frame` class defined in `app.css`

**Screens:**
1. **Landing** - wallet connect (SIWE), shown when not connected
2. **Setup Account** (2-step onboarding, first-time users):
   - Step 1: avatar (emoji grid or upload) + username
   - Step 2: personality, interests, response style as free-text fields for AI twin (skip available)
3. **Channel List** - channel rows with unread badges, online members, twin toggle, profile avatar → settings
4. **Chat** - back button, channel header, message bubbles (Signal-style, own=right/dark, others=left/light), rounded pill input with send button
5. **Twin Config** - enable toggle, personality, interests, response style, max swap size
6. **Settings** - edit avatar + username, save changes, logout (danger color)

**Design tokens** (Tailwind v4 `@theme` in `web/src/app.css`):
- Light mode: bg `#d4ded1`, surface `#c8d4c5`, text/border/accent `#0d0d0d`
- Twin: purple `#7c3aed`
- Font: Satoshi (Fontshare CDN) + JetBrains Mono for code/addresses
- CSS utilities: `.crt-glow`, `.crt-border`, `.text-glow`, `.twin-glow`, `.phone-frame`

## Auth Flow

**Sign-In with Ethereum (SIWE):**
1. Frontend builds a SIWE-formatted message (domain, address, chain ID, timestamp)
2. MetaMask prompts user to sign the message
3. Signature + message sent via `user:authenticate` socket event
4. Backend verifies with viem `verifyMessage`, checks 5-min timestamp freshness
5. Rejects and disconnects on failure

**Profile setup:**
- After SIWE, `GET /api/user/:address` checks if profile exists (`avatarUrl` = setup complete)
- New users see the 2-step setup flow, returning users go straight to channels
- Profile stored via `PUT /api/user/:address` (displayName, avatarUrl as base64 data URL or emoji)

## Stores (Svelte 5 runes)

- `wallet.svelte.ts` - address, connected, chainId, signature, siweMessage
- `chat.svelte.ts` - messages, channels, activeChannel, members, unreadCounts, viewingChat flag
- `twin.svelte.ts` - twin config, load/save/updateField
- `profile.svelte.ts` - displayName, avatarUrl (set on login, updated from settings)

## API Routes (Backend)

- `GET /api/messages?channelId=` - fetch channel messages
- `POST /api/summarize` - proxy to AI agent for conversation summary
- `GET/PUT /api/twin/:address` - twin config CRUD (upsert)
- `GET /api/user/:address` - check profile existence
- `PUT /api/user/:address` - update displayName + avatarUrl (2MB body limit)
- `GET /api/uniswap/tokens` - available tokens
- `POST /api/uniswap/quote` - swap quote
- `GET /api/uniswap/price/:symbol` - token price
- `POST /api/poll` - create poll
- `PUT /api/poll/:pollId/vote` - vote on poll
- `GET /api/health` - health check

## Slash Commands (in chat)

- `/swap ETH USDC 0.01` - fetches Uniswap quote, renders SwapProposalCard
- `/price ETH` - inline price display
- `/poll "Question?" Option1, Option2` - creates poll card

## Socket.IO Events

Typed in `shared/types.ts` - `ServerToClientEvents` and `ClientToServerEvents`.

Client → Server: `user:authenticate` (address, signature, message), `channel:join`, `channel:leave`, `message:send`, `message:react`, `user:status`, `poll:vote`

Server → Client: `message:new`, `message:reaction`, `user:join`, `user:leave`, `user:status`, `twin:status`, `poll:update`, `price:update`, `channel:members`

All channels are joined on connect (not just active) so unread counts work across channels.

## Environment

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` - required for AI twin to work
- `UNISWAP_API_KEY` - optional, falls back to mock quotes

## Bounties

- **Futurllama** ($2K) - primary track, AI agent coordination
- **Uniswap API** ($5K) - sponsor bounty, real DeFi data integration
