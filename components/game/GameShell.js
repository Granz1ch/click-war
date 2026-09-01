"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "../Providers";
import { Starfield } from "../Starfield";
import { Lobby } from "./Lobby";
import { CoinTab } from "./CoinTab";
import { TreasuryTab } from "./TreasuryTab";
import { HatchTab } from "./HatchTab";
import { DexTab } from "./DexTab";
import { SkillsTab } from "./SkillsTab";
import { PromoTab } from "./PromoTab";
import { MembersTab } from "./MembersTab";
import { AdminPanel } from "./AdminPanel";
import { ChatTab } from "./ChatTab";

const TABS = [
  { id: "coin", label: "Coin", emoji: "🪙" },
  { id: "hatch", label: "Hatch", emoji: "🥚" },
  { id: "treasury", label: "Treasury", emoji: "🏦" },
  { id: "dex", label: "Dex", emoji: "📖" },
  { id: "skills", label: "Skills", emoji: "🌱" },
  { id: "promo", label: "Promos", emoji: "🎁" },
  { id: "chat", label: "Chat", emoji: "💬" },
  { id: "members", label: "Members", emoji: "👥" },
];

// Only swap state when the payload really changed — keeps re-renders (and
// dependent effects/intervals) from firing on every poll tick.
function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function GameShell() {
  const { user, setUser, api, showToast } = useApp();
  const router = useRouter();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [tab, setTab] = useState("coin");
  const [boot, setBoot] = useState(true);

  // Monotonic request counter: only the LATEST sync may touch state.
  // Stale responses (e.g. a /api/auth/me fired just before a room was
  // created) are dropped, so the UI can never flip lobby -> room -> lobby.
  const syncSeq = useRef(0);

  const isAdmin = user && user.isAdmin;
  const roomId = room ? room.id : null;

  const sync = useCallback(async () => {
    const seq = ++syncSeq.current;
    const me = await fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .catch(() => null);
    if (seq !== syncSeq.current) return; // a newer sync is in flight
    if (!me || !me.user) {
      router.replace("/login");
      return;
    }
    setUser((prev) => (sameJson(prev, me.user) ? prev : me.user));
    if (!me.inRoomId) {
      setRoom((prev) => (prev === null ? prev : null));
      setMembers((prev) => (prev.length === 0 ? prev : []));
      setBoot(false);
      return;
    }
    const res = await api(`/api/rooms/${me.inRoomId}`, { method: "GET" });
    if (seq !== syncSeq.current) return;
    if (res && res.ok !== false && res.room) {
      const nextMembers = res.members || [];
      setRoom((prev) => (sameJson(prev, res.room) ? prev : res.room));
      setMembers((prev) => (sameJson(prev, nextMembers) ? prev : nextMembers));
    }
    setBoot(false);
  }, [api, router, setUser]);

  // Initial load — runs ONCE on mount. `sync` is stable (only stable deps),
  // so this effect never re-fires on its own updates.
  useEffect(() => {
    sync();
  }, [sync]);

  // Live-sync while inside a room (auto-miner ticks, other members' actions).
  useEffect(() => {
    if (!roomId) return;
    const t = setInterval(sync, 5000);
    return () => clearInterval(t);
  }, [roomId, sync]);

  // Manual refresh for child tabs after their actions.
  const refresh = sync;

  // Single, clean way to enter a room: just re-sync. The server is the source
  // of truth for membership, so this transition is one-directional lobby->room
  // with no flicker, no router dance, no timeouts.
  const enterRoom = useCallback(async () => {
    await sync();
  }, [sync]);

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  }

  const roomBlocked = room && room.blocked;

  if (boot) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spinSlow rounded-full border-4 border-fuchsia-400 border-t-transparent" />
          <p className="font-display text-sm text-white/50">Summoning the arena...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Starfield />
      <div className="relative z-10 min-h-screen">
        {/* Top bar */}
        <header className="border-b border-white/5 bg-black/20 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🪙</span>
              <span className="font-display text-lg font-extrabold text-gradient">
                CLICK WAR
              </span>
              {room && (
                <>
                  <span className="chip border-purple-400/30 bg-purple-400/10 text-purple-200">
                    {room.name}
                  </span>
                  <span
                    className="chip border-cyan-400/30 bg-cyan-400/10 font-mono text-cyan-200"
                    onClick={() => {
                      navigator.clipboard?.writeText(room.tag);
                      showToast("Tag copied!", "success");
                    }}
                  >
                    TAG: {room.tag}
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3 text-right">
                  {isAdmin && (
                    <span className="chip border-amber-400/40 bg-amber-400/10 text-amber-200">
                      👑 Admin
                    </span>
                  )}
                  <div>
                    <div className="flex items-center gap-1 font-display text-sm font-bold text-white">
                      {user.effects?.nicknameEffect && "✦ "}
                      {user.login}
                    </div>
                    <div className="text-xs text-white/40">
                      💎 {user.crystals} · ⚡ {user.totalTaps.toLocaleString()} taps
                    </div>
                  </div>
                </div>
              )}
              <button onClick={logout} className="btn-ghost !px-4 !py-2 text-sm">
                Logout
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-6">
          {!room ? (
            <Lobby onEnterRoom={enterRoom} />
          ) : (
            <>
              {roomBlocked && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-rose-200">
                  🚫 This room is locked by an admin. Gameplay is paused — you
                  cannot leave until it&apos;s unlocked.
                </div>
              )}

              {/* Treasury meter */}
              <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Treasury coins"
                  value={`${room.treasury.coins.toLocaleString()} / ${room.treasury.capacity.toLocaleString()}`}
                  color="text-amber-300"
                />
                <Stat
                  label="Crystals"
                  value={room.treasury.crystals.toLocaleString()}
                  color="text-cyan-300"
                />
                <Stat
                  label="Stars"
                  value={room.treasury.star.toLocaleString()}
                  color="text-pink-300"
                />
                <Stat
                  label="Pets stock"
                  value={Object.values(room.treasury.pets).reduce((a, b) => a + b, 0).toLocaleString()}
                  color="text-emerald-300"
                />
              </div>

              {/* Tabs */}
              <nav className="mb-6 flex flex-wrap gap-2">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`rounded-2xl px-4 py-2 font-display text-sm font-semibold transition-all ${
                      tab === t.id
                        ? "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white shadow-lg"
                        : "glass text-white/60 hover:text-white"
                    }`}
                  >
                    <span className="mr-1">{t.emoji}</span>
                    {t.label}
                  </button>
                ))}
                {isAdmin && (
                  <button
                    onClick={() => setTab("admin")}
                    className={`rounded-2xl px-4 py-2 font-display text-sm font-semibold transition-all ${
                      tab === "admin"
                        ? "bg-gradient-to-r from-amber-500 to-rose-400 text-white shadow-lg"
                        : "glass text-amber-200/70 hover:text-amber-200"
                    }`}
                  >
                    👑 Admin
                  </button>
                )}
              </nav>

              <section className="card">
                {tab === "coin" && <CoinTab room={room} refresh={refresh} />}
                {tab === "hatch" && <HatchTab room={room} refresh={refresh} />}
                {tab === "treasury" && <TreasuryTab room={room} refresh={refresh} />}
                {tab === "dex" && <DexTab room={room} refresh={refresh} />}
                {tab === "skills" && <SkillsTab room={room} refresh={refresh} />}
                {tab === "promo" && <PromoTab room={room} refresh={refresh} />}
                {tab === "chat" && <ChatTab room={room} refresh={refresh} />}
                {tab === "members" && <MembersTab room={room} members={members} refresh={refresh} />}
                {isAdmin && tab === "admin" && <AdminPanel room={room} refresh={refresh} />}
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}

function Stat({ label, value, color }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-white/40">
        {label}
      </div>
      <div className={`mt-1 font-display text-xl font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
