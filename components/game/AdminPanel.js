"use client";

import { useEffect, useState } from "react";
import { useApp } from "../Providers";
import { useCatalog } from "../useCatalog";

export function AdminPanel({ room, refresh }) {
  const { api, showToast } = useApp();
  const cat = useCatalog();
  const [users, setUsers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [promos, setPromos] = useState([]);

  async function load() {
    const u = await api("/api/admin/users", { method: "GET" });
    const r = await api("/api/admin/rooms", { method: "GET" });
    const p = await api("/api/admin/promos", { method: "GET" });
    if (u.ok) setUsers(u.users);
    if (r.ok) setRooms(r.rooms);
    if (p.ok) setPromos(p.promos);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border-2 border-amber-400/30 bg-amber-400/5 p-5">
        <h3 className="font-display text-xl font-extrabold text-amber-200">
          👑 Admin Control Center
        </h3>
        <p className="text-sm text-white/60">
          Full control over rooms, the treasury, promos and players. These changes
          affect everyone in the game.
        </p>
      </div>

      <RoomControls room={room} api={api} showToast={showToast} refresh={refresh} load={load} />

      <IssueToRoom room={room} cat={cat} api={api} showToast={showToast} refresh={refresh} />

      <CreatePromo api={api} showToast={showToast} load={load} />

      <UserManager users={users} api={api} showToast={showToast} load={load} cat={cat} />

      <PromoList promos={promos} />
    </div>
  );
}

function RoomControls({ room, api, showToast, refresh, load }) {
  async function act(action, target) {
    const endpoint = "/api/admin/rooms";
    const res = await api(endpoint, {
      method: "POST",
      body: { roomId: target || room.id, action },
    });
    if (!res.ok) showToast(res.error, "error");
    else {
      showToast(`Room ${action} done`, "success");
      refresh();
      load();
    }
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-display font-bold text-white">Current room — {room.name}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-ghost" onClick={() => act("block")} disabled={room.blocked}>
          🚫 Block room
        </button>
        <button className="btn-ghost" onClick={() => act("unblock")} disabled={!room.blocked}>
          ✅ Unblock room
        </button>
        <button className="btn-ghost" onClick={() => act("freeze")} disabled={room.frozen}>
          ❄️ Freeze treasury
        </button>
        <button className="btn-ghost" onClick={() => act("unfreeze")} disabled={!room.frozen}>
          🔥 Unfreeze treasury
        </button>
      </div>
    </div>
  );
}

function IssueToRoom({ room, cat, api, showToast, refresh }) {
  const [coins, setCoins] = useState("");
  const [crystals, setCrystals] = useState("");
  const petById = (cat?.pets || []).reduce((m, p) => ((m[p.id] = p), m), {});

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-display font-bold text-white">🎁 Issue rewards to this room</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          type="number"
          className="input !w-32"
          placeholder="Coins"
          value={coins}
          onChange={(e) => setCoins(e.target.value)}
        />
        <input
          type="number"
          className="input !w-32"
          placeholder="Crystals"
          value={crystals}
          onChange={(e) => setCrystals(e.target.value)}
        />
        <button
          className="btn-primary !py-3"
          onClick={async () => {
            const rewards = { coins: Number(coins) || 0, crystals: Number(crystals) || 0 };
            const res = await api(`/api/admin/rooms/${room.id}/issue`, {
              method: "POST",
              body: { rewards },
            });
            if (!res.ok) showToast(res.error, "error");
            else {
              showToast("Rewards granted to room", "success");
              refresh();
            }
          }}
        >
          Grant
        </button>
      </div>
    </div>
  );
}

function CreatePromo({ api, showToast, load }) {
  const [form, setForm] = useState({
    code: "",
    title: "",
    maxUses: "",
    coins: "",
    crystals: "",
  });

  async function submit(e) {
    e.preventDefault();
    const rewards = {};
    if (form.coins) rewards.coins = Number(form.coins);
    if (form.crystals) rewards.crystals = Number(form.crystals);
    const res = await api("/api/admin/promos", {
      method: "POST",
      body: {
        code: form.code,
        title: form.title,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        rewards,
      },
    });
    if (!res.ok) showToast(res.error, "error");
    else {
      showToast("Promo created!", "success");
      setForm({ code: "", title: "", maxUses: "", coins: "", crystals: "" });
      load();
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-display font-bold text-white">✨ Create a promo code</h3>
      <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input
          className="input font-mono uppercase"
          placeholder="CODE (3-20)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          required
        />
        <input
          className="input"
          placeholder="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          type="number"
          className="input"
          placeholder="Max uses (blank = unlimited)"
          value={form.maxUses}
          onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
        />
        <div className="flex gap-2">
          <input
            type="number"
            className="input"
            placeholder="Coins"
            value={form.coins}
            onChange={(e) => setForm({ ...form, coins: e.target.value })}
          />
          <input
            type="number"
            className="input"
            placeholder="Crystals"
            value={form.crystals}
            onChange={(e) => setForm({ ...form, crystals: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <button type="submit" className="btn-primary w-full">
            Create promo
          </button>
        </div>
      </form>
      <p className="mt-2 text-xs text-white/40">
        Pet rewards aren&apos;t supported in this UI yet — feel free to build on the API.
      </p>
    </div>
  );
}

function UserManager({ users, api, showToast, load, cat }) {
  const [selected, setSelected] = useState("");
  const [grantCoins, setGrantCoins] = useState("");
  const [grantCrystals, setGrantCrystals] = useState("");
  const petById = (cat?.pets || []).reduce((m, p) => ((m[p.id] = p), m), {});
  const sel = users.find((u) => u.id === selected);

  async function act(action, extra) {
    const res = await api("/api/admin/users", {
      method: "POST",
      body: { userId: selected, action, ...extra },
    });
    if (!res.ok) showToast(res.error, "error");
    else {
      showToast(`User ${action} done`, "success");
      load();
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-display font-bold text-white">👤 Manage players</h3>
      <select
        className="input mt-3"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">Select a player...</option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.login} {u.banned ? "(banned)" : ""} {u.isAdmin ? "(admin)" : ""}
          </option>
        ))}
      </select>
      {sel && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            className="btn-ghost"
            onClick={() => act(sel.banned ? "unban" : "ban")}
          >
            {sel.banned ? "Unban" : "Ban"}
          </button>
          <button
            className="btn-primary"
            onClick={() =>
              act("grant", { rewards: { crystals: Number(grantCrystals) || 0 } })
            }
          >
            Grant crystals
          </button>
          <input
            type="number"
            className="input"
            placeholder="Crystals to grant"
            value={grantCrystals}
            onChange={(e) => setGrantCrystals(e.target.value)}
          />
          <div className="flex items-center text-xs text-white/50">
            💎 {sel.crystals} crystals · {sel.totalTaps} taps · {sel.rebirths} rebirths
          </div>
        </div>
      )}
    </div>
  );
}

function PromoList({ promos }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-display font-bold text-white">Promo inventory</h3>
      {promos.length === 0 ? (
        <p className="mt-2 text-sm text-white/40">No promos yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {promos.map((p) => (
            <div key={p.code} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <div>
                <span className="font-mono font-bold text-fuchsia-300">{p.code}</span>
                <span className="ml-2 text-sm text-white/60">{p.title}</span>
              </div>
              <span className="text-xs text-white/40">
                {p.usedBy.length}
                {p.maxUses != null ? `/${p.maxUses}` : ""} uses
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
