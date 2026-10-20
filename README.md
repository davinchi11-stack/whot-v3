# Naija Whot — multiplayer Nigerian Whot (React/Vite + Socket.IO, one Node process, no database)

Play Nigerian Whot with 2–4 friends in real time. No accounts, no database. One repository, one Node.js process:
`vite build` produces the static React app in `dist/`, and `server.ts` serves it **and** runs Socket.IO and all game rooms.
With the frontend on Vercel, the same `server.ts` runs on Render in API-only mode (sockets + rooms). See Deployment.

## Quick start

```bash
npm install
cp .env.example .env        # optional; defaults work
npm run dev                 # open http://localhost:5173  (Vite UI + Node/Socket.IO server on :3000, proxied)
```

Production:

```bash
npm run build
npm start                   # http://localhost:3000 — serves dist/ + Socket.IO from one process
```

Tests and checks:

```bash
npm test          # Node's built-in test runner (Node >= 22.6); engine, rooms, handlers
npm run typecheck # tsc --noEmit
```

**Play with multiple browsers/devices:** open `http://localhost:5173` (dev) or `:3000` (production start) in one window, create a room, then open the invite
link (or enter the 5-character code) in other windows or on phones on the same network
(`http://<your-LAN-IP>:5173` in dev). Reconnect tokens are stored in `sessionStorage`, so each tab is its own player and a
reload of a tab rejoins the same seat.

## Environment (`.env.example`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Listening port (most hosts inject this). |
| `HOST` | `0.0.0.0` | Bind address. |
| `RECONNECT_GRACE_MS` | `60000` | How long a disconnected player keeps their seat. |
| `ROOM_IDLE_MS` | `600000` | How long a room with nobody connected survives. |
| `ALLOWED_ORIGINS` | *(empty)* | Exact browser origins allowed to connect (CORS **and** WebSocket upgrade). Required when the frontend is on Vercel. Empty = no restriction (same-origin deploys). |
| `VITE_SOCKET_URL` | *(unset)* | **Frontend (Vercel) only.** Public URL of the game server. |

A `/healthz` endpoint returns `ok` for host health checks.

## Deployment

### Recommended: frontend on Vercel + game server on Render

Vercel cannot run Socket.IO or hold in-memory rooms, so it hosts only the static React app. The Node server (sockets +
rooms) runs on Render. Deploy the **server first** so you have its URL.

**1. Render (game server)** — New **Web Service** from this repo:
* Build Command: `npm install`  ·  Start Command: `npm start`  ·  **1 instance**
* Env vars: `NODE_VERSION=22`, and `ALLOWED_ORIGINS=https://<your-project>.vercel.app` (add your custom domain too, comma-separated).
  You'll set this after you know the Vercel URL, then redeploy the service.
* Check `https://<service>.onrender.com/healthz` returns `ok`. With no `dist/` the server runs in API-only mode.

**2. Vercel (frontend)** — Import the same repo. Framework preset: Vite (auto-detected; `vercel.json` sets the build and the
SPA rewrite so `/join/ABCDE` invite links work). Add env var **`VITE_SOCKET_URL=https://<service>.onrender.com`**
(no trailing slash) for Production (and Preview if you use it), then deploy. `VITE_*` values are baked in at build time, so
changing it needs a redeploy.

Invite links use the Vercel domain automatically. The server rejects browsers from any origin not in `ALLOWED_ORIGINS`.
Render's free plan sleeps after ~15 min idle: the first visit can take up to a minute to connect, and a sleep erases all rooms.
Use a paid instance for real play.

### Alternative: everything on one host
Run `npm run build && npm start` on any persistent Node host (Render, Railway, Fly.io, VPS); `server.ts` serves `dist/`
and sockets from one port, no `VITE_SOCKET_URL`/`ALLOWED_ORIGINS` needed. **Run a single instance** — rooms live in one
process's memory, so replicas would split players across servers.

### No persistence (by design)
All rooms, hands, decks, scores and reconnect tokens are in server memory. **A restart, crash or redeploy erases every
active room and game.** Clients that try to reconnect afterwards are told their room has ended. Many hosts also sleep
free instances after inactivity, which has the same effect.

## Architecture

```
server.ts                 one http.Server: static files from dist/ (SPA fallback) + Socket.IO
server/static.ts          tiny static file server with traversal protection and /join/CODE fallback
src/main.tsx, index.html  Vite entry (reads /join/CODE invite links)
server/roomManager.ts     rooms, seats, reconnect tokens, validation, grace/idle sweeping (pure, no socket.io import)
server/socketHandlers.ts  typed event wiring, rate limiting, per-player broadcast
lib/game/                 engine (deck, rules, transitions, scoring) — no React, no Socket.IO, no Node APIs
lib/game/view.ts          sanitizeGame(): the ONLY way game state reaches a client
lib/socket/               shared event types + client hook (useWhot)
components/ui/            shadcn/ui primitives (Radix + Tailwind v4 + cva), hand-written in shadcn's style
components/game|lobby     game table, cards, reactions, lobby, settings
styles/globals.css        Tailwind v4 + shadcn theme tokens (maroon/cream/felt) + Whot card art
tests/                    engine, room manager, handler tests
```

Security/privacy: identity is the server-side socket→seat binding created by create/join/reconnect (never a
client-supplied player id). Reconnect tokens are 192-bit random, stored only as SHA-256 hashes, compared in constant time,
and never included in any broadcast. Clients receive their own hand, opponents' card *counts*, the top card, public
history, and settings — never other hands or market order. Actions carry the game `version` and a unique `actionId`:
stale or repeated events are rejected. Inputs are validated server-side; each socket is rate-limited.

## Design and reactions

* **shadcn/ui + Tailwind v4.** `components.json`, `lib/utils.ts` (`cn`) and `components/ui/*` follow shadcn's new-york style (Button, Card,
  Dialog, Popover, Tabs, Switch, ToggleGroup, Tooltip, Badge, Input, Label). They were written by hand (no network in the build
  sandbox), so `npx shadcn@latest add <component>` will work for adding more but wasn't used to generate these.
* **Cards follow real Whot decks** (researched via Wikipedia, BoardGameGeek-derived pages and museum catalogue entries; images could
  not be viewed, so this is based on written descriptions): bold number top-left mirrored bottom-right, one large symbol,
  a printed double border, a **doubled value number inside Star symbols**, a **crown** on the Whot-20 card, and a single-colour
  art-deco style back carrying the WHOT wordmark. Symbols stay maroon on cream per the brief (modern commercial decks colour each
  shape differently; shapes are still distinguishable by silhouette and label).
* **Montserrat** is the app font (loaded from Google Fonts in `index.html`, with system fallbacks).
* **Cards show only number and shape** (plus the crown/WHOT on the Whot card): no effect text. Pick alerts, the DEFEND button and the
  PICK 2 / PICK 3 flash live in the table UI and always show the live penalty total (stacking included). The market is a single stacked
  pile (one layer per card, up to five); the discard pile shows the top card with edges beneath.
* **Emoji reactions.** A *React* button (lobby, table, results) opens a 12-emoji picker. Reactions float above the sender's seat for
  everyone in the room. Server side: only whitelisted ids from `lib/game/reactions.ts` are accepted (never raw text), 1.2 s per-player
  cooldown plus the per-socket rate limit, members only, ephemeral (not stored in game state or history).

## Rules implemented

Deck (54 cards) — **verified against Wikipedia "Whot!" and Pagat "Whot!"**, which agree (checked 2026-10-15):

| Shape | Numbers | Count |
|---|---|---|
| Circle | 1 2 3 4 5 7 8 10 11 12 13 14 | 12 |
| Triangle | 1 2 3 4 5 7 8 10 11 12 13 14 | 12 |
| Cross | 1 2 3 5 7 10 11 13 14 | 9 |
| Square | 1 2 3 5 7 10 11 13 14 | 9 |
| Star | 1 2 3 4 5 7 8 | 7 |
| Whot (20) | — | 5 |

Sources note that other packs exist (e.g. British packs have 4 Whot cards = 53). The distribution is plain data in
`lib/game/deck.ts` (`DECK_DISTRIBUTION`, `WHOT_COUNT`) — edit it there; nothing else hard-codes it.

Special cards:

* **1 Hold On** — everyone else is skipped, same player plays again.
* **2 Pick 2** / **5-card** — next player draws unless they defend (see below).
* **8 Suspension** — next player skipped (setting; on by default; in 2-player it returns to you).
* **14 General Market** — everyone else draws 1; the player plays again (setting).
* **Whot (20)** — playable on anything except an active penalty; you call a shape; the next player must follow it or play Whot.

### Decisions you should know about

* **"Pick 5" vs "Pick 3".** Both sources say the Nigerian 5-card is **Pick 3**. Because your brief says "Pick 5", this is a
  setting: *5-card penalty = Pick 3 (traditional, default) or Pick 5*. All UI text follows the setting.
* **Scoring (both modes): the SUM OF CARD VALUES left in hand, lowest total wins.** A card is worth its printed number and Whot is 20
  (never the number of cards). Example: 2 + 12 + 20 = 34 loses to 1 + 4 + 5 = 10. Optional setting *Stars count double* (off by default).
  Ties share the round win. Totals are computed on the server from the real hands and sent in the result (each player's remaining cards,
  per-card values and total).
* **Rollover:** the round ends the moment someone plays their last card (they score 0). The final card's effect doesn't apply. Optional
  setting forbids finishing on a special card. When the market empties, the discard pile (minus the top card) is reshuffled. If no cards
  remain anywhere and nobody can move for a full round, it ends as a *stalemate* (lowest total wins).
* **Count:** the round ends when someone plays their last card **or** the market is exhausted (the market is never reshuffled in Count mode;
  it ends at the moment the market hits 0, even mid-penalty or mid-General-Market, and players draw what remains). Then everyone counts
  their hand and the lowest total wins. *(This replaces the earlier "most cards wins" house rule, per the latest brief.)*
* **Cumulative scoreboard (golf-style):** after each round every player's remaining-card total is **added** to their running total, so
  lower is better both per round and overall and the board can never contradict a round result. The player who goes out adds 0. Wins are
  also tallied. "Next round" (rematch) keeps scores; starting a game from the lobby ("New game") resets them. Scores live on the server and
  are broadcast with every room update; the round is added exactly once, including forfeit endings.
* **Defence:** *off* → a penalty must be drawn, no card can answer it. *On + stacking* → each defence adds (2+2=4, 2+5-card…)
  and the first player who doesn't defend draws the total. *On, no stacking* → a defence **passes the same single penalty
  on** (it does not accumulate). *Compatibility:* "a 2 can answer…" / "a 5 can answer…" = same-only or any penalty card.
  After a penalty is drawn, the turn passes to the next player (the penalised player's turn is used up) and normal matching applies.
* **After drawing you may not play** that turn (Pagat's rule). The first table card is the first non-special card from the market.
* **Not implemented:** "semi-last card / last card / check up" calls and their penalties, straights/double-decking, star-8
  skipping two players, multi-round scoring. These vary by household and weren't in the brief.
* **Players leaving:** a disconnected player's seat is held for `RECONNECT_GRACE_MS`; the game waits (if it's their turn).
  When the grace expires (or they leave), their cards go back to the market, play continues, and if one player remains
  that player wins by forfeit.
* Host-only actions: start, change settings, remove players (lobby), rematch (rotates who goes first), return to lobby.

## Test status — what has and hasn't been verified

Run in the build sandbox (no internet access, so `vite`, `tailwindcss`, `radix-ui`, `socket.io`, `lucide-react` could not be installed):

* ✅ `npm test`: **94 tests passing** — deck composition, deal, matching, every special card, defence on/off, stacking
  on/off, penalty compatibility, direction change, empty-market behaviour, rollover & count (both winner rules, ties),
  final-card effects, forfeits, sanitized views/privacy, room manager (invalid/full rooms, authorization, duplicate and
  stale actions, reconnect incl. wrong tokens, grace expiry, idle cleanup, rematch), simulated full 2/3/4-player games in both modes,
  socket handlers via an in-process fake transport, and the static file server over real loopback HTTP.
* ✅ `lib/` and `server/` (except `server.ts`/`static.ts`) type-check under `tsc --strict`.
* ✅ The frontend entry bundles with esbuild (all imports resolve; no server-only code in the client bundle).
* ✅ UI components render via `react-dom/server` **with stand-in stubs for Radix/lucide/cva** (checks my component code and data flow, not Radix itself) for 2/3/4 players (lobby, table, results, home, forms, dialog), and no
  opponent card ids appear in the rendered DOM.
* ❌ **Not run:** `npm install`, `vite build`, the full-project `tsc` (needs `@types/*`), Tailwind/CSS compilation, a real browser, and a
  **live Socket.IO multi-client test over real sockets**. `server.ts` has never been started. Expect small fixes on the first
  real `npm run dev` / `npm run build`.
* Dependency version ranges are untested. The visual design has not been seen in a browser.
