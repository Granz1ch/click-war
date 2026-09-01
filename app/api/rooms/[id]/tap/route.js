import { json, error, requireUser, memberOf } from "@/lib/api";
import { getRoomById, commit } from "@/lib/db";
import { tapUser, computeClickPower } from "@/lib/game";
import { publicUser } from "@/lib/serialize";
import { getUserById } from "@/lib/db";

export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;
  const room = await getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, user.id)) return error("You're not a member of this room.");
  if (room.blocked) return error("This room is blocked.", 403);

  const body = await req.json().catch(() => ({}));
  const taps = body.taps ? Math.max(1, Math.min(1000, Math.floor(body.taps))) : 1;
  const result = tapUser(room, user, taps);
  await commit();

  // refresh the user object after tap
  const fresh = await getUserById(user.id);
  return json({ ok: true, room, user: publicUser(fresh), power: result.power, taps });
}
