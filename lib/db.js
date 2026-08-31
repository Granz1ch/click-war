// ============================================================
//  Click War — local persistence layer
//  ------------------------------------------------------------
//  This is a self-contained JSON database used for local dev and
//  the live preview. Vanilla Node (no external services needed).
//
//  For production (Vercel + real cross-home multiplayer) the app
//  switches to Supabase when the connection vars are set (see
//  lib/supabase.js + supabase/schema.sql). The function names here
//  mirror the Supabase schema so the routes can stay the same.
// ============================================================
import fs from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
const LOCK_FILE = path.join(DATA_DIR, "db.lock");

let cache = null;
let writeChain = Promise.resolve();

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function emptyState() {
  return {
    version: 1,
    users: {},
    rooms: {},
    promos: {},
    seq: { user: 0, room: 0, promo: 0 },
    stats: { totalTaps: 0 },
  };
}

export function loadState() {
  if (cache) return cache;
  ensureDir();
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      cache = JSON.parse(raw);
      if (!cache.seq) cache.seq = { user: 0, room: 0, promo: 0 };
    } catch (e) {
      cache = emptyState();
    }
  } else {
    cache = emptyState();
  }
  return cache;
}

// Writes are best-effort. On serverless hosts (Vercel) the project dir is
// read-only, so writes silently fail and state stays in memory (fine for a
// single cold-start region). For real persistence across machines, set the
// Supabase env vars — see lib/supabase.js and supabase/schema.sql.
let persistWarned = false;

export function saveState() {
  ensureDir();
  const snapshot = JSON.stringify(cache, null, 2);
  return (writeChain = writeChain.then(() => {
    try {
      const tmp = DB_FILE + ".tmp";
      fs.writeFileSync(tmp, snapshot, "utf-8");
      fs.renameSync(tmp, DB_FILE);
    } catch (e) {
      if (!persistWarned) {
        persistWarned = true;
        console.warn(
          "[dblocal] Persist to disk failed (" +
            e.message +
            "). Using in-memory state for this session. Configure Supabase (lib/supabase.js + supabase/schema.sql) for durable storage."
        );
      }
    }
  }));
}

// ---- id helpers ----
function nextId(prefix) {
  const s = loadState();
  s.seq[prefix] += 1;
  return `${prefix}_${s.seq[prefix]}`;
}

export function now() {
  return Date.now();
}

// ============================================================
//  USERS
// ============================================================
export function createUser({ login, passHash, isAdmin = false }) {
  const state = loadState();
  const id = nextId("user");
  const user = {
    id,
    login,
    passHash,
    createdAt: now(),
    isAdmin: !!isAdmin,
    banned: false,
    totalTaps: 0,
    crystals: 0,
    rebirths: 0,
    inventory: {}, // { petId: count }
    dex: [], // pet ids ever owned
    skillTree: {}, // { skillId: level }
  };
  state.users[id] = user;
  return user;
}

export function getUserByLogin(login) {
  const state = loadState();
  const key = String(login).toLowerCase();
  return Object.values(state.users).find((u) => u.login.toLowerCase() === key) || null;
}

export function getUserById(id) {
  return loadState().users[id] || null;
}

export function getUsers() {
  return Object.values(loadState().users);
}

export function updateUser(id, patch) {
  const state = loadState();
  const user = state.users[id];
  if (!user) return null;
  Object.assign(user, patch);
  return user;
}

// ============================================================
//  ROOMS
// ============================================================
export function createRoom({ name, tag, ownerId, maxPlayers }) {
  const state = loadState();
  const id = nextId("room");
  const room = {
    id,
    name,
    tag: String(tag).toUpperCase(),
    ownerId,
    maxPlayers,
    createdAt: now(),
    members: [ownerId],
    requests: [],
    chat: [], // { id, userId, login, text, at, special }
    treasury: {
      coins: 0,
      crystals: 0,
      star: 0,
      capacity: 500,
      petCapacity: 10,
      pets: {}, // { petId: count }
    },
    upgrades: {}, // { upgradeId: level }
    frozen: false,
    blocked: false,
  };
  state.rooms[id] = room;
  return room;
}

export function getRoomById(id) {
  return loadState().rooms[id] || null;
}

export function getRooms() {
  return Object.values(loadState().rooms);
}

export function updateRoom(id, patch) {
  const state = loadState();
  const room = state.rooms[id];
  if (!room) return null;
  Object.assign(room, patch);
  return room;
}

export function roomOfUser(userId) {
  // A user is "in" the first non-blocked room they belong to.
  return Object.values(loadState().rooms).find((r) => r.members.includes(userId) && !r.blocked) || null;
}

export function addMember(roomId, userId) {
  const room = updateRoom(roomId, {});
  if (!room) return null;
  if (!room.members.includes(userId)) room.members.push(userId);
  room.requests = room.requests.filter((r) => r !== userId);
  return room;
}

// ============================================================
//  PROMOS
// ============================================================
export function createPromo({ code, title, rewards, createdBy, maxUses = null }) {
  const state = loadState();
  state.promos[code] = {
    code,
    title,
    rewards,
    createdBy,
    createdAt: now(),
    maxUses,
    usedBy: [],
    active: true,
  };
  return state.promos[code];
}

export function getPromo(code) {
  return loadState().promos[code] || null;
}

export function getPromos() {
  return Object.values(loadState().promos);
}

// ---- atomic-ish helper to persist after any mutation ----
export function commit() {
  return saveState();
}

export { nextId };
