"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Starfield } from "./Starfield";
import { useApp } from "./Providers";

export function AuthForm({ mode }) {
  const router = useRouter();
  const { api, setUser, showToast } = useApp();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const isRegister = mode === "register";

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    if (isRegister && password !== confirm) {
      setErr("Passwords do not match.");
      setBusy(false);
      return;
    }
    const res = await api(`/api/auth/${mode}`, { method: "POST", body: { login, password } });
    setBusy(false);
    if (!res.ok) {
      setErr(res.error || "Something went wrong.");
      return;
    }
    setUser(res.user);
    showToast(isRegister ? "Account created. Welcome!" : "Welcome back!", "success");
    const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
    if (me && me.inRoomId) router.push(`/game?room=${me.inRoomId}`);
    else router.push("/game");
  }

  return (
    <>
      <Starfield />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2">
            <img src="/logo.png" alt="" className="h-10 w-10 rounded-full shadow-lg" draggable={false} />
            <span className="font-display text-2xl font-extrabold text-gradient">
              CLICK WAR
            </span>
          </div>

          <div className="card glow-purple">
            <h1 className="font-display text-2xl font-bold text-white">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {isRegister
                ? "Pick a login and a strong password to start."
                : "Sign in to continue your conquest."}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/40">
                  Login
                </label>
                <input
                  className="input"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                  placeholder="e.g. MoonWolf"
                  autoComplete="username"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/40">
                  Password
                </label>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegister ? "At least 6 characters" : "••••••••"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
              </div>
              {isRegister && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/40">
                    Confirm password
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              {err && (
                <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">
                  {err}
                </p>
              )}

              <button type="submit" className="btn-primary w-full text-base" disabled={busy}>
                {busy ? "Working..." : isRegister ? "Create account" : "Sign in"}
              </button>
            </form>
          </div>

          <p className="mt-4 text-center text-sm text-white/40">
            {isRegister ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-fuchsia-300 hover:underline">
                  Sign in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/register" className="font-semibold text-fuchsia-300 hover:underline">
                  Create an account
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </>
  );
}
