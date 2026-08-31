import { json, error, requireUser, ownerOf } from "@/lib/api";
import { getRoomById, getUserById, commit } from "@/lib/db";

export async function GET(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!ownerOf(room, auth.user.id)) return error("Only the owner can view requests.", 403);
  const requests = room.requests.map((id) => {
    const u = getUserById(id);
    return { id, login: u ? u.login : "?" };
  });
  return json({ ok: true, requests });
}

// Owner decides on a join request.
// body: { userId, action: "accept" | "reject" }
export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!ownerOf(room, auth.user.id)) return error("Only the owner can manage requests.", 403);

  const body = await req.json();
  const reqUser = getUserById(body.userId);
  if (!reqUser) return error("User not found.", 404);
  if (!room.requests.includes(body.userId)) return error("No pending request from this user.");

  const action = body.action;
  if (action === "accept") {
    if (room.members.length >= room.maxPlayers) return error("Room is full.");
    room.requests = room.requests.filter((id) => id !== body.userId);
    if (!room.members.includes(body.userId)) room.members.push(body.userId);
    // Tag is a room property; users effectively "receive" it by being a member.
  } else if (action === "reject") {
    room.requests = room.requests.filter((id) => id !== body.userId);
  } else {
    return error("Unknown action.");
  }
  await commit();
  return json({ ok: true, members: room.members, requests: room.requests });
}
