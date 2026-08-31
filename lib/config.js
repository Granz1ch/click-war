// ============================================================
//  Click War — central configuration
//  ------------------------------------------------------------
//  This file is the single place the Supabase connection URL and
//  app constants live. Copy `.env.example` -> `.env.local` and
//  fill in your real credentials to activate Supabase.
// ============================================================

const isServer = typeof window === "undefined";
const suffix = isServer ? process.env : {};

const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Click War",

  // ---- Supabase (production, cross-home multiplayer) ----
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: suffix.SUPABASE_SERVICE_ROLE_KEY || "",

  // Whether the built-in local database should be used.
  // Falls back automatically when Supabase env vars are absent.
  supabaseEnabled:
    (process.env.NEXT_PUBLIC_SUPABASE_URL || "").length > 0 &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").length > 0,

  // ---- Auth ----
  authSecret: suffix.AUTH_SECRET || "click-war-dev-secret-change-me",

  // ---- Admin bootstrap ----
  adminLogin: suffix.ADMIN_LOGIN || "admin",
  adminPassword: suffix.ADMIN_PASSWORD || "admin",

  // ---- Game tuning ----
  initialTreasuryCapacity: 500, // coins the treasury can hold at start
  initialPetCapacity: 10, // pets the treasury can hold at start
  baseClickPower: 1,
};

export default config;
