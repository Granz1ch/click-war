import { json, error, requireAdmin } from "@/lib/api";
import { getUsers, commit } from "@/lib/db";
import { publicUser } from "@/lib/serialize";

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  return json({ ok: true, users: (await getUsers()).map(publicUser) });
}

// body: { userId, action: "ban"|"unban", rewards? }
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  const body = await req.json();
  const user = (await getUsers()).find((u) => u.id === body.userId);
  if (!user) return error("User not found.", 404);

  const action = body.action;
  if (action === "ban") user.banned = true;
  else if (action === "unban") user.banned = false;
  else if (action === "grant") {
    await grantToUser(user, body.rewards);
  } else return error("Unknown action.");

  await commit();
  return json({ ok: true, user: publicUser(user) });
}

async function grantToUser(user, rewards) {
  const { issueToUser } = await import("@/lib/game");
  return issueToUser(user, rewards || {});
}
