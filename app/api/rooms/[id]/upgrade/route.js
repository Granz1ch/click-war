import { json, error, requireUser, memberOf } from "@/lib/api";
import { getRoomById, commit } from "@/lib/db";
import { buyRoomUpgrade } from "@/lib/game";
import { publicRoom } from "@/lib/serialize";

export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, user.id)) return error("You're not a member of this room.");
  if (room.blocked) return error("This room is blocked.", 403);

  const body = await req.json().catch(() => ({}));
  if (!body.upgradeId) return error("Missing upgradeId.");
  const result = buyRoomUpgrade(room, user, body.upgradeId);
  await commit();
  if (!result.ok) return error(result.error);
  return json({ ok: true, room: publicRoom(room), cost: result.cost, level: result.level });
}
