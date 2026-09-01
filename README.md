# 🪙 Click War

A neon fantasy **online clicker** built with **Next.js (App Router)**. Tap a coin
to mine coins into a shared room treasury, hatch rare pets, upgrade your skill
tree, and conquer the starboard with friends — all playable over the network
from different homes.

> **Stack:** Next.js 14 · React 18 · Tailwind CSS · Supabase (optional, for
> real cross-home persistence) · built-in file DB for local dev/preview.

---

## ✨ Features

- **Accounts** — register/login with a login + password. Sessions persist via a
  signed httpOnly cookie. All data survives reloads.
- **Rooms** — create a room with a name, a 1–4 char tag, and a max player count.
  Others request to join; the owner accepts/rejects. Accepted players get the
  room tag.
- **Treasury** — every room has a shared treasury (coins, crystals, pets, stars).
  Deposit/withdraw coins and pets, upgrade capacity, and earn **+1 Star** for
  each **Exclusive** pet held in the treasury.
- **Tapping** — tap the coin to add your tap power to the treasury. Buy room
  upgrades: click power, auto-miner, energy core, fortune, treasury vault, and
  pet storage.
- **Pets & hatching** — spend coins on eggs (Basic / Golden / Celestial) to hatch
  pets across **7 rarities** (Common → Uncommon → Rare → Epic → Legendary →
  Mythic → **Exclusive**). Pets give click + luck boosts. Complete the **dex**
  (own every pet at least once) to unlock a glowing nickname and a special font.
- **Skill tree** — **Rebirth** at 2,500 total taps to earn **crystals**, then
  spend them on permanent personal upgrades (Iron Finger, Blessed Fate, Endless
  Energy, Turbo Hands, Radiant Aura).
- **Promo codes** — redeem codes for coins/crystals/pets into your room treasury.
  One activation **per user** (not per room).
- **Admin panel** — a seeded `admin` account can block and freeze rooms, ban
  users, grant rewards, and create custom promo codes.

---

## 🚀 Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

The app runs with a **built-in file database** (`data/db.json`) so it works with
**zero configuration**. It automatically switches to **Supabase** when you set
the connection vars (see below).

### Default admin account

| Login | Password |
| ----- | -------- |
| `admin` | `admin` |

> Change these in `.env.local` (`ADMIN_LOGIN` / `ADMIN_PASSWORD`).

---

## ☁️ Deploy to Vercel

This is a standard Next.js app — deploy straight from the GitHub repo.

1. Push this repo to GitHub.
2. In Vercel: **New Project → Import** your repo. Keep the default Next.js
   preset (build: `next build`).
3. Add the environment variables below in **Project → Settings → Environment
   Variables**.
4. Deploy. 🎉

> Without Supabase configured, the app still runs, but persistence is
> in-memory (serverless has a read-only filesystem). For **durable, real
> cross-home multiplayer**, configure Supabase (next section).

---

## 🗄️ Connect Supabase

The game ships with full Supabase scaffolding. You connect it yourself — the
app **does not** know your project URL until you supply it.

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor** and run the contents of **`supabase/schema.sql`**.
3. Copy your **Project URL**, **anon key**, and **service role key** from
   **Project Settings → API**.

### Environment variables (Vercel → Project → Settings → Environment Variables)

| Variable | Where | Purpose |
| -------- | ----- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Service-role key (writes) |
| `AUTH_SECRET` | server | Signs session cookies |
| `ADMIN_LOGIN` / `ADMIN_PASSWORD` | server | Seeded admin account |

You can also copy `.env.example` → `.env.local` and fill it in for local
development.

> Security note: never expose the **service role key** to the browser.
> Keep it as a server-only env var.

---

## 🧱 Project structure

```
app/                     # pages + API routes (App Router)
  api/                   # REST endpoints
  game/                  # game dashboard page
  login/ register/       # auth pages
  page.js                # landing page
components/              # UI components
  game/                  # game tabs (coin, hatch, treasury, dex, skills, promo, members, admin)
lib/                     # server/client logic
  auth.js                # password hashing + signed cookies
  db.js                  # persistence layer (local file OR Supabase)
  game.js                # core game logic
  catalog.js             # pets, rarities, eggs, upgrades, skill tree
  supabase.js            # Supabase client wiring
  config.js              # central config (Supabase URL, etc.)
supabase/schema.sql      # Supabase SQL schema + RLS
public/coins/coin.svg    # coin asset
```

---

## 🤝 How multiplayer works

Because everything lives on one shared backend (Supabase in production),
friends join the same room by **tag** and see the same treasury in real time.
Open a room, share the tag, and they request join — the owner accepts, then
everyone taps together into the same pool.

---

## License

MIT — do whatever you want with it. Have fun tapping! 🪙
