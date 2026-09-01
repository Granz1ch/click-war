import { json, error, requireUser, memberOf } from "@/lib/api";
import { getRoomById, getRooms, commit } from "@/lib/db";

export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;
  const room = await getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (room.blocked) return error("This room is blocked.");
  if (room.members.includes(user.id)) return error("You're already in this room.");
  if (room.members.length >= room.maxPlayers) return error("This room is full.");

  // can't request membership to a different room while in one
  const rooms = await getRooms();
  if (rooms.some((r) => r.members.includes(user.id))) {
    return error("Leave your current room first.");
  }
  if (room.requests.includes(user.id)) return error("Request already sent.");

  room.requests.push(user.id);
  await commit();
  return json({ ok: true, message: "Request sent to the room owner." });
}
