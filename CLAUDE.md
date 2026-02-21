# TwinGovernance - ETHDenver 2026 BUIDLathon

DAO coordination chat app where each member has a human presence + a Twin (AI representation) that stays active when the human is away. The Twin follows conversations, responds on the user's behalf based on their personality/interests, and can autonomously sign off on DAO proposals (e.g. treasury swaps requiring multisig approval) within a user-defined spending cap.

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
- **better-sqlite3** requires native rebuild: `pnpm --filter twingovernance-backend rebuild better-sqlite3`

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
   - Step 1: avatar (cuboid `rounded-xs`, upload/change/remove) + username
   - Step 2: personality, interests, response style as accordion fields with per-field Save/Cancel (skip available)
3. **Channel List** - channel rows (`rounded-xs`) with inline unread pill badge, per-channel "Catch up" button (full-width dark bg below channel row), member list with ON/OFF status + divider + TWIN badge, "Your Twin" button (dark bg, centered text, status badge on right), profile avatar (cuboid) → settings
4. **Chat** - back button, channel header, Signal-style bubbles (`rounded-[18px]`), cuboid avatars (`rounded-xs`), signal voting pill, twin bubbles (transparent/dashed), card messages (swap-proposal, price, dao-balance, summary)
5. **Twin Config** - "What's a Twin?" accordion (dark bg header with info icon, light bg content), enable toggle (auto-saves), personality/interests/response style/autonomous cap as accordion fields with edit icon + per-field Save/Cancel (disabled until changed)
6. **Settings** - edit avatar (cuboid `rounded-xs`, upload/change/remove) + username, save changes, logout (danger color)

**Design system:**
- Less rounded: `rounded-xs` (2px) as default for cards, badges, buttons, toggles, avatars
- Chat bubbles: Signal-style `rounded-[18px]` with 4px grouped corners for speech-bubble tails
- Badges (TWIN, PRICE, SWAP PROPOSAL, DAO TREASURY, status): dark bg (`bg-text-primary`), light font (`text-bg`), bold, `rounded-xs`
- Twin chat bubbles: transparent bg with dashed border (`border-dashed border-border/40`), twin name bold
- Buttons (primary): dark bg, light font, bold, `rounded-xs`
- Buttons (secondary): transparent, dark border, dark font, bold, `rounded-xs`
- Editable fields use accordion pattern: edit icon (left) + label/description (center) + chevron (right), expand to reveal textarea + Save/Cancel buttons (disabled until changed)
- Enable Twin toggle: custom `rounded-xs` switch with ON/OFF label, auto-saves on toggle
- Member list: ON/OFF status text (fixed width) + divider + username + address + TWIN badge if enabled
- Signal voting pill: `rounded-[18px]`, matches bubble style
- Signal high score: thick dark border (`border-2 border-text-primary`) instead of green glow; low score fades with opacity
- Auto-scroll: only triggers on new messages (message count change), not on signal vote updates

**Design tokens** (Tailwind v4 `@theme` in `web/src/app.css`):
- Radii: xs=2px, sm=2px, md=3px, lg=4px, xl=6px, 2xl=8px, 3xl=10px
- Light mode: bg `#d4ded1`, surface `#c8d4c5`, text/border/accent `#0d0d0d`
- Twin: purple `#7c3aed` (used sparingly for mentions, not badges/bubbles)
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
- After SIWE, `GET /api/user/:address` checks if profile exists (`displayName` = setup complete)
- New users see the 2-step setup flow, returning users go straight to channels
- Profile stored via `PUT /api/user/:address` (displayName, avatarUrl as optional base64 data URL)
- Avatar is optional; initials placeholder shown when no photo uploaded

## Stores (Svelte 5 runes)

- `wallet.svelte.ts` - address, connected, chainId, signature, siweMessage
- `chat.svelte.ts` - messages, channels, activeChannel, members, unreadCounts, viewingChat flag, catchUpSummaries/Loading/Expanded (per-channel rolling context), typingUsers (tracks human vs twin typing separately)
- `twin.svelte.ts` - twin config, load/save/updateField, hasChanges (dirty tracking via savedConfig snapshot)
- `profile.svelte.ts` - displayName, avatarUrl (set on login, updated from settings)

## API Routes (Backend)

- `GET /api/messages?channelId=` - fetch channel messages
- `POST /api/summarize` - rolling context summarize (per-user, builds on previous context, returns `isUpToDate` when no new messages)
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
- `/price ETH` - renders PriceCard with token price (with token autocomplete in input)
- `/daobalance` - renders DaoBalanceCard with DAO treasury balances (ETH, WETH, USDC, UNI)
- `/poll "Question?" Option1, Option2` - creates poll card

## Socket.IO Events

Typed in `shared/types.ts` - `ServerToClientEvents` and `ClientToServerEvents`.

Client → Server: `user:authenticate` (address, signature, message), `channel:join`, `channel:leave`, `message:send`, `message:react`, `user:status`, `poll:vote`, `user:typing`, `user:stop-typing`

Server → Client: `message:new`, `message:signal`, `user:join`, `user:leave`, `user:status`, `twin:status`, `poll:update`, `price:update`, `channel:members`, `user:typing` (with optional `isTwin` flag), `user:stop-typing` (with optional `isTwin` flag)

Typing events include an `isTwin?: boolean` field on server→client payloads. Twin typing is emitted by the backend during AI agent processing in `checkTwinResponses`. The frontend tracks human and twin typing separately and renders twin typing with purple styling and a TWIN badge.

All channels are joined on connect (not just active) so unread counts work across channels.

## Environment

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` - required for Twin to work
- `UNISWAP_API_KEY` - optional, falls back to mock quotes
- `SKIP_AUTH=true` + `VITE_SKIP_AUTH=true` + `VITE_DEV_ADDRESS=0x...` - skip MetaMask/SIWE in dev mode

## Bounties

- **Futurllama** ($2K) - primary track, AI agent coordination
- **Uniswap API** ($5K) - sponsor bounty, real DeFi data integration
