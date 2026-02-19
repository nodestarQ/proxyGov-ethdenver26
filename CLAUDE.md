# proxyGov — ETHDenver 2026 BUIDLathon

DAO coordination chat app where each member has a human presence + an AI twin that stays active when the human is away.

## Project Structure

Monorepo with 3 services + shared types:

- `web/` — SvelteKit 5 (Svelte 5 runes) + TailwindCSS v4 + Bits UI frontend
- `backend/` — Express 5 + Socket.IO + Drizzle ORM (SQLite) API server
- `ai-agent/` — Express + Anthropic Claude SDK twin brain service
- `shared/` — TypeScript types shared across all services

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
- **Express v5** — uses `/{*path}` syntax for catch-all routes (not `*`)
- **Svelte 5 runes** — stores use `$state`, `$derived`, `$effect` (not legacy stores)
- **adapter-static** — SvelteKit builds to static files, served by backend in prod
- **In-memory SQLite** — resets on restart, seed data auto-loads
- **pnpm workspaces** — monorepo with `pnpm-workspace.yaml`
- **better-sqlite3** requires native rebuild: `pnpm --filter proxygov-backend rebuild better-sqlite3`

## Environment

Copy `.env.example` to `.env` and fill in:
- `ANTHROPIC_API_KEY` — required for AI twin to work
- `UNISWAP_API_KEY` — optional, falls back to mock quotes

## Design System

- Font: Satoshi (loaded from Fontshare CDN)
- Theme: Dark (#0a0a0a bg), green accent (#00ff88), CRT/Gameboy aesthetic
- Twin messages: purple (#a78bfa) with glow effect
- CSS classes: `.crt-glow`, `.crt-border`, `.text-glow`, `.twin-glow`
- Tailwind theme tokens defined in `web/src/app.css` under `@theme`

## Slash Commands (in chat)

- `/swap ETH USDC 0.01` — fetches Uniswap quote, renders SwapProposalCard
- `/price ETH` — inline price display
- `/poll "Question?" Option1, Option2` — creates poll card

## Socket.IO Events

Typed in `shared/types.ts` — `ServerToClientEvents` and `ClientToServerEvents`. Key events: `message:new`, `message:send`, `message:react`, `user:join`, `user:status`, `twin:status`, `price:update`.

## Bounties

- **Futurllama** ($2K) — primary track, AI agent coordination
- **Uniswap API** ($5K) — sponsor bounty, real DeFi data integration
