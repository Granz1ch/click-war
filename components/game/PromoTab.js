"use client";

import { useState } from "react";
import { useApp } from "../Providers";

export function PromoTab({ room, refresh }) {
  const { api, showToast } = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function activate(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setResult(null);
    const res = await api("/api/promo", { method: "POST", body: { code } });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, "error");
      return;
    }
    setResult(res);
    showToast("Promo activated!", "success");
    refresh();
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center">
        <div className="text-4xl">🎁</div>
        <h3 className="mt-2 font-display text-2xl font-extrabold text-white">Redeem a promo code</h3>
        <p className="mt-1 text-sm text-white/50">
          Codes grant coins, crystals or pets straight into your room&apos;s treasury.
          One activation per account.
        </p>
        <form onSubmit={activate} className="mt-5 flex gap-2">
          <input
            className="input flex-1 text-center font-mono uppercase"
            placeholder="ENTER CODE"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
          <button type="submit" className="btn-primary" disabled={busy || !code.trim()}>
            {busy ? "..." : "Redeem"}
          </button>
        </form>
      </div>

      {result && (
        <div className="rounded-2xl border-2 border-emerald-400/40 bg-emerald-400/10 p-5">
          <p className="font-display font-bold text-emerald-200">
            ✅ {result.promo} — {result.title}
          </p>
          <div className="mt-2 text-sm text-white/70">
            {result.rewards?.coins !== undefined && (
              <p>🪙 +{result.rewards.coins} coins to treasury</p>
            )}
            {result.rewards?.crystals !== undefined && (
              <p>💎 +{result.rewards.crystals} crystals to treasury</p>
            )}
            {result.rewards?.pets?.map((p, i) => (
              <p key={i}>
                🐾 +{p.count}x {p.name} to treasury
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
