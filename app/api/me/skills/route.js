import { json, error, requireUser } from "@/lib/api";
import { roomOfUser, getUserById, commit } from "@/lib/db";
import { upgradeSkill } from "@/lib/game";
import { publicUser } from "@/lib/serialize";

export async function POST(req) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;

  const body = await req.json().catch(() => ({}));
  if (!body.skillId) return error("Missing skillId.");

  // Skill tree upgrades apply to the player, but require the player be in a room.
  const room = await roomOfUser(user.id);
  if (!room) return error("You must be in a room to upgrade skills.");

  const result = upgradeSkill(room, user, body.skillId);
  await commit();
  if (!result.ok) return error(result.error);
  const fresh = await getUserById(user.id);
  return json({ ok: true, user: publicUser(fresh), cost: result.cost, level: result.level });
}
