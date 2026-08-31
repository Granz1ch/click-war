import { json, error, requireUser, memberOf } from "@/lib/api";
import { getRoomById, getUserById, commit } from "@/lib/db";
import { postChat } from "@/lib/game";
import { publicUser } from "@/lib/serialize";

export async function GET(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, auth.user.id)) return error("You're not a member of this room.");
  return json({ ok: true, chat: (room.chat || []).slice(-100) });
}

// body: { text }
export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, user.id)) return error("You're not a member of this room.");
  if (room.blocked) return error("This room is blocked.", 403);

  const body = await req.json().catch(() => ({}));
  const result = postChat(room, user, body.text);
  if (!result.ok) return error(result.error);
  await commit();
  const fresh = getUserById(user.id);
  return json({ ok: true, message: result.message, chat: (room.chat || []).slice(-100), user: publicUser(fresh) });
}
