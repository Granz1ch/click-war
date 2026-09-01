import { json, error, requireAdmin } from "@/lib/api";
import { getRoomById, commit } from "@/lib/db";
import { issueToRoom } from "@/lib/game";
import { publicRoom } from "@/lib/serialize";

// body: { rewards: {coins?, crystals?, pets?:[{id,count}]} }
export async function POST(req, { params }) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const room = await getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);

  const body = await req.json();
  issueToRoom(room, body.rewards || {});
  await commit();
  return json({ ok: true, room: publicRoom(room) });
}
