import { json, currentUser } from "@/lib/api";
import { publicUser } from "@/lib/serialize";
import { getRooms } from "@/lib/db";

// This route depends on the request's session cookie and the live database,
// so it must always run on demand and never be statically prerendered.
export const dynamic = "force-dynamic";

export async function GET(req) {
  const user = await currentUser(req);
  if (!user) return json({ ok: false, user: null });
  // Attach the room the user is currently in (if any). Membership is a fact
  // and must NOT depend on the room being blocked — otherwise blocking a room
  // would silently eject everyone to the lobby (and pull them back on
  // unblock). Blocked rooms pause gameplay via room.blocked checks instead.
  const rooms = await getRooms();
  const activeRoom = rooms.find((r) => r.members.includes(user.id)) || null;
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
