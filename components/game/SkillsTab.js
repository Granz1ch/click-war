"use client";

import { useApp } from "../Providers";
import { useCatalog } from "../useCatalog";
import { getSkillCost } from "@/lib/catalog";

export function SkillsTab({ room, refresh }) {
  const { api, showToast, user } = useApp();
  const cat = useCatalog();

  if (!cat) return <p className="text-white/50">Loading skills...</p>;

  async function buy(skillId) {
    const res = await api("/api/me/skills", { method: "POST", body: { skillId } });
    if (!res.ok) showToast(res.error, "error");
    else showToast("Skill upgraded!", "success");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5 flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-extrabold text-white">🌱 Personal skill tree</h3>
          <p className="mt-1 text-sm text-white/50">
            Spend <b className="text-cyan-300">crystals</b> (earned by rebirth) on permanent personal upgrades.
          </p>
        </div>
        <div className="text-center">
          <div className="font-display text-3xl font-extrabold text-cyan-300">💎 {user.crystals}</div>
          <div className="text-xs text-white/40">your crystals</div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cat.skillTree.map((s) => {
          const level = user.skillTree?.[s.id] || 0;
          const maxed = level >= s.max;
          const cost = getSkillCost(s.id, level);
          return (
            <div key={s.id} className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-display font-bold text-white">{s.name}</div>
                  <div className="mt-1 text-sm text-white/50">{s.desc}</div>
                </div>
                <span className="chip border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200">
                  Lv {level}/{s.max}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-400 to-cyan-400"
                  style={{ width: `${(level / s.max) * 100}%` }}
                />
              </div>
              <button
                className={`mt-4 w-full rounded-2xl px-6 py-3 font-display text-sm font-semibold transition-all ${
                  maxed
                    ? "glass text-white/40"
                    : "bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-white hover:scale-[1.02]"
                }`}
                disabled={maxed || user.crystals < cost}
                onClick={() => buy(s.id)}
              >
                {maxed ? "Maxed" : `Upgrade · 💎 ${cost}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <h3 className="font-display text-sm font-bold text-white">🔄 Rebirth</h3>
        <p className="mt-1 text-sm text-white/50">
          Reach <b className="text-amber-300">{cat.rebirth.minTaps.toLocaleString()}</b> total taps to
          rebirth and get crystals. You already have{" "}
          <b className="text-amber-300">{user.totalTaps.toLocaleString()}</b>.
        </p>
        <button
          className="btn-primary mt-3"
          disabled={user.totalTaps < cat.rebirth.minTaps}
          onClick={async () => {
            const res = await api("/api/me/rebirth", { method: "POST" });
            if (!res.ok) showToast(res.error, "error");
            else showToast(`Reborn! +${res.gained} crystals`, "success");
            refresh();
          }}
        >
          Rebirth
        </button>
      </div>
    </div>
  );
}
