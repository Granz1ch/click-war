import { json, error, requireUser, memberOf } from "@/lib/api";
import { getRoomById, getUserById, commit } from "@/lib/db";
import { buyEgg } from "@/lib/game";
import { publicUser } from "@/lib/serialize";

export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;
  const room = await getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, user.id)) return error("You're not a member of this room.");
  if (room.blocked) return error("This room is blocked.", 403);

  const body = await req.json().catch(() => ({}));
  const eggType = body.eggType || "basic";
  const result = buyEgg(room, user, eggType);
  await commit();
  if (!result.ok) return error(result.error);

  const fresh = await getUserById(user.id);
  return json({
    ok: true,
    pet: result.pet,
    rarity: result.rarity,
    luck: result.luck,
    cost: result.cost,
    coinsLeft: room.treasury.coins,
    capacity: room.treasury.capacity,
    user: publicUser(fresh),
  });
}
