// ============================================================
//  Click War — game logic
//  ------------------------------------------------------------
//  Pure-ish functions that mutate the shared state (db.js) and
//  return results. Routes call these. Kept separate from the
//  transport layer so the logic is testable and Supabase-swappable.
// ============================================================
import { getPromo, commit, now } from "./db";
import {
  PETS,
  PET_BY_ID,
  EGG_COSTS,
  EGG_ODDS,
  ROOM_UPGRADES,
  ROOM_UPGRADE_BY_ID,
  SKILL_TREE,
  SKILL_TREE_BY_ID,
  RARITY_ORDER,
  getUpgradeCost,
  getSkillCost,
  REBIRTH,
  DEX_REWARD,
} from "./catalog";
import config from "./config";

const rand = Math.random;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

// ---------- PERSISTENCE WRAPPERS ----------
async function persist() {
  await commit();
}

// ---------- CLICK POWER ----------
export function computeAura(user) {
  const lvl = (user.skillTree && user.skillTree.s_aura) || 0;
  return 1 + lvl * 0.01;
}

export function petClickBonus(user) {
  let bonus = 0;
  if (user.inventory) {
    for (const [pid, count] of Object.entries(user.inventory)) {
      const p = PET_BY_ID[pid];
      if (p && count > 0) bonus += p.click * Math.min(count, 5);
    }
  }
  return bonus;
}

export function petLuckBonus(user) {
  let bonus = 0;
  if (user.inventory) {
    for (const [pid, count] of Object.entries(user.inventory)) {
      const p = PET_BY_ID[pid];
      if (p && count > 0) bonus += p.luck * Math.min(count, 5);
    }
  }
  return bonus;
}

export function computeClickPower(room, user) {
  const roomClick = (room.upgrades && room.upgrades.u_click) || 0;
  const finger = (user.skillTree && user.skillTree.s_finger) || 0;
  const base = config.baseClickPower || 1;
  const personal = finger * 0.5;
  const raw = (base + roomClick + personal + petClickBonus(user)) * computeAura(user);
  return Math.max(1, Math.round(raw));
}

// ---------- TAP (mined coins -> room treasury) ----------
export function tapUser(room, user, taps = 1) {
  taps = Math.max(1, Math.min(1000, Math.floor(taps)));
  const power = computeClickPower(room, user);
  const roomCapacity = room.treasury.capacity;
  const empty = roomCapacity - room.treasury.coins;
  const gained = Math.min(power * taps, empty);
  const finalCoins = room.treasury.coins + gained;
  if (finalCoins > room.treasury.capacity) room.treasury.coins = room.treasury.capacity;
  else room.treasury.coins = finalCoins;

  user.totalTaps = (user.totalTaps || 0) + taps;
  return { gained, power, totalCoins: room.treasury.coins, capacity: roomCapacity };
}

// ---------- LUCK-WEIGHTED EGG HATCH ----------
function effectiveLuck(room, user) {
  const sLuck = (user.skillTree && user.skillTree.s_luck) || 0;
  const fLuck = (room.upgrades && room.upgrades.u_fortune) || 0;
  return petLuckBonus(user) + sLuck * 0.003 + fLuck * 0.002;
}

export function rollRarity(eggType, luck) {
  const base = EGG_ODDS[eggType] || EGG_ODDS.basic;
  const applied = {};
  let total = 0;
  for (let i = 0; i < RARITY_ORDER.length; i++) {
    const key = RARITY_ORDER[i];
    const weight = (base[key] || 0) * (1 + luck * (i / (RARITY_ORDER.length - 1)));
    applied[key] = weight;
    total += weight;
  }
  let r = rand() * total;
  for (const key of RARITY_ORDER) {
    r -= applied[key];
    if (r <= 0) return key;
  }
  return "common";
}

export function hatchPet(room, user, eggType) {
  const luck = effectiveLuck(room, user);
  const rarity = rollRarity(eggType, luck);
  const species = PETS.filter((p) => p.rarity === rarity);
  const pet = species.length ? pick(species) : PETS[0];
  // add to inventory
  if (!user.inventory[pet.id]) user.inventory[pet.id] = 0;
  user.inventory[pet.id] += 1;
  // dex registration (first time ever owned)
  if (!user.dex.includes(pet.id)) user.dex.push(pet.id);
  return { pet, rarity, luck };
}

export function buyEgg(room, user, eggType) {
  const meta = EGG_COSTS[eggType];
  if (!meta) return { ok: false, error: "Unknown egg." };
  if (room.treasury.coins < meta.cost) {
    return { ok: false, error: "Not enough coins in the treasury." };
  }
  room.treasury.coins -= meta.cost;
  const hatched = hatchPet(room, user, eggType);
  return { ok: true, ...hatched, cost: meta.cost };
}

// ---------- ROOM UPGRADES ----------
export function buyRoomUpgrade(room, user, upgradeId) {
  const up = ROOM_UPGRADE_BY_ID[upgradeId];
  if (!up) return { ok: false, error: "Unknown upgrade." };
  const level = room.upgrades[upgradeId] || 0;
  if (level >= up.max) return { ok: false, error: "Upgrade is maxed out." };
  const cost = getUpgradeCost(upgradeId, level);
  if (room.treasury.coins < cost) {
    return { ok: false, error: "Not enough coins in the treasury." };
  }
  room.treasury.coins -= cost;
  room.upgrades[upgradeId] = level + 1;
  // treasury vault & storage raise the caps directly
  if (upgradeId === "u_treasury") room.treasury.capacity += 500;
  if (upgradeId === "u_storage") room.treasury.petCapacity += 5;
  return { ok: true, level: level + 1, cost };
}

// ---------- TREASURY DEPOSIT / WITHDRAW ----------
export function recalcStars(room) {
  let star = 0;
  for (const [pid, count] of Object.entries(room.treasury.pets)) {
    const p = PET_BY_ID[pid];
    if (p && p.exclusive) star += count;
  }
  room.treasury.star = star;
}

export function depositCoins(room, user, amount) {
  amount = Math.max(0, Math.floor(amount));
  if (amount <= 0) return { ok: false, error: "Enter an amount." };
  if (room.treasury.frozen) return { ok: false, error: "The treasury is frozen." };
  const empty = room.treasury.capacity - room.treasury.coins;
  const placed = Math.min(amount, empty);
  room.treasury.coins += placed;
  return { ok: true, placed, left: amount - placed };
}

export function withdrawCoins(room, user, amount) {
  amount = Math.max(0, Math.floor(amount));
  if (amount <= 0) return { ok: false, error: "Enter an amount." };
  if (room.treasury.frozen) return { ok: false, error: "The treasury is frozen." };
  const taken = Math.min(amount, room.treasury.coins);
  room.treasury.coins -= taken;
  return { ok: true, taken };
}

export function depositPet(room, user, petId, count = 1) {
  const pet = PET_BY_ID[petId];
  if (!pet) return { ok: false, error: "Unknown pet." };
  count = Math.max(1, Math.min(100, Math.floor(count)));
  if (room.treasury.frozen) return { ok: false, error: "The treasury is frozen." };
  if ((user.inventory[petId] || 0) < count) {
    return { ok: false, error: `You don't have ${count} of ${pet.name}.` };
  }
  // capacity check
  let petTotal = 0;
  for (const c of Object.values(room.treasury.pets)) petTotal += c;
  if (petTotal + count > room.treasury.petCapacity) {
    return { ok: false, error: "The pet storage is full." };
  }
  user.inventory[petId] -= count;
  if (!room.treasury.pets[petId]) room.treasury.pets[petId] = 0;
  room.treasury.pets[petId] += count;
  recalcStars(room);
  return { ok: true, star: room.treasury.star };
}

export function withdrawPet(room, user, petId, count = 1) {
  const pet = PET_BY_ID[petId];
  if (!pet) return { ok: false, error: "Unknown pet." };
  count = Math.max(1, Math.min(100, Math.floor(count)));
  if (room.treasury.frozen) return { ok: false, error: "The treasury is frozen." };
  if ((room.treasury.pets[petId] || 0) < count) {
    return { ok: false, error: `The treasury doesn't have ${count} of ${pet.name}.` };
  }
  room.treasury.pets[petId] -= count;
  if (room.treasury.pets[petId] <= 0) delete room.treasury.pets[petId];
  user.inventory[petId] = (user.inventory[petId] || 0) + count;
  recalcStars(room);
  return { ok: true, star: room.treasury.star };
}

// ---------- SKILL TREE ----------
export function upgradeSkill(room, user, skillId) {
  const s = SKILL_TREE_BY_ID[skillId];
  if (!s) return { ok: false, error: "Unknown skill." };
  const level = user.skillTree[skillId] || 0;
  if (level >= s.max) return { ok: false, error: "Skill is maxed out." };
  const cost = getSkillCost(skillId, level);
  if ((user.crystals || 0) < cost) {
    return { ok: false, error: "Not enough crystals." };
  }
  user.crystals -= cost;
  user.skillTree[skillId] = level + 1;
  return { ok: true, level: level + 1, cost };
}

// ---------- REBIRTH ----------
export function rebirth(room, user) {
  if ((user.totalTaps || 0) < REBIRTH.minTaps) {
    return {
      ok: false,
      error: `You need ${REBIRTH.minTaps} taps to rebirth.`,
      needed: REBIRTH.minTaps,
    };
  }
  // crystals awarded scaling with taps
  const gained = Math.min(
    REBIRTH.crystalCap,
    Math.round(
      REBIRTH.baseCrystals + (user.totalTaps - REBIRTH.minTaps) * REBIRTH.crystalsPerTaps
    )
  );
  user.crystals = (user.crystals || 0) + gained;
  user.rebirths = (user.rebirths || 0) + 1;
  return { ok: true, gained };
}

// ---------- DEX COMPLETION ----------
export function dexComplete(user) {
  return PETS.every((p) => user.dex.includes(p.id));
}

export function userEffects(user) {
  const full = dexComplete(user);
  return {
    fullDex: full,
    nicknameEffect: full && DEX_REWARD.nicknameEffect,
    specialFont: full && DEX_REWARD.font === "special",
    admin: !!user.isAdmin,
  };
}

// ---------- PROMO ----------
export async function activatePromo(room, user, code) {
  const promo = await getPromo(code);
  if (!promo) return { ok: false, error: "Promo code not found." };
  if (!promo.active) return { ok: false, error: "This promo code is disabled." };
  if (promo.maxUses != null && promo.usedBy.length >= promo.maxUses) {
    return { ok: false, error: "This promo code is exhausted." };
  }
  if (promo.usedBy.includes(user.id)) {
    return { ok: false, error: "You already used this promo code." };
  }
  // rewards
  const rewards = promo.rewards || {};
  const report = {};
  if (rewards.coins) {
    const empty = room.treasury.capacity - room.treasury.coins;
    const placed = Math.min(rewards.coins, empty);
    room.treasury.coins += placed;
    report.coins = placed;
  }
  if (rewards.crystals) {
    room.treasury.crystals += rewards.crystals;
    report.crystals = rewards.crystals;
  }
  if (rewards.pets && Array.isArray(rewards.pets)) {
    const granted = [];
    for (const spec of rewards.pets) {
      if (!spec || !spec.id) continue;
      const p = PET_BY_ID[spec.id];
      if (!p) continue;
      const n = spec.count || 1;
      // goes to the treasury per spec
      if (!room.treasury.pets[spec.id]) room.treasury.pets[spec.id] = 0;
      room.treasury.pets[spec.id] += n;
      granted.push({ id: p.id, name: p.name, count: n });
    }
    recalcStars(room);
    report.pets = granted;
  }
  promo.usedBy.push(user.id);
  return { ok: true, promo: promo.code, title: promo.title, rewards: report };
}

// ---------- CHAT ----------
const MAX_MESSAGE_LEN = 320;
const MAX_CHAT = 100;

export function postChat(room, user, text) {
  const clean = String(text || "").replace(/[<>]/g, "").trim();
  if (!clean) return { ok: false, error: "Empty message." };
  if (clean.length > MAX_MESSAGE_LEN) {
    return { ok: false, error: `Message too long (max ${MAX_MESSAGE_LEN} chars).` };
  }
  if (!room.chat) room.chat = [];
  room.chat.push({
    id: Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    userId: user.id,
    login: user.login,
    text: clean,
    at: now(),
    special: !!userEffects(user).specialFont,
  });
  if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
  return { ok: true, message: room.chat[room.chat.length - 1] };
}

// ---------- ADMIN ----------
export function setRoomBlocked(room, blocked) {
  room.blocked = !!blocked;
  return room;
}

export function setTreasuryFrozen(room, frozen) {
  room.treasury.frozen = !!frozen;
  return room;
}

export function setUserBanned(user, banned) {
  user.banned = !!banned;
  return user;
}

export function issueToRoom(room, rewards) {
  const r = rewards || {};
  if (r.coins) room.treasury.coins = Math.min(room.treasury.capacity, room.treasury.coins + Math.floor(r.coins));
  if (r.crystals) room.treasury.crystals += Math.floor(r.crystals);
  if (r.pets && Array.isArray(r.pets)) {
    for (const spec of r.pets) {
      if (!spec || !spec.id || !PET_BY_ID[spec.id]) continue;
      if (!room.treasury.pets[spec.id]) room.treasury.pets[spec.id] = 0;
      room.treasury.pets[spec.id] += spec.count || 1;
    }
    recalcStars(room);
  }
  return room;
}

export function issueToUser(user, rewards) {
  const r = rewards || {};
  if (r.crystals) user.crystals = (user.crystals || 0) + Math.floor(r.crystals);
  if (r.pets && Array.isArray(r.pets)) {
    for (const spec of r.pets) {
      if (!spec || !spec.id || !PET_BY_ID[spec.id]) continue;
      if (!user.inventory[spec.id]) user.inventory[spec.id] = 0;
      user.inventory[spec.id] += spec.count || 1;
      if (!user.dex.includes(spec.id)) user.dex.push(spec.id);
    }
  }
  return user;
}
