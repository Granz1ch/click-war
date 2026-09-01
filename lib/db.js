// ============================================================
//  Click War — persistence layer
//  ------------------------------------------------------------
//  Two interchangeable backends behind ONE async interface:
//    • Supabase (production, real cross-home multiplayer) — used
//      automatically when the env vars are set (see lib/config.js
//      and supabase/schema.sql).
//    • A local JSON file (dev / preview / fallback) — used when
//      Supabase is not configured.
//
//  The route handlers use a "mutate then commit()" pattern. This
//  module tracks every entity it hands out; on commit() it diffs
//  each entity against the snapshot taken when it was read and
//  upserts only the ones that actually changed.
//
//  IMPORTANT: because Supabase calls are async, every function here
//  is async. Callers MUST `await` them.
// ============================================================
import fs from "fs";
import path from "path";
import { isSupabaseEnabled, getSupabaseAdmin } from "./supabase";

const SUPABASE = isSupabaseEnabled();

// ============================================================
//  LOCAL JSON BACKEND
// ============================================================
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

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

function loadStateLocal() {
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

let persistWarned = false;
function saveStateLocal() {
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
          "[db] Local persist failed (" +
            e.message +
            "). Configure Supabase for durable storage."
        );
      }
    }
  }));
}

function nextIdLocal(prefix) {
  const s = loadStateLocal();
  s.seq[prefix] += 1;
  return `${prefix}_${s.seq[prefix]}`;
}

// ============================================================
//  SUPABASE BACKEND
// ============================================================

// Working set of entities fetched during this request. Each entry keeps the
// snapshot taken at read time so commit() can write only changed entities.
const workingSet = new Map(); // key -> { kind, id, obj, snapshot }

function remember(kind, id, obj) {
  workingSet.set(`${kind}:${id}`, { kind, id, obj, snapshot: JSON.stringify(obj) });
}

function sb() {
  return getSupabaseAdmin();
}

let warnedNoServiceRole = false;
function sbWriteClient() {
  const client = getSupabaseAdmin();
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !warnedNoServiceRole) {
    warnedNoServiceRole = true;
    console.warn(
      "[db] SUPABASE_SERVICE_ROLE_KEY is not set — writes to Supabase will fail. " +
        "Add it to your environment (Vercel) / .env.local."
    );
  }
  return client;
}

// ---- row <-> object mappers (keep JS shape identical to local backend) ----
function userFromRow(row) {
  return {
    id: row.id,
    login: row.login,
    passHash: row.pass_hash,
    isAdmin: !!row.is_admin,
    banned: !!row.banned,
    totalTaps: Number(row.total_taps || 0),
    crystals: Number(row.crystals || 0),
    rebirths: Number(row.rebirths || 0),
    inventory: row.inventory || {},
    dex: Array.isArray(row.dex) ? row.dex : [],
    skillTree: row.skill_tree || {},
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function userToRow(user) {
  return {
    id: user.id,
    login: user.login,
    pass_hash: user.passHash,
    is_admin: !!user.isAdmin,
    banned: !!user.banned,
    total_taps: Number(user.totalTaps || 0),
    crystals: Number(user.crystals || 0),
    rebirths: Number(user.rebirths || 0),
    inventory: user.inventory || {},
    dex: user.dex || [],
    skill_tree: user.skillTree || {},
    created_at: new Date(user.createdAt || Date.now()).toISOString(),
  };
}

function normalizeTreasury(t) {
  const treasury = t && typeof t === "object" ? t : {};
  return {
    coins: Number(treasury.coins || 0),
    crystals: Number(treasury.crystals || 0),
    star: Number(treasury.star || 0),
    capacity: Number(treasury.capacity || 500),
    petCapacity: Number(treasury.petCapacity || 10),
    pets: treasury.pets || {},
    ...(treasury.frozen !== undefined ? { frozen: !!treasury.frozen } : {}),
  };
}

function roomFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    tag: row.tag,
    ownerId: row.owner_id,
    maxPlayers: Number(row.max_players || 10),
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    members: Array.isArray(row.members) ? row.members : [],
    requests: Array.isArray(row.requests) ? row.requests : [],
    chat: Array.isArray(row.chat) ? row.chat : [],
    treasury: normalizeTreasury(row.treasury),
    upgrades: row.upgrades || {},
    frozen: !!row.frozen,
    blocked: !!row.blocked,
  };
}

function roomToRow(room) {
  return {
    id: room.id,
    name: room.name,
    tag: room.tag,
    owner_id: room.ownerId,
    max_players: Number(room.maxPlayers || 10),
    created_at: new Date(room.createdAt || Date.now()).toISOString(),
    members: room.members || [],
    requests: room.requests || [],
    chat: room.chat || [],
    treasury: room.treasury || {},
    upgrades: room.upgrades || {},
    frozen: !!room.frozen,
    blocked: !!room.blocked,
  };
}

function promoFromRow(row) {
  return {
    code: row.code,
    title: row.title,
    rewards: row.rewards || {},
    createdBy: row.created_by || null,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    maxUses: row.max_uses == null ? null : Number(row.max_uses),
    usedBy: Array.isArray(row.used_by) ? row.used_by : [],
    active: !!row.active,
  };
}

function promoToRow(promo) {
  return {
    code: promo.code,
    title: promo.title,
    rewards: promo.rewards || {},
    created_by: promo.createdBy || null,
    max_uses: promo.maxUses == null ? null : Number(promo.maxUses),
    used_by: promo.usedBy || [],
    active: !!promo.active,
    created_at: new Date(promo.createdAt || Date.now()).toISOString(),
  };
}

// ============================================================
//  COMMON
// ============================================================
export function now() {
  return Date.now();
}

export async function commit() {
  if (!SUPABASE) {
    return saveStateLocal();
  }

  const entries = Array.from(workingSet.values());
  const client = sbWriteClient();
  const jobs = [];

  for (const e of entries) {
    const current = JSON.stringify(e.obj);
    if (current === e.snapshot) continue; // unchanged, skip
    if (e.kind === "user") {
      jobs.push(client.from("players").upsert(userToRow(e.obj)));
    } else if (e.kind === "room") {
      jobs.push(client.from("rooms").upsert(roomToRow(e.obj)));
    } else if (e.kind === "promo") {
      jobs.push(client.from("promos").upsert(promoToRow(e.obj)));
    }
  }

  const results = await Promise.all(jobs);
  for (const r of results) {
    if (r.error) {
      console.error("[db] upsert failed:", r.error.message);
      throw new Error(r.error.message);
    }
  }
  workingSet.clear();
}

// ============================================================
//  USERS
// ============================================================
export async function createUser({ login, passHash, isAdmin = false }) {
  if (SUPABASE) {
    const row = {
      login,
      pass_hash: passHash,
      is_admin: !!isAdmin,
      banned: false,
      total_taps: 0,
      crystals: 0,
      rebirths: 0,
      inventory: {},
      dex: [],
      skill_tree: {},
    };
    const { data, error } = await sbWriteClient()
      .from("players")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return userFromRow(data);
  }

  const state = loadStateLocal();
  const id = nextIdLocal("user");
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
    inventory: {},
    dex: [],
    skillTree: {},
  };
  state.users[id] = user;
  return user;
}

export async function getUserByLogin(login) {
  const raw = String(login);
  if (SUPABASE) {
    const exact = await sb()
      .from("players")
      .select("*")
      .eq("login", raw)
      .maybeSingle();
    if (exact.error) throw new Error(exact.error.message);
    if (exact.data) {
      const user = userFromRow(exact.data);
      remember("user", user.id, user);
      return user;
    }
    // case-insensitive fallback
    const ci = await sb()
      .from("players")
      .select("*")
      .ilike("login", raw)
      .limit(1)
      .maybeSingle();
    if (ci.error) throw new Error(ci.error.message);
    if (!ci.data) return null;
    const user = userFromRow(ci.data);
    remember("user", user.id, user);
    return user;
  }

  const key = raw.toLowerCase();
  const state = loadStateLocal();
  return (
    Object.values(state.users).find((u) => u.login.toLowerCase() === key) || null
  );
}

export async function getUserById(id) {
  if (!id) return null;
  if (SUPABASE) {
    const { data, error } = await sb()
      .from("players")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const user = userFromRow(data);
    remember("user", user.id, user);
    return user;
  }
  return loadStateLocal().users[id] || null;
}

export async function getUsers() {
  if (SUPABASE) {
    const { data, error } = await sb().from("players").select("*").order("created_at");
    if (error) throw new Error(error.message);
    const users = (data || []).map(userFromRow);
    for (const u of users) remember("user", u.id, u);
    return users;
  }
  return Object.values(loadStateLocal().users);
}

export async function updateUser(id, patch) {
  if (SUPABASE) {
    const user = await getUserById(id);
    if (!user) return null;
    Object.assign(user, patch);
    return user;
  }
  const state = loadStateLocal();
  const user = state.users[id];
  if (!user) return null;
  Object.assign(user, patch);
  return user;
}

// ============================================================
//  ROOMS
// ============================================================
export async function createRoom({ name, tag, ownerId, maxPlayers }) {
  if (SUPABASE) {
    const row = {
      name,
      tag: String(tag).toUpperCase(),
      owner_id: ownerId,
      max_players: Number(maxPlayers) || 10,
      members: [ownerId],
      requests: [],
      chat: [],
      treasury: {
        coins: 0,
        crystals: 0,
        star: 0,
        capacity: 500,
        petCapacity: 10,
        pets: {},
      },
      upgrades: {},
      frozen: false,
      blocked: false,
    };
    const { data, error } = await sbWriteClient()
      .from("rooms")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return roomFromRow(data);
  }

  const state = loadStateLocal();
  const id = nextIdLocal("room");
  const room = {
    id,
    name,
    tag: String(tag).toUpperCase(),
    ownerId,
    maxPlayers,
    createdAt: now(),
    members: [ownerId],
    requests: [],
    chat: [],
    treasury: {
      coins: 0,
      crystals: 0,
      star: 0,
      capacity: 500,
      petCapacity: 10,
      pets: {},
    },
    upgrades: {},
    frozen: false,
    blocked: false,
  };
  state.rooms[id] = room;
  return room;
}

export async function getRoomById(id) {
  if (!id) return null;
  if (SUPABASE) {
    const { data, error } = await sb()
      .from("rooms")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const room = roomFromRow(data);
    remember("room", room.id, room);
    return room;
  }
  return loadStateLocal().rooms[id] || null;
}

export async function getRooms() {
  if (SUPABASE) {
    const { data, error } = await sb().from("rooms").select("*");
    if (error) throw new Error(error.message);
    const rooms = (data || []).map(roomFromRow);
    for (const r of rooms) remember("room", r.id, r);
    return rooms;
  }
  return Object.values(loadStateLocal().rooms);
}

export async function updateRoom(id, patch) {
  if (SUPABASE) {
    const room = await getRoomById(id);
    if (!room) return null;
    Object.assign(room, patch);
    return room;
  }
  const state = loadStateLocal();
  const room = state.rooms[id];
  if (!room) return null;
  Object.assign(room, patch);
  return room;
}

export async function deleteRoom(id) {
  if (SUPABASE) {
    const { error } = await sbWriteClient().from("rooms").delete().eq("id", id);
    if (error) throw new Error(error.message);
    workingSet.delete(`room:${id}`);
    return true;
  }
  const state = loadStateLocal();
  delete state.rooms[id];
  return true;
}

export async function roomOfUser(userId) {
  const rooms = await getRooms();
  return (
    rooms.find((r) => r.members.includes(userId) && !r.blocked) || null
  );
}

export async function addMember(roomId, userId) {
  const room = await getRoomById(roomId);
  if (!room) return null;
  if (!room.members.includes(userId)) room.members.push(userId);
  room.requests = room.requests.filter((r) => r !== userId);
  return room;
}

// ============================================================
//  PROMOS
// ============================================================
export async function createPromo({ code, title, rewards, createdBy, maxUses = null }) {
  if (SUPABASE) {
    const row = promoToRow({
      code,
      title,
      rewards,
      createdBy,
      createdAt: Date.now(),
      maxUses,
      usedBy: [],
      active: true,
    });
    const { data, error } = await sbWriteClient()
      .from("promos")
      .upsert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return promoFromRow(data);
  }

  const state = loadStateLocal();
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

export async function getPromo(code) {
  const key = String(code).toUpperCase();
  if (SUPABASE) {
    const { data, error } = await sb()
      .from("promos")
      .select("*")
      .eq("code", key)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const promo = promoFromRow(data);
    remember("promo", promo.code, promo);
    return promo;
  }
  return loadStateLocal().promos[key] || null;
}

export async function getPromos() {
  if (SUPABASE) {
    const { data, error } = await sb().from("promos").select("*");
    if (error) throw new Error(error.message);
    const promos = (data || []).map(promoFromRow);
    for (const p of promos) remember("promo", p.code, p);
    return promos;
  }
  return Object.values(loadStateLocal().promos);
}
