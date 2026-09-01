// ============================================================
//  Click War — PostgreSQL persistence backend
//  ------------------------------------------------------------
//  Implements exactly the same async interface as the local JSON
//  backend and the Supabase-REST backend in lib/db.js, but talks
//  directly to Postgres with `pg`. Enabled by DATABASE_URL.
//
//  Same "mutate then commit()" contract: every entity handed out
//  is remembered with a JSON snapshot; commit() diff-upserts only
//  the ones that actually changed.
// ============================================================
import { query, ensureSchema } from "./pg";

// ---- working set (per warm invocation) ----
const workingSet = new Map(); // "kind:id" -> { kind, id, obj, snapshot }

function remember(kind, id, obj) {
  workingSet.set(`${kind}:${id}`, { kind, id, obj, snapshot: JSON.stringify(obj) });
  return obj;
}

// ---- row <-> object mappers ----
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

const J = (v) => JSON.stringify(v ?? null);

async function q(text, params) {
  await ensureSchema();
  return query(text, params);
}

// ============================================================
//  COMMIT
// ============================================================
export async function commit() {
  const entries = Array.from(workingSet.values());
  for (const e of entries) {
    if (JSON.stringify(e.obj) === e.snapshot) continue; // unchanged

    if (e.kind === "user") {
      const u = e.obj;
      await q(
        `update public.players set
           login = $2, pass_hash = $3, is_admin = $4, banned = $5,
           total_taps = $6, crystals = $7, rebirths = $8,
           inventory = $9::jsonb, dex = $10::jsonb, skill_tree = $11::jsonb
         where id = $1`,
        [
          u.id, u.login, u.passHash, !!u.isAdmin, !!u.banned,
          Math.round(Number(u.totalTaps || 0)),
          Math.round(Number(u.crystals || 0)),
          Math.round(Number(u.rebirths || 0)),
          J(u.inventory || {}), J(u.dex || []), J(u.skillTree || {}),
        ]
      );
    } else if (e.kind === "room") {
      const r = e.obj;
      await q(
        `update public.rooms set
           name = $2, tag = $3, owner_id = $4, max_players = $5,
           blocked = $6, frozen = $7, members = $8::jsonb, requests = $9::jsonb,
           chat = $10::jsonb, upgrades = $11::jsonb, treasury = $12::jsonb
         where id = $1`,
        [
          r.id, r.name, r.tag, r.ownerId, Math.round(Number(r.maxPlayers || 10)),
          !!r.blocked, !!r.frozen,
          J(r.members || []), J(r.requests || []), J(r.chat || []),
          J(r.upgrades || {}), J(r.treasury || {}),
        ]
      );
    } else if (e.kind === "promo") {
      const p = e.obj;
      await q(
        `insert into public.promos (code, title, rewards, created_by, max_uses, used_by, active)
         values ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7)
         on conflict (code) do update set
           title = excluded.title, rewards = excluded.rewards,
           max_uses = excluded.max_uses, used_by = excluded.used_by,
           active = excluded.active`,
        [
          p.code, p.title, J(p.rewards || {}), p.createdBy || null,
          p.maxUses == null ? null : Math.round(Number(p.maxUses)),
          J(p.usedBy || []), !!p.active,
        ]
      );
    }
    e.snapshot = JSON.stringify(e.obj);
  }
  workingSet.clear();
}

// ============================================================
//  USERS
// ============================================================
export async function createUser({ login, passHash, isAdmin = false }) {
  const { rows } = await q(
    `insert into public.players (login, pass_hash, is_admin)
     values ($1, $2, $3) returning *`,
    [login, passHash, !!isAdmin]
  );
  const user = userFromRow(rows[0]);
  return remember("user", user.id, user);
}

export async function getUserByLogin(login) {
  const raw = String(login).trim();
  const { rows } = await q(
    `select * from public.players where lower(login) = lower($1) limit 1`,
    [raw]
  );
  if (!rows.length) return null;
  const user = userFromRow(rows[0]);
  return remember("user", user.id, user);
}

export async function getUserById(id) {
  if (!id) return null;
  const cached = workingSet.get(`user:${id}`);
  if (cached) return cached.obj;
  const { rows } = await q(`select * from public.players where id = $1`, [id]);
  if (!rows.length) return null;
  const user = userFromRow(rows[0]);
  return remember("user", user.id, user);
}

export async function getUsers() {
  const { rows } = await q(`select * from public.players order by created_at`);
  return rows.map((row) => {
    const existing = workingSet.get(`user:${row.id}`);
    if (existing) return existing.obj;
    const u = userFromRow(row);
    return remember("user", u.id, u);
  });
}

export async function updateUser(id, patch) {
  const user = await getUserById(id);
  if (!user) return null;
  Object.assign(user, patch);
  return user;
}

// ============================================================
//  ROOMS
// ============================================================
export async function createRoom({ name, tag, ownerId, maxPlayers }) {
  const treasury = {
    coins: 0, crystals: 0, star: 0, capacity: 500, petCapacity: 10, pets: {},
  };
  const { rows } = await q(
    `insert into public.rooms (name, tag, owner_id, max_players, members, treasury)
     values ($1, $2, $3, $4, $5::jsonb, $6::jsonb) returning *`,
    [
      name, String(tag).toUpperCase(), ownerId,
      Math.round(Number(maxPlayers) || 10), J([ownerId]), J(treasury),
    ]
  );
  const room = roomFromRow(rows[0]);
  return remember("room", room.id, room);
}

export async function getRoomById(id) {
  if (!id) return null;
  const cached = workingSet.get(`room:${id}`);
  if (cached) return cached.obj;
  const { rows } = await q(`select * from public.rooms where id = $1`, [id]);
  if (!rows.length) return null;
  const room = roomFromRow(rows[0]);
  return remember("room", room.id, room);
}

export async function getRooms() {
  const { rows } = await q(`select * from public.rooms order by created_at`);
  return rows.map((row) => {
    const existing = workingSet.get(`room:${row.id}`);
    if (existing) return existing.obj;
    const r = roomFromRow(row);
    return remember("room", r.id, r);
  });
}

export async function updateRoom(id, patch) {
  const room = await getRoomById(id);
  if (!room) return null;
  Object.assign(room, patch);
  return room;
}

export async function deleteRoom(id) {
  await q(`delete from public.rooms where id = $1`, [id]);
  workingSet.delete(`room:${id}`);
  return true;
}

export async function roomOfUser(userId) {
  const rooms = await getRooms();
  return rooms.find((r) => r.members.includes(userId) && !r.blocked) || null;
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
  const key = String(code).toUpperCase();
  const { rows } = await q(
    `insert into public.promos (code, title, rewards, created_by, max_uses, used_by, active)
     values ($1, $2, $3::jsonb, $4, $5, '[]'::jsonb, true)
     on conflict (code) do update set
       title = excluded.title, rewards = excluded.rewards,
       max_uses = excluded.max_uses, active = true
     returning *`,
    [
      key, title, J(rewards || {}), createdBy || null,
      maxUses == null ? null : Math.round(Number(maxUses)),
    ]
  );
  const promo = promoFromRow(rows[0]);
  return remember("promo", promo.code, promo);
}

export async function getPromo(code) {
  const key = String(code).toUpperCase();
  const cached = workingSet.get(`promo:${key}`);
  if (cached) return cached.obj;
  const { rows } = await q(`select * from public.promos where upper(code) = $1`, [key]);
  if (!rows.length) return null;
  const promo = promoFromRow(rows[0]);
  return remember("promo", promo.code, promo);
}

export async function getPromos() {
  const { rows } = await q(`select * from public.promos order by created_at desc`);
  return rows.map((row) => {
    const existing = workingSet.get(`promo:${row.code}`);
    if (existing) return existing.obj;
    const p = promoFromRow(row);
    return remember("promo", p.code, p);
  });
}
