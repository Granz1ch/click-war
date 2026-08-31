"use client";

import { useMemo } from "react";
import { useApp } from "../Providers";
import { useCatalog } from "../useCatalog";

export function DexTab({ room }) {
  const { user } = useApp();
  const cat = useCatalog();

  const dex = user.dex || [];
  const owned = user.inventory || {};
  const byRarity = useMemo(() => {
    if (!cat) return {};
    const m = {};
    for (const p of cat.pets) {
      if (!m[p.rarity]) m[p.rarity] = [];
      m[p.rarity].push(p);
    }
    return m;
  }, [cat]);

  const totalPets = cat?.pets?.length || 0;
  const complete = dex.length >= totalPets;
  const rarities = cat?.raritiesOrder || [];

  if (!cat) return <p className="text-white/50">Loading dex...</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
        <div className="font-display text-3xl font-extrabold text-white">
          {dex.length} / {totalPets}
        </div>
        <p className="text-sm text-white/50">pets discovered</p>
        <div className="mx-auto mt-3 h-3 max-w-md overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-fuchsia-500"
            style={{ width: `${(dex.length / totalPets) * 100}%` }}
          />
        </div>
        {complete ? (
          <div className="mt-4 inline-block rounded-2xl border border-amber-400/50 bg-amber-400/10 px-5 py-2">
            <p className="font-display font-bold text-amber-300">
              ✦ Full dex unlocked! ✦
            </p>
            <p className="text-xs text-amber-200/70">
              Your nickname glows and you get a special in-game font.
            </p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/40">
            Complete the dex by having each pet in your inventory at least once.
          </p>
        )}
      </div>

      {rarities.map((r) => (
        <div key={r}>
          <h3
            className="mb-2 font-display text-sm font-bold uppercase tracking-wider"
            style={{ color: cat.rarities[r].color }}
          >
            {cat.rarities[r].name}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(byRarity[r] || []).map((p) => {
              const discovered = dex.includes(p.id);
              const count = owned[p.id] || 0;
              return (
                <div
                  key={p.id}
                  className={`rounded-2xl border p-4 text-center transition-all ${
                    discovered
                      ? "border-white/10 bg-white/5"
                      : "border-dashed border-white/10 bg-black/20 opacity-50 grayscale"
                  }`}
                >
                  <div className="text-4xl">{discovered ? p.emoji : "❔"}</div>
                  <div className="mt-1 font-display text-sm font-bold text-white">
                    {discovered ? p.name : "???"}
                  </div>
                  <div className="text-xs text-white/40">
                    {discovered ? `owned x${count}` : "Not discovered"}
                  </div>
                  {discovered && (
                    <div className="mt-1 text-[11px] text-cyan-300">
                      click +{p.click} · luck +{p.luck}
                    </div>
                  )}
                  {p.exclusive && discovered && (
                    <div className="mt-1 text-[11px] text-pink-300">⭐ +1 star in treasury</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
