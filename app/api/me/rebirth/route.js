import { json, error, requireUser } from "@/lib/api";
import { getUserById, roomOfUser, commit } from "@/lib/db";
import { rebirth } from "@/lib/game";
import { publicUser } from "@/lib/serialize";

export async function POST(req) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;

  const room = roomOfUser(user.id);
  if (!room) return error("You must be in a room to rebirth.");

  const result = rebirth(room, user);
  await commit();
  if (!result.ok) return error(result.error);
  const fresh = getUserById(user.id);
  return json({ ok: true, user: publicUser(fresh), gained: result.gained });
}
