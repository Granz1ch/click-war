import { json, error, requireUser } from "@/lib/api";
import { roomOfUser, getUserById, commit } from "@/lib/db";
import { activatePromo } from "@/lib/game";
import { publicUser, publicRoom } from "@/lib/serialize";

// Activate a promo in the user's current room (1 activation per user).
export async function POST(req) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;

  const body = await req.json().catch(() => ({}));
  const code = String(body.code || "").trim();
  if (!code) return error("Enter a promo code.");

  const room = await roomOfUser(user.id);
  if (!room) return error("You need to be in a room to activate a promo.");

  const result = await activatePromo(room, user, code);
  await commit();
  if (!result.ok) return error(result.error);
  const fresh = await getUserById(user.id);
  return json({ ok: true, user: publicUser(fresh), room: publicRoom(room), ...result });
}
