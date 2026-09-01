// ============================================================
//  Click War — authentication helpers (server-side)
//  ------------------------------------------------------------
//  Passwords are hashed with scrypt. Sessions are stateless,
//  HMAC-signed tokens stored in an httpOnly cookie. No external
//  auth needed for the local mode; Supabase auth can be layered
//  on top later without changing the cookie contract.
// ============================================================
import crypto from "crypto";
import config from "./config";
import { createUser, getUserByLogin, getUserById, commit } from "./db";

const COOKIE_NAME = "cw_session";

// ---- password hashing ----
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const derived = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
}

// ---- signed session token ----
function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", config.authSecret)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function unsign(token) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = crypto
    .createHmac("sha256", config.authSecret)
    .update(data)
    .digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString("utf-8"));
  } catch (e) {
    return null;
  }
}

export function createSessionToken(userId) {
  return sign({ uid: userId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 });
}

export function readSessionToken(token) {
  const payload = unsign(token);
  if (!payload) return null;
  if (payload.exp && payload.exp < Date.now()) return null;
  return payload;
}

// ---- cookie helpers (Next.js) ----
export const sessionCookie = (token) =>
  `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;

export async function getSessionUser(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = readSessionToken(token);
  if (!payload) return null;
  const user = await getUserById(payload.uid);
  if (!user || user.banned) return null;
  return user;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

// ---- bootstrap admin account (idempotent) ----
export async function ensureAdmin() {
  if (!config.adminLogin || !config.adminPassword) return null;
  try {
    const existing = await getUserByLogin(config.adminLogin);
    if (existing) return existing;
    const admin = await createUser({
      login: config.adminLogin,
      passHash: hashPassword(config.adminPassword),
      isAdmin: true,
    });
    await commit();
    return admin;
  } catch (e) {
    // Another concurrent request may have created it first (unique login),
    // and a bootstrap failure must never block a normal login.
    try {
      const existing = await getUserByLogin(config.adminLogin);
      if (existing) return existing;
    } catch (e2) {
      /* fall through */
    }
    console.warn("[auth] admin bootstrap skipped:", e.message);
    return null;
  }
}
