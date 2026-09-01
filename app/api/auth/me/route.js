import { json } from "@/lib/api";
import { currentUser } from "@/lib/api";
import { ensureAdmin } from "@/lib/auth";
import { publicUser } from "@/lib/serialize";
import { getRooms, getRoomById } from "@/lib/db";

export async function GET(req) {
  await ensureAdmin();
  const user = await currentUser(req);
  if (!user) return json({ ok: false, user: null });
  // Attach the room the user is currently in (if any).
  const rooms = await getRooms();
  const activeRoom = rooms.find((r) => r.members.includes(user.id) && !r.blocked) || null;
  return json({
    ok: true,
    user: publicUser(user),
    inRoomId: activeRoom ? activeRoom.id : null,
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      tag: r.tag,
      memberCount: r.members.length,
      blocked: !!r.blocked,
    })),
  });
}
