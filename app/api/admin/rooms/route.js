import { json, error, requireAdmin } from "@/lib/api";
import { getRooms, commit } from "@/lib/db";

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  return json({ ok: true, rooms: await getRooms() });
}

// body: { roomId, action: "block"|"unblock"|"freeze"|"unfreeze" }
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = await req.json();
  const room = (await getRooms()).find((r) => r.id === body.roomId);
  if (!room) return error("Room not found.", 404);

  const action = body.action;
  if (action === "block") room.blocked = true;
  else if (action === "unblock") room.blocked = false;
  else if (action === "freeze") room.treasury.frozen = true;
  else if (action === "unfreeze") room.treasury.frozen = false;
  else return error("Unknown action.");

  await commit();
  return json({ ok: true, room });
}
