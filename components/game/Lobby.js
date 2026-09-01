"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "../Providers";

export function Lobby({ onEnterRoom }) {
  const { api, showToast, user } = useApp();
  const [rooms, setRooms] = useState([]);
  const [tab, setTab] = useState("list");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", tag: "", maxPlayers: 10 });
  const [pendingRoom, setPendingRoom] = useState(null);

  const load = useCallback(async () => {
    const res = await api("/api/rooms", { method: "GET" });
    if (res.ok) setRooms(res.rooms);
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function createRoom(e) {
    e.preventDefault();
    setBusy(true);
    const res = await api("/api/rooms", {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      setBusy(false);
      return showToast(res.error, "error");
    }
    showToast("Room created!", "success");
    // Enter the room by syncing with the server (single source of truth),
    // then release the button. No flicker, no racing timeouts.
    await onEnterRoom(res.room.id);
    setBusy(false);
  }

  async function requestJoin(roomId) {
    setBusy(true);
    const res = await api(`/api/rooms/${roomId}/join`, { method: "POST" });
    setBusy(false);
    if (!res.ok) return showToast(res.error, "error");
    setPendingRoom(roomId);
    showToast("Request sent! The owner will accept you.", "success");
  }

  // Check if we got accepted into a pending room by polling.
  useEffect(() => {
    if (!pendingRoom) return;
    const t = setInterval(async () => {
      const me = await fetch("/api/auth/me").then((r) => r.json()).catch(() => null);
      if (me && me.inRoomId) {
        clearInterval(t);
        onEnterRoom(me.inRoomId);
        setPendingRoom(null);
      }
    }, 3000);
    return () => clearInterval(t);
  }, [pendingRoom, onEnterRoom]);

  // Build avatar gradient deterministically
  const avatarGradient = (s) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    return `linear-gradient(135deg, hsl(${h},70%,55%), hsl(${(h + 60) % 360},70%,45%))`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center py-6 text-center">
        <h2 className="font-display text-3xl font-extrabold text-white">
          Enter the <span className="text-gradient">arena</span>
        </h2>
        <p className="mt-2 max-w-md text-white/55">
          You&apos;re not in a room. Create your own, or join a friend&apos;s by finding
          the room in the list and requesting to join.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* create room */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-display text-lg font-extrabold text-white">
              ➕ Create a room
            </h3>
            <form onSubmit={createRoom} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/40">
                  Room name
                </label>
                <input
                  className="input"
                  placeholder="e.g. Moon Raiders"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  maxLength={40}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/40">
                    Tag
                  </label>
                  <input
                    className="input font-mono uppercase"
                    placeholder="4 chars"
                    value={form.tag}
                    maxLength={4}
                    onChange={(e) =>
                      setForm({ ...form, tag: e.target.value.replace(/[^a-zA-Z0-9]/g, "") })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/40">
                    Max players
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={2}
                    max={50}
                    value={form.maxPlayers}
                    onChange={(e) => setForm({ ...form, maxPlayers: Number(e.target.value) })}
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy ? "Creating..." : "Create room"}
              </button>
            </form>
          </div>
        </div>

        {/* join room */}
        <div className="lg:col-span-3">
          <div className="card">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-white">
                🚪 Open rooms
              </h3>
              <button className="btn-ghost !py-2 text-sm" onClick={load}>
                Refresh
              </button>
            </div>
            {pendingRoom ? (
              <div className="mt-4 rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-5 text-center">
                <p className="font-display font-bold text-cyan-200">
                  ⏳ Request sent — waiting for the owner to accept you
                </p>
                <p className="mt-1 text-sm text-white/50">
                  You&apos;ll be pulled in automatically once they accept.
                </p>
              </div>
            ) : rooms.length === 0 ? (
              <p className="mt-6 text-center text-sm text-white/40">
                No open rooms yet. Be the first to create one!
              </p>
            ) : (
              <div className="mt-4 space-y-3 max-h-[480px] overflow-auto pr-1">
                {rooms.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-fuchsia-400/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                        style={{ background: avatarGradient(r.name) }}
                      >
                        {r.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-display font-bold text-white">{r.name}</div>
                        <div className="text-xs text-white/40">
                          by {r.ownerLogin} · <span className="font-mono">{r.tag}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="chip border-white/10 bg-white/5 text-white/50">
                            👥 {r.memberCount}/{r.maxPlayers}
                          </span>
                          {r.frozen && (
                            <span className="chip border-rose-400/30 bg-rose-500/10 text-rose-300">
                              ❄️ Frozen
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn-primary !px-4 !py-2 text-sm"
                      disabled={busy || r.memberCount >= r.maxPlayers}
                      onClick={() => requestJoin(r.id)}
                    >
                      Request join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
