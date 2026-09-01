import { json, error, requireUser } from "@/lib/api";
import { getRoomById, getUserById, commit } from "@/lib/db";
import { publicRoom } from "@/lib/serialize";

export async function GET(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const room = await getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!room.members.includes(auth.user.id)) {
    return json({ ok: false, room: publicRoom(room), canJoin: true });
  }
  const members = [];
  for (const id of room.members) {
    const u = await getUserById(id);
    members.push({ id, login: u ? u.login : "?", isOwner: id === room.ownerId });
  }
  return json({ ok: true, room: publicRoom(room), members });
}
