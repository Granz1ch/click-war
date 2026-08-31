import { json, error } from "@/lib/api";
import { verifyPassword, createSessionToken, sessionCookie, ensureAdmin } from "@/lib/auth";
import { getUserByLogin } from "@/lib/db";
import { publicUser } from "@/lib/serialize";

export async function POST(req) {
  try {
    ensureAdmin();
    const body = await req.json();
    const login = String(body.login || "").trim();
    const password = String(body.password || "");
    const user = getUserByLogin(login);
    if (!user || !verifyPassword(password, user.passHash)) {
      return error("Invalid login or password.", 401);
    }
    if (user.banned) return error("This account is banned.", 403);

    const token = createSessionToken(user.id);
    const res = json({ ok: true, user: publicUser(user) });
    res.headers.set("Set-Cookie", sessionCookie(token));
    return res;
  } catch (e) {
    return error("Login failed: " + e.message, 500);
  }
}
