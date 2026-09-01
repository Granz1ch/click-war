// ============================================================
//  Click War — central configuration
//  ------------------------------------------------------------
//  This file is the single place the Supabase connection URL and
//  app constants live. Copy `.env.example` -> `.env.local` and
//  fill in your real credentials to activate Supabase.
// ============================================================

const isServer = typeof window === "undefined";
const suffix = isServer ? process.env : {};

// ---- Supabase URL validation ----
// `@supabase/supabase-js` throws ("Invalid supabaseUrl: Must be a valid
// HTTP or HTTPS URL") when handed anything that isn't a real HTTP(S) URL.
// Only enable Supabase when the configured URL is genuinely usable, so a
// typo / placeholder / trailing space in the env falls back to the built-in
// local database instead of crashing the app — and the production build.
function isValidSupabaseUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(String(value).trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (e) {
    return false;
  }
}

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Click War",

  // ---- Supabase (production, cross-home multiplayer) ----
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey: suffix.SUPABASE_SERVICE_ROLE_KEY || "",

  // Whether the built-in local database should be used.
  // Falls back automatically when Supabase env vars are absent or invalid.
  supabaseEnabled: isValidSupabaseUrl(supabaseUrl) && supabaseAnonKey.length > 0,

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

// Surface a clear warning when Supabase *looks* configured but isn't usable,
// so misconfiguration is obvious instead of silently using the local DB.
if (isServer && (supabaseUrl || supabaseAnonKey) && !config.supabaseEnabled) {
  console.warn(
    "[config] Supabase is not enabled: NEXT_PUBLIC_SUPABASE_URL must be a valid " +
      "HTTP(S) URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. Falling back " +
      "to the built-in local database (fine for preview, not for production)."
  );
}

export default config;
