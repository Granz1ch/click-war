// ============================================================
//  Click War — direct PostgreSQL connection (Supabase Postgres)
//  ------------------------------------------------------------
//  Used when DATABASE_URL (or POSTGRES_URL) is set. This is the
//  recommended production backend: it needs nothing but the
//  connection string Supabase gives you under
//      Project Settings -> Database -> Connection string
//
//  Works on serverless (Vercel / AWS Lambda) because the pool is
//  cached on globalThis and reused between warm invocations.
// ============================================================
import pg from "pg";

const { Pool } = pg;

// Supabase returns bigint columns as strings by default (pg type 20).
// The game treats them as plain numbers.
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));

function rawUrl() {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL ||
    ""
  ).trim();
}

export function isPgEnabled() {
  const url = rawUrl();
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

// Serverless-safe singleton.
const globalForPg = globalThis;

export function getPool() {
  if (!isPgEnabled()) return null;
  if (globalForPg.__clickWarPool) return globalForPg.__clickWarPool;

  const connectionString = rawUrl();

  const pool = new Pool({
    connectionString,
    // Supabase requires TLS but serves a certificate signed by its own CA.
    ssl: { rejectUnauthorized: false },
    max: Number(process.env.PG_POOL_MAX || 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
    keepAlive: true,
  });

  pool.on("error", (e) => {
    console.error("[pg] idle client error:", e.message);
  });

  globalForPg.__clickWarPool = pool;
  return pool;
}

export async function query(text, params = []) {
  const pool = getPool();
  if (!pool) throw new Error("PostgreSQL is not configured (DATABASE_URL missing).");
  return pool.query(text, params);
}

// ---- schema bootstrap (idempotent, runs once per cold start) ----
const SCHEMA_SQL = `
create extension if not exists "pgcrypto";

create table if not exists public.players (
  id            uuid primary key default gen_random_uuid(),
  login         text unique not null,
  pass_hash     text not null,
  is_admin      boolean not null default false,
  banned        boolean not null default false,
  total_taps    bigint not null default 0,
  crystals      bigint not null default 0,
  rebirths      integer not null default 0,
  inventory     jsonb not null default '{}'::jsonb,
  dex           jsonb not null default '[]'::jsonb,
  skill_tree    jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tag           text unique not null,
  owner_id      uuid not null references public.players(id) on delete cascade,
  max_players   integer not null default 10,
  created_at    timestamptz not null default now(),
  blocked       boolean not null default false,
  frozen        boolean not null default false,
  members       jsonb not null default '[]'::jsonb,
  requests      jsonb not null default '[]'::jsonb,
  chat          jsonb not null default '[]'::jsonb,
  upgrades      jsonb not null default '{}'::jsonb,
  treasury      jsonb not null default '{"coins":0,"crystals":0,"star":0,"capacity":500,"petCapacity":10,"pets":{}}'::jsonb
);

create table if not exists public.promos (
  code          text primary key,
  title         text not null,
  rewards       jsonb not null default '{}'::jsonb,
  created_by    uuid references public.players(id) on delete set null,
  max_uses      integer,
  used_by       jsonb not null default '[]'::jsonb,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create unique index if not exists players_login_lower_idx
  on public.players (lower(login));
`;

let schemaPromise = null;

export function ensureSchema() {
  if (!isPgEnabled()) return Promise.resolve();
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const pool = getPool();
      const client = await pool.connect();
      try {
        await client.query(SCHEMA_SQL);
      } finally {
        client.release();
      }
    })().catch((e) => {
      // Allow a later request to retry instead of caching the failure forever.
      schemaPromise = null;
      throw new Error("Database schema init failed: " + e.message);
    });
  }
  return schemaPromise;
}
