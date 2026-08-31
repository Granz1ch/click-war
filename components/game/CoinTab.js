"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TapCoin } from "../TapCoin";
import { useApp } from "../Providers";

export function CoinTab({ room, refresh }) {
  const { api, showToast, user } = useApp();
  const [tapPower, setTapPower] = useState(1);
  const [flash, setFlash] = useState(false);
  const [lastGain, setLastGain] = useState(null);
  const [autoTick, setAutoTick] = useState(0);
  const energyRef = useRef(100);
  const [energy, setEnergy] = useState(100);

  const autoLevel = room.upgrades.u_auto || 0;
  const energyLevel = room.upgrades.u_energy || 0;
  const aura = user.skillTree.s_aura || 0;

  const maxEnergy = 100 + energyLevel * 5;
  const energyCost = Math.max(1, 8 - Math.floor(energyLevel * 0.5) - Math.floor((user.skillTree.s_energy || 0) * 0.4));
  const autoRate = autoLevel * 0.2 + (user.skillTree.s_auto || 0) * 0.2;

  const doTap = useCallback(
    async (taps = 1) => {
      if (energyRef.current < energyCost) {
        setFlash(true);
        setTimeout(() => setFlash(false), 250);
        showToast("Out of energy! Wait a sec or upgrade Energy Core.", "info");
        return;
      }
      // Energy consumption
      const consumed = Math.min(energyRef.current, energyCost * taps);
      energyRef.current -= consumed;
      setEnergy(energyRef.current);

      const res = await api(`/api/rooms/${room.id}/tap`, {
        method: "POST",
        body: { taps },
      });
      if (res && res.ok) {
        setTapPower(res.power);
        setLastGain(res.gained);
        refresh();
      } else if (res && res.error) {
        showToast(res.error, "error");
      }
    },
    [api, room.id, energyCost, refresh, showToast]
  );

  // Energy regen
  useEffect(() => {
    const t = setInterval(() => {
      energyRef.current = Math.min(maxEnergy, energyRef.current + 10);
      setEnergy(energyRef.current);
    }, 1000);
    return () => clearInterval(t);
  }, [maxEnergy]);

  // Auto miner ticks
  useEffect(() => {
    if (!autoRate) return;
    const t = setInterval(async () => {
      const res = await api(`/api/rooms/${room.id}/tap`, {
        method: "POST",
        body: { taps: 1 },
      });
      if (res && res.ok) {
        setAutoTick((n) => n + 1);
        setLastGain(res.gained);
        refresh();
      }
    }, 1000 / autoRate);
    return () => clearInterval(t);
  }, [autoRate, room.id, api, refresh]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="chip border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200">
            ⚡ Power {tapPower} / tap
          </span>
          {autoLevel > 0 && (
            <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
              🤖 {autoRate.toFixed(1)}/s
            </span>
          )}
        </div>

        <div
          className={`rounded-full p-2 transition-transform ${
            flash ? "scale-95" : ""
          }`}
        >
          <TapCoin
            size="lg"
            disabled={room.blocked}
            onTap={() => doTap(1)}
          />
        </div>

        {lastGain != null && (
          <p className="mt-3 text-sm text-white/50">
            +{lastGain} coin{lastGain === 1 ? "" : "s"} into the treasury
          </p>
        )}
        {room.blocked && (
          <p className="mt-3 text-sm text-rose-300">Room is locked — tapping is paused.</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-white/60">Energy</span>
            <span className="font-display font-bold text-cyan-300">
              {Math.round(energy)} / {maxEnergy}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500 transition-all duration-300"
              style={{ width: `${(energy / maxEnergy) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/40">
            Cost {energyCost} energy per tap. Auto-miner: {autoRate.toFixed(2)} taps/sec.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="font-display text-sm font-bold text-white">How tapping works</h3>
          <ul className="mt-2 space-y-1 text-sm text-white/50">
            <li>🪙 Every tap adds your tap power to the room treasury.</li>
            <li>❤️ Pet boosts raise your tap power and hatch luck.</li>
            <li>💡 Aura skill multiplies everything.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <h3 className="font-display text-sm font-bold text-white">Your personal stats</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 text-center">
            <MiniStat label="Total taps" value={user.totalTaps.toLocaleString()} />
            <MiniStat label="Rebirths" value={user.rebirths} />
            <MiniStat label="Crystals" value={user.crystals} />
            <MiniStat label="Dex" value={`${user.dex?.length || 0}`} />
          </div>
        </div>

        {aurateLevels(room, user)}
      </div>
    </div>
  );
}

function aurateLevels(room, user) {
  // Show room upgrade levels compactly when relevant
  const u = [
    [room.upgrades.u_click || 0, "Click Power"],
    [room.upgrades.u_energy || 0, "Energy Core"],
    [room.upgrades.u_fortune || 0, "Fortune"],
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <h3 className="font-display text-sm font-bold text-white">Room upgrades (levels)</h3>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
        {u.map(([lv, name]) => (
          <div key={name} className="rounded-xl bg-white/5 py-2">
            <div className="font-display font-bold text-fuchsia-300">Lv {lv}</div>
            <div className="text-xs text-white/50">{name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/5 py-2">
      <div className="font-display text-lg font-extrabold text-white">{value}</div>
      <div className="text-xs text-white/40">{label}</div>
    </div>
  );
}
