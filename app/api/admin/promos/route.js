import { json, error, requireAdmin, withCommit } from "@/lib/api";
import { createPromo, getPromos } from "@/lib/db";

export async function GET(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;
  return json({ ok: true, promos: getPromos() });
}

// body: { code, title, maxUses?, rewards: {coins?, crystals?, pets?:[{id,count}]} }
export async function POST(req) {
  const auth = await requireAdmin(req);
  if (auth.error) return auth.error;

  const body = await req.json();
  const code = String(body.code || "").trim().toUpperCase();
  const title = String(body.title || "").trim() || code;
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
    return error("Code must be 3-20 letters/digits (or _ -).");
  }
  const rewards = {
    coins: Math.max(0, Math.floor(Number(body.rewards?.coins) || 0)) || undefined,
    crystals: Math.max(0, Math.floor(Number(body.rewards?.crystals) || 0)) || undefined,
    pets: Array.isArray(body.rewards?.pets) ? body.rewards.pets : undefined,
  };
  const promo = createPromo({
    code,
    title,
    rewards,
    createdBy: auth.user.id,
    maxUses: body.maxUses != null ? Number(body.maxUses) : null,
  });
  await withCommit(async () => {});
  return json({ ok: true, promo });
}
