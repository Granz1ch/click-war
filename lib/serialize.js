// ============================================================
//  Serializers — strip sensitive fields and attach computed data
// ============================================================
import { PET_BY_ID } from "./catalog";
import { dexComplete, userEffects } from "./game";

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    login: user.login,
    createdAt: user.createdAt,
    isAdmin: !!user.isAdmin,
    banned: !!user.banned,
    totalTaps: user.totalTaps || 0,
    crystals: user.crystals || 0,
    rebirths: user.rebirths || 0,
    inventory: user.inventory || {},
    dex: user.dex || [],
    skillTree: user.skillTree || {},
    effects: userEffects(user),
  };
}

export function publicRoom(room) {
  if (!room) return null;
  return {
    id: room.id,
    name: room.name,
    tag: room.tag,
    ownerId: room.ownerId,
    maxPlayers: room.maxPlayers,
    createdAt: room.createdAt,
    members: room.members || [],
    requests: room.requests || [],
    chat: (room.chat || []).slice(-100),
    memberCount: (room.members || []).length,
    treasury: room.treasury,
    upgrades: room.upgrades || {},
    frozen: !!room.treasury.frozen,
    blocked: !!room.blocked,
  };
}
