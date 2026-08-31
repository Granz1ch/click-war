import { json, error, requireUser, ownerOf, memberOf } from "@/lib/api";
import { getRoomById, commit } from "@/lib/db";

export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, user.id)) return error("You're not a member of this room.");

  if (room.blocked) {
    return error("This room is locked. You cannot leave it right now.", 403);
  }

  room.members = room.members.filter((id) => id !== user.id);
  room.requests = room.requests.filter((id) => id !== user.id);

  // If the owner leaves, transfer ownership to the next member (or delete room).
  if (room.ownerId === user.id) {
    if (room.members.length > 0) {
      room.ownerId = room.members[0];
    } else {
      // delete empty room
      const { loadState } = await import("@/lib/db");
      const state = loadState();
      delete state.rooms[room.id];
      await commit();
      return json({ ok: true, deleted: true });
    }
  }
  await commit();
  return json({ ok: true, members: room.members, ownerId: room.ownerId });
}
