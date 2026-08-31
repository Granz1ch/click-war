"use client";

import { useEffect, useState } from "react";
import { useApp } from "../Providers";
import { getUpgradeCost } from "@/lib/catalog";

export function HatchTab({ room, refresh }) {
  const { api, showToast } = useApp();
  const [cat, setCat] = useState(null);
  const [hatching, setHatching] = useState("basic");
  const [reveal, setReveal] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((d) => setCat(d));
  }, []);

  async function hatch(eggType) {
    setBusy(true);
    setReveal(null);
    const res = await api(`/api/rooms/${room.id}/hatch`, {
      method: "POST",
      body: { eggType },
    });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, "error");
      return;
    }
    setReveal(res);
    refresh();
  }

  if (!cat) return <p className="text-white/50">Loading catalog...</p>;

  const rarities = cat.rarities;
  const rarityColor = (r) => rarities[r]?.color || "#fff";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="mb-4 font-display text-xl font-extrabold text-white">
          🥚 Buy an egg
        </h3>
        <div className="space-y-3">
          {Object.entries(cat.eggs).map(([key, egg]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex items-center gap-3">
                <span className="text-4xl">{egg.emoji || "🥚"}</span>
                <div>
                  <div className="font-display font-bold text-white">{egg.name}</div>
                  <div className="text-xs text-white/50">Cost: {egg.cost} coins</div>
                </div>
              </div>
              <button
                onClick={() => hatch(key)}
                disabled={busy || room.treasury.coins < egg.cost || room.blocked}
                className="btn-primary !px-4 !py-2 text-sm"
              >
                {busy && hatching === key ? "Hatching..." : "Hatch"}
              </button>
            </div>
          ))}
        </div>

        {reveal && (
          <div className="mt-4 rounded-2xl border-2 border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/10 to-cyan-400/10 p-5 text-center">
            <p className="text-sm uppercase tracking-widest text-white/40">It hatched!</p>
            <div className="my-2 text-6xl">{reveal.pet.emoji}</div>
            <div className="font-display text-2xl font-extrabold text-white">
              {reveal.pet.name}
            </div>
            <span
              className="chip mt-1 border"
              style={{
                color: rarityColor(reveal.rarity),
                borderColor: rarityColor(reveal.rarity) + "66",
                background: rarityColor(reveal.rarity) + "1a",
              }}
            >
              {rarities[reveal.rarity].name}
            </span>
            {reveal.rarity === "exclusive" && (
              <p className="mt-2 text-sm text-pink-200">
                ⭐ Exclusive! Put it in the treasury for a star.
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-4 font-display text-xl font-extrabold text-white">
          🛠️ Room upgrades
        </h3>
        <div className="space-y-3">
          {cat.roomUpgrades.map((u) => {
            const level = room.upgrades[u.id] || 0;
            const maxed = level >= u.max;
            const cost = getUpgradeCost(u.id, level);
            return (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div>
                  <div className="font-display font-bold text-white">
                    {u.name}
                    <span className="ml-2 text-xs text-fuchsia-300">Lv {level}/{u.max}</span>
                  </div>
                  <div className="mt-1 text-sm text-white/50">{u.desc}</div>
                  <div className="mt-1 text-xs text-amber-300">
                    {maxed ? "Maxed" : `Cost: ${cost} coins`}
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const res = await api(`/api/rooms/${room.id}/upgrade`, {
                      method: "POST",
                      body: { upgradeId: u.id },
                    });
                    if (!res.ok) showToast(res.error, "error");
                    else showToast(`${u.name} upgraded to Lv ${res.level}!`, "success");
                    refresh();
                  }}
                  disabled={maxed || room.treasury.coins < cost || room.blocked}
                  className="btn-primary !px-4 !py-2 text-sm"
                >
                  {maxed ? "Maxed" : "Buy"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
