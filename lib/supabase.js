// ============================================================
//  Supabase client wiring
//  ------------------------------------------------------------
//  The game supports two persistence backends:
//    • Supabase (production, real cross-home multiplayer)
//    • A built-in local JSON database (dev / preview / fallback)
//
//  This module exports:
//    • isSupabaseEnabled()  -> whether Supabase is configured
//    • getSupabaseClient()  -> anon client (browser + server)
//    • getSupabaseAdmin()   -> service-role client (server only)
// ============================================================
import { createClient } from "@supabase/supabase-js";
import config from "./config";

export function isSupabaseEnabled() {
  return config.supabaseEnabled;
}

export function getSupabaseClient() {
  if (!isSupabaseEnabled()) return null;
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Server-only admin client. Never import/use this in a browser.
export function getSupabaseAdmin() {
  if (!isSupabaseEnabled()) return null;
  if (!config.supabaseServiceRoleKey) {
    // Fall back to the anon key on the server so the app still works
    // if the service-role key isn't configured yet.
    return createClient(config.supabaseUrl, config.supabaseAnonKey);
  }
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
