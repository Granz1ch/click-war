import { json, error, requireUser, memberOf } from "@/lib/api";
import { getRoomById, commit } from "@/lib/db";
import { depositCoins, withdrawCoins, depositPet, withdrawPet } from "@/lib/game";
import { publicUser } from "@/lib/serialize";
import { getUserById } from "@/lib/db";

export async function GET(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, auth.user.id)) return error("You're not a member of this room.");
  return json({ ok: true, treasury: room.treasury });
}

// body: { type: "deposit|withdraw|pet_deposit|pet_withdraw", ... }
export async function POST(req, { params }) {
  const auth = await requireUser(req);
  if (auth.error) return auth.error;
  const user = auth.user;
  const room = getRoomById((await params).id);
  if (!room) return error("Room not found.", 404);
  if (!memberOf(room, user.id)) return error("You're not a member of this room.");
  if (room.blocked) return error("This room is blocked.", 403);
  if (room.treasury.frozen) return error("The treasury is frozen.", 403);

  const body = await req.json().catch(() => ({}));
  let result;
  switch (body.type) {
    case "deposit":
      result = depositCoins(room, user, Number(body.amount) || 0);
      break;
    case "withdraw":
      result = withdrawCoins(room, user, Number(body.amount) || 0);
      break;
    case "pet_deposit":
      result = depositPet(room, user, body.petId, Number(body.count) || 1);
      break;
    case "pet_withdraw":
      result = withdrawPet(room, user, body.petId, Number(body.count) || 1);
      break;
    default:
      return error("Unknown treasury action.");
  }
  if (!result.ok) return error(result.error);
  await commit();
  const fresh = getUserById(user.id);
  return json({ ok: true, treasury: room.treasury, user: publicUser(fresh), ...result });
}
