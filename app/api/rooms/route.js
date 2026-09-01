import { json, error, requireUser } from "@/lib/api";
import { createRoom, getRooms, getUserById, commit } from "@/lib/db";

export async function GET(req) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const allRooms = await getRooms();
  const rooms = [];
  for (const r of allRooms) {
    if (r.blocked || r.members.length >= r.maxPlayers) continue;
    const owner = await getUserById(r.ownerId);
    rooms.push({
      id: r.id,
      name: r.name,
      tag: r.tag,
      owner: r.ownerId,
      ownerLogin: owner ? owner.login : "?",
      memberCount: r.members.length,
      maxPlayers: r.maxPlayers,
      capacity: r.treasury.capacity,
      frozen: !!r.treasury.frozen,
      createdAt: r.createdAt,
    });
  }
  return json({ ok: true, rooms });
}

export async function POST(req) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const tag = String(body.tag || "").trim().toUpperCase();
  const maxPlayers = Math.floor(Number(body.maxPlayers) || 10);

  if (name.length < 3 || name.length > 40) {
    return error("Room name must be 3-40 characters.");
  }
  if (!/^[A-Za-z0-9]{1,4}$/.test(tag)) {
    return error("Tag must be 1-4 letters or digits.");
  }
  if (maxPlayers < 2 || maxPlayers > 50) {
    return error("Max players must be between 2 and 50.");
  }
  const rooms = await getRooms();
  if (rooms.some((r) => r.tag === tag)) {
    return error("This tag is already taken.", 409);
  }
  // a user can only own one room at a time
  if (rooms.some((r) => r.ownerId === user.id)) {
    return error("You already own a room. Leave it before creating a new one.");
  }
  // a user can't be in a room already
  if (rooms.some((r) => r.members.includes(user.id))) {
    return error("You're already in a room. Leave it before creating a new one.");
  }

  const room = await createRoom({ name, tag, ownerId: user.id, maxPlayers });
  await commit();
  return json({ ok: true, room });
}
