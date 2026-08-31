import { json } from "@/lib/api";
import {
  PETS,
  RARITIES,
  RARITY_ORDER,
  EGG_COSTS,
  EGG_ODDS,
  ROOM_UPGRADES,
  SKILL_TREE,
  REBIRTH,
} from "@/lib/catalog";

export async function GET() {
  return json({
    ok: true,
    pets: PETS,
    rarities: RARITIES,
    raritiesOrder: RARITY_ORDER,
    eggs: EGG_COSTS,
    eggOdds: EGG_ODDS,
    roomUpgrades: ROOM_UPGRADES,
    skillTree: SKILL_TREE,
    rebirth: REBIRTH,
  });
}
