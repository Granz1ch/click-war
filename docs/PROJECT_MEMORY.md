# Click War — Project Memory

> Created for continuity between coding sessions. Read this FIRST before making
> changes. The repository at `/home/user/click-war` is the source of truth for
> all code; this file just tells you where things are and what's left.

---

## Quick start

```bash
cd /home/user/click-war
npm install
npm run dev            # http://localhost:3000
npm run build          # production build (works clean)
```

Default admin: **`admin` / `admin`** (override in `.env.local`).

---

## What this project is

A fullstack, neon-styled **online clicker game** ("Click War"). Players register
/login, create or join rooms, tap a coin to fill a shared treasury, hatch pets,
upgrade a personal skill tree, gain crystals through rebirth, redeem promos,
chat in-room, and get an admin panel. Designed for **Vercel** deployment with
real cross-home multiplayer via **Supabase**.

The app runs **right now with zero config** using a local file DB
(`data/db.json`). It **switches to Supabase automatically when the env vars are
set** (see `.env.example` + `supabase/schema.sql`).

---

## Architecture

- **Next.js 14 App Router** (page components + `app/api/**` route handlers).
- **Tailwind CSS** with a custom neon theme. Fonts (Orbitron / Rajdhani /
  Unbounded) load via `<link>` tags in `app/layout.js` and are exposed as CSS
  vars `--font-display` / `--font-game` / `--font-body` in `app/globals.css`.
- **Server logic** is split into `lib/`:
  - `auth.js` — scrypt password hashing + HMAC-signed httpOnly session cookie.
  - `db.js` — persistence layer. **All functions are async** (must be
    `await`ed). Uses Supabase when the env vars are set, otherwise a local
    JSON file (`data/db.json`). Supabase mode tracks every fetched entity in a
    working set and `commit()` diff-upserts only the ones that changed.
  - `game.js` — pure game logic (tap, hatch, upgrades, treasury, skills,
    rebirth, promos, admin actions).
  - `catalog.js` — pets, rarities, eggs, upgrades, skill tree.
  - `supabase.js` / `config.js` — Supabase connection scaffolding.
- **Client** uses a single `Providers` context (`components/Providers.js`) that
  holds the current user + an `api()` fetch helper + toasts.

---

## Important implementation notes (READ ONCE)

- **API routes live at:**
  - Auth: `app/api/auth/{register,login,logout,me}/route.js`
  - Rooms: `app/api/rooms/route.js` (list/create) and
    `app/api/rooms/[id]/{route,join,requests,leave,tap,hatch,upgrade,treasury,chat}/route.js`
  - Personal: `app/api/me/{skills,rebirth}/route.js`
  - Promo: `app/api/promo/route.js` · Catalog: `app/api/catalog/route.js`
  - Admin: `app/api/admin/{promos,rooms,users}/route.js` and
    `app/api/admin/rooms/[id]/issue/route.js`
- **Rooms are claimed via join request.** `POST /api/rooms/[id]/join` adds you
  to the `requests` array; the owner calls `POST /api/rooms/[id]/requests`
  with `{ userId, action: "accept"|"reject" }`.
- **Treasury mutations** go through `POST /api/rooms/[id]/treasury` with a
  `type` of `deposit|withdraw|pet_deposit|pet_withdraw`.
- **Tap power** = `(base + roomClickLevel + skillFinger + petClickBonus) * aura`.
  Computed in `lib/game.js#computeClickPower`.
- **Hatch luck** scales with pet luck bonuses, `u_fortune` upgrade, and the
  `s_luck` skill. Exclusive pets are extremely rare and give **+1 Star** each
  while in the treasury (`recalcStars`).
- **Dex completion** = owning every catalog pet at least once → sets
  `user.effects.nicknameEffect` + `specialFont`.
- **Rebirth** requires 2,500 total taps → awards crystals (capped at 100).
- **Promos** are **per-user** (one activation each; `usedBy` array). Rewards go
  to the user's current room treasury. Rewards shape:
  `{ coins?, crystals?, pets?: [{id, count}] }`.
- **Chat** lives in `lib/game.js#postChat`; route is
  `app/api/rooms/[id]/chat/route.js`. Messages sanitized (React escapes; `<`/`>`
  stripped server-side), stored on `room.chat` (capped at 100), `special` flag
  set when sender's dex is complete (unlocks glowing nickname + message font).
- **Brand assets:** `public/logo.png` (AI-generated mascot coin), referenced in
  `app/layout.js` metadata + landing/auth headers. Coin tap sprite is
  `public/coins/coin.svg`.
- **Admin** actions: block/unblock room, freeze/unfreeze treasury, ban/unban
  user, grant crystals/rewards, create promos, issue rewards to a room.

---

## Fix log

### 2026-09-01 — UI no longer teleports lobby↔room; site-wide stutter fixed

The game UI had an **infinite request loop** and **racing state updates**:

- `Providers.api` was recreated on every render, and `GameShell`'s load effect
  depended on both `user` and `api`. Every `setUser(me.user)` (new object each
  poll) re-triggered the effect → nonstop `/api/auth/me` + `/api/rooms/[id]`
  requests and re-renders (the "site is super laggy / updates buggy" bug).
- `onEnterRoom` used `setRoom(null)` + `router.push("/game?room=…")` +
  `setTimeout(loadRoom, 200)`. Meanwhile stale in-flight polls (fired before a
  room existed) resolved with `inRoomId: null` and flipped the UI back to the
  lobby — the "creating a room bounces me lobby↔room" bug.
- `GET /api/auth/me` excluded **blocked** rooms from `inRoomId`, so an admin
  block ejected everyone to the lobby and unblock pulled them back.

Fixes (keep these invariants!):

1. `Providers.js`: `api` is a stable `useCallback`; context value memoized.
2. `GameShell.js`: one stable `sync()` (mounted once + 5s interval while in a
   room). A monotonic `syncSeq` ref drops stale responses — only the newest
   sync mutates state. `setUser/setRoom/setMembers` only swap when the JSON
   actually changed. Entering a room = `await sync()`, no router/timeout hacks.
3. `api/auth/me`: `inRoomId` reflects membership regardless of `blocked`
   (blocked rooms pause gameplay via `room.blocked` checks; leave/tap routes
   already enforce that server-side).
4. `CoinTab.js`: post-tap refresh is coalesced (400 ms) so fast clicking does
   not spawn a request flood.

Rule of thumb for future work: **never** put `user` or `api` into effect deps
without memoization, and always guard polling updates against out-of-order
responses.

---

## Backend verification (all passed)

Manual curl test suite verified (auth, room create/join/accept, tap, hatch,
treasury deposit/withdraw, promo activate + duplicate-block, skill upgrade,
room upgrade, admin block/freeze/issue/grant). `npm run build` succeeds.

---

## Deploying to Vercel

1. Push to GitHub; import into Vercel; default Next.js preset.
2. Add Supabase env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `ADMIN_LOGIN`, `ADMIN_PASSWORD`).
3. Run `supabase/schema.sql` in the Supabase SQL Editor.

> Without Supabase, Vercel will run but persistence is in-memory (serverless
> read-only FS). Real cross-home multiplayer **requires** Supabase configured.

---

## Files you should not touch casually

- `data/db.json` — runtime state (gitignored).
- `lib/game.js` & `lib/catalog.js` — the game rules live here.
- `supabase/schema.sql` — keep in sync with `lib/db.js` shapes.

---

## Next steps (open backlog)

1. ~~Wire the actual Supabase data layer as a true drop-in for `lib/db.js`.~~
   ✅ Done — `lib/db.js` now auto-switches to Supabase when the env vars are
   set; the local JSON DB is the fallback when they aren't.
2. Add realtime room sync (Supabase Realtime / WebSocket) so the treasury
   updates live without polling. There's a 5 s polling tick as a stopgap
   (`components/game/GameShell.js`).
3. Add pet-reward creation UI in the admin panel (API supports it; UI only
   does coins/crystals currently).
4. Add an OG/social share image (placeholder logo already set in metadata).
5. Consider migrating fonts to `next/font` for build-time optimization (Google
   `<link>` works, but build may warn it can't download the font).
