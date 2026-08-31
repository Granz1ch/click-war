// ============================================================
//  Click War — game catalog (static data)
//  ------------------------------------------------------------
//  Rarities, pet species, hatching chances, shop upgrades,
//  and the personal skill tree. Editing these changes the game.
// ============================================================

// ---- Pet rarities (best to worst drop chance) ----
export const RARITIES = {
  common: { name: "Common", color: "#9ca3af", chance: 0.50, weight: 1 },
  uncommon: { name: "Uncommon", color: "#4ade80", chance: 0.25, weight: 2 },
  rare: { name: "Rare", color: "#38bdf8", chance: 0.12, weight: 4 },
  epic: { name: "Epic", color: "#a855f7", chance: 0.07, weight: 8 },
  legendary: { name: "Legendary", color: "#f59e0b", chance: 0.04, weight: 16 },
  mythic: { name: "Mythic", color: "#f43f5e", chance: 0.018, weight: 32 },
  exclusive: { name: "Exclusive", color: "#f472b6", chance: 0.002, weight: 100 },
};

export const RARITY_ORDER = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
  "exclusive",
];

// ---- Pet species catalog ----
// Each pet has a rarity, an emoji avatar, a luck boost and a click boost.
export const PETS = [
  { id: "p_fox",     name: "Ember Fox",     emoji: "🦊", rarity: "common",     luck: 0, click: 0.5 },
  { id: "p_frog",    name: "Pond Frog",     emoji: "🐸", rarity: "common",     luck: 0, click: 0.4 },
  { id: "p_chick",   name: "Sun Chick",     emoji: "🐥", rarity: "common",     luck: 0, click: 0.6 },
  { id: "p_cat",     name: "Void Kitten",   emoji: "🐱", rarity: "uncommon",   luck: 0.1, click: 0.8 },
  { id: "p_rabbit",  name: "Lucky Bunny",   emoji: "🐰", rarity: "uncommon",   luck: 0.2, click: 0.7 },
  { id: "p_duck",    name: "Golden Duck",   emoji: "🦆", rarity: "uncommon",   luck: 0, click: 1.0 },
  { id: "p_wolf",    name: "Moon Wolf",     emoji: "🐺", rarity: "rare",       luck: 0.3, click: 1.2 },
  { id: "p_owl",     name: "Night Owl",     emoji: "🦉", rarity: "rare",       luck: 0.5, click: 1.0 },
  { id: "p_tiger",   name: "Storm Tiger",   emoji: "🐯", rarity: "rare",       luck: 0.2, click: 1.6 },
  { id: "p_unicorn", name: "Unicorn",       emoji: "🦄", rarity: "epic",       luck: 0.7, click: 1.5 },
  { id: "p_dragon",  name: "Baby Dragon",   emoji: "🐉", rarity: "epic",       luck: 0.5, click: 2.2 },
  { id: "p_pegasus", name: "Celest Pegasus",emoji: "🐎", rarity: "epic",       luck: 1.0, click: 1.4 },
  { id: "p_phoenix", name: "Phoenix",       emoji: "🔥", rarity: "legendary",  luck: 1.5, click: 2.5 },
  { id: "p_kraken",  name: "Kraken",        emoji: "🐙", rarity: "legendary",  luck: 1.0, click: 3.0 },
  { id: "p_griffin", name: "Griffin",       emoji: "🦅", rarity: "legendary",  luck: 1.2, click: 2.8 },
  { id: "p_titan",   name: "Titan",         emoji: "🗿", rarity: "mythic",     luck: 2.0, click: 4.0 },
  { id: "p_yeti",    name: "Yeti",          emoji: "❄️", rarity: "mythic",     luck: 2.5, click: 3.5 },
  { id: "p_levia",   name: "Leviathan",     emoji: "🐳", rarity: "mythic",     luck: 3.0, click: 4.5 },
  // Exclusive — extremely rare, +1 star if placed in the treasury.
  { id: "p_celestial", name: "Celestial God", emoji: "👑", rarity: "exclusive", luck: 5.0, click: 6.0, exclusive: true },
  { id: "p_omni",      name: "Omniverse",    emoji: "🌀", rarity: "exclusive", luck: 6.0, click: 7.0, exclusive: true },
];

export const PET_BY_ID = Object.fromEntries(PETS.map((p) => [p.id, p]));

// ---- Eggs ----
export const EGG_COSTS = {
  basic: { name: "Basic Egg", cost: 100, emoji: "🥚" },
  golden: { name: "Golden Egg", cost: 500, emoji: "🥇" },
  mythic: { name: "Celestial Egg", cost: 2500, emoji: "💫" },
};

// Better eggs skew the odds toward rarer drops.
export const EGG_ODDS = {
  basic: { common: 0.60, uncommon: 0.25, rare: 0.09, epic: 0.04, legendary: 0.015, mythic: 0.004, exclusive: 0.001 },
  golden: { common: 0.40, uncommon: 0.30, rare: 0.16, epic: 0.08, legendary: 0.04, mythic: 0.017, exclusive: 0.003 },
  mythic: { common: 0.20, uncommon: 0.25, rare: 0.24, epic: 0.16, legendary: 0.09, mythic: 0.05, exclusive: 0.01 },
};

// ---- Shop upgrades (coin upgrades that help the ROOM) ----
export const ROOM_UPGRADES = [
  { id: "u_click",       name: "Click Power",   desc: "+1 click power for tap",        max: 50,  baseCost: 60,   costGrowth: 1.35 },
  { id: "u_mine",        name: "Auto Miner",    desc: "Auto-taps every second",        max: 20,  baseCost: 400,  costGrowth: 1.5 },
  { id: "u_energy",      name: "Energy Core",   desc: "Tap again faster (less energy)",max: 25,  baseCost: 200,  costGrowth: 1.4 },
  { id: "u_fortune",     name: "Fortune Charm", desc: "+0.2% hatch luck",               max: 20,  baseCost: 800,  costGrowth: 1.6 },
  { id: "u_treasury",    name: "Treasury Vault",desc: "+500 treasury coin cap",        max: 30,  baseCost: 500,  costGrowth: 1.45 },
  { id: "u_storage",     name: "Pet Storage",   desc: "+5 treasury pet cap",            max: 20,  baseCost: 700,  costGrowth: 1.5 },
];

export const ROOM_UPGRADE_BY_ID = Object.fromEntries(
  ROOM_UPGRADES.map((u) => [u.id, u])
);

// ---- Personal skill tree (uses crystals — given on rebirth) ----
export const SKILL_TREE = [
  {
    id: "s_finger",
    name: "Iron Finger",
    desc: "+0.5 personal click power per level",
    max: 20,
    baseCost: 2,
    costGrowth: 1.6,
    kind: "click",
  },
  {
    id: "s_luck",
    name: "Blessed Fate",
    desc: "+0.3% hatch luck bonus per level",
    max: 15,
    baseCost: 3,
    costGrowth: 1.7,
    kind: "luck",
  },
  {
    id: "s_energy",
    name: "Endless Energy",
    desc: "-2% energy cost per tap per level",
    max: 15,
    baseCost: 3,
    costGrowth: 1.7,
    kind: "energy",
  },
  {
    id: "s_auto",
    name: "Turbo Hands",
    desc: "+0.2 auto taps/second per level",
    max: 15,
    baseCost: 5,
    costGrowth: 1.8,
    kind: "auto",
  },
  {
    id: "s_aura",
    name: "Radiant Aura",
    desc: "+1% click multiplier per level",
    max: 20,
    baseCost: 4,
    costGrowth: 1.75,
    kind: "multiplier",
  },
];

export const SKILL_TREE_BY_ID = Object.fromEntries(
  SKILL_TREE.map((s) => [s.id, s])
);

// ---- Rebirth tuning ----
export const REBIRTH = {
  minTaps: 2500, // total personal taps required
  baseCrystals: 3,
  crystalsPerTaps: 0.001, // + crystals proportional to taps
  crystalCap: 100,
};

// ---- Full dex reward ----
export const DEX_REWARD = {
  nicknameEffect: true,
  font: "special",
};

export function getPetById(id) {
  return PET_BY_ID[id] || null;
}

export function getUpgradeCost(upgradeId, level) {
  const u = ROOM_UPGRADE_BY_ID[upgradeId];
  if (!u) return 0;
  return Math.round(u.baseCost * Math.pow(u.costGrowth, level));
}

export function getSkillCost(skillId, level) {
  const s = SKILL_TREE_BY_ID[skillId];
  if (!s) return 0;
  return Math.round(s.baseCost * Math.pow(s.costGrowth, level));
}
