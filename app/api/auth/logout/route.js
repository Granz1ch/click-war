import { json } from "@/lib/api";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const res = json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
