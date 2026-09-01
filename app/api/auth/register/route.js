import { json, error } from "@/lib/api";
import { hashPassword, createSessionToken, sessionCookie, ensureAdmin } from "@/lib/auth";
import { createUser, getUserByLogin, commit } from "@/lib/db";
import { publicUser } from "@/lib/serialize";

export async function POST(req) {
  try {
    const body = await req.json();
    const login = String(body.login || "").trim();
    const password = String(body.password || "");

    if (login.length < 3) return error("Login must be at least 3 characters.");
    if (login.length > 24) return error("Login must be at most 24 characters.");
    if (!/^[a-zA-Z0-9_.-]+$/.test(login)) {
      return error("Login may only contain letters, numbers, '.', '_' or '-'.");
    }
    if (password.length < 6) return error("Password must be at least 6 characters.");

    await ensureAdmin();
    if (await getUserByLogin(login)) {
      return error("This login is already taken.", 409);
    }

    const user = await createUser({ login, passHash: hashPassword(password) });
    await commit();
    const token = createSessionToken(user.id);
    const res = json({ ok: true, user: publicUser(user) });
    res.headers.set("Set-Cookie", sessionCookie(token));
    return res;
  } catch (e) {
    return error("Registration failed: " + e.message, 500);
  }
}
