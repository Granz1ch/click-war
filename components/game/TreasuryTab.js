"use client";

import { useState } from "react";
import { useApp } from "../Providers";
import { useCatalog } from "../useCatalog";

export function TreasuryTab({ room, refresh }) {
  const { api, showToast, user } = useApp();
  const cat = useCatalog();
  const [coinsIn, setCoinsIn] = useState("");
  const [coinsOut, setCoinsOut] = useState("");
  const [busy, setBusy] = useState(false);

  const treasury = room.treasury;
  const frozen = treasury.frozen;
  const capacityPct = Math.min(100, (treasury.coins / treasury.capacity) * 100);
  const petTotal = Object.values(treasury.pets).reduce((a, b) => a + b, 0);

  async function act(type, body) {
    setBusy(true);
    const res = await api(`/api/rooms/${room.id}/treasury`, {
      method: "POST",
      body,
    });
    setBusy(false);
    if (!res.ok) showToast(res.error, "error");
    else showToast("Treasury updated!", "success");
    refresh();
  }

  const petById = (cat?.pets || []).reduce((m, p) => ((m[p.id] = p), m), {});

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-white">🏦 Treasury</h3>
            {frozen && (
              <span className="chip border-rose-400/40 bg-rose-500/10 text-rose-300">
                ❄️ Frozen
              </span>
            )}
          </div>
          <div className="mt-4 flex items-end gap-1">
            <span className="font-display text-3xl font-extrabold text-amber-300">
              {treasury.coins.toLocaleString()}
            </span>
            <span className="mb-1 text-sm text-white/40">
              / {treasury.capacity.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-200"
              style={{ width: `${capacityPct}%` }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-white/5 py-3">
              <div className="font-display text-lg font-extrabold text-cyan-300">
                {treasury.crystals.toLocaleString()}
              </div>
              <div className="text-xs text-white/40">Crystals</div>
            </div>
            <div className="rounded-xl bg-white/5 py-3">
              <div className="font-display text-lg font-extrabold text-pink-300">
                {treasury.star.toLocaleString()}
              </div>
              <div className="text-xs text-white/40">Stars</div>
            </div>
          </div>
        </div>

        {frozen && (
          <p className="text-sm text-rose-300">
            The treasury is frozen by an admin. You can&apos;t deposit or withdraw right now.
          </p>
        )}

        {/* deposit / withdraw coins */}
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="font-display text-sm font-bold text-white">Coins</h3>
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              className="input"
              placeholder="Amount"
              value={coinsIn}
              onChange={(e) => setCoinsIn(e.target.value)}
              disabled={frozen}
            />
            <button
              className="btn-primary !px-4 !py-2 text-sm"
              disabled={busy || frozen || !coinsIn}
              onClick={() => {
                act("deposit", { type: "deposit", amount: Number(coinsIn) });
                setCoinsIn("");
              }}
            >
              Deposit
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="number"
              className="input"
              placeholder="Amount"
              value={coinsOut}
              onChange={(e) => setCoinsOut(e.target.value)}
              disabled={frozen}
            />
            <button
              className="btn-ghost !px-4 !py-2 text-sm"
              disabled={busy || frozen || !coinsOut}
              onClick={() => {
                act("withdraw", { type: "withdraw", amount: Number(coinsOut) });
                setCoinsOut("");
              }}
            >
              Withdraw
            </button>
          </div>
        </div>

        {/* deposit / withdraw pets */}
        <DepositPets room={room} cat={cat} user={user} act={act} busy={busy} frozen={frozen} />
      </div>

      {/* pet storage */}
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white">🐾 Treasury pet storage</h3>
          <span className="text-xs text-white/40">
            {petTotal} / {treasury.petCapacity}
          </span>
        </div>

        {Object.keys(treasury.pets).length === 0 ? (
          <p className="mt-4 text-center text-sm text-white/40">
            No pets in the treasury yet. Hatch some, then deposit.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(treasury.pets).map(([pid, count]) => {
              const p = petById[pid];
              return (
                <MutationPetRow
                  key={pid}
                  pet={p}
                  petId={pid}
                  count={count}
                  room={room}
                  act={act}
                  busy={busy}
                  frozen={frozen}
                />
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-white/40">
          Deposit <b>Exclusive</b> pets to earn <b>+1 star</b> each while they stay in the treasury.
        </p>
      </div>
    </div>
  );
}

function MutationPetRow({ pet, petId, count, room, act, busy, frozen }) {
  const [cnt, setCnt] = useState(1);
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/5 p-2">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{pet ? pet.emoji : "🐾"}</span>
        <div>
          <div className="text-sm font-semibold text-white">{pet ? pet.name : petId}</div>
          <div className="text-xs text-white/40">x{count}</div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          value={cnt}
          onChange={(e) => setCnt(Math.max(1, Number(e.target.value) || 1))}
          className="w-12 rounded-lg border border-white/10 bg-black/30 px-1 py-1 text-center text-xs"
          disabled={frozen}
        />
        <button
          className="btn-ghost !px-2 !py-1 text-xs"
          disabled={busy || frozen}
          onClick={() => act("pet_withdraw", { type: "pet_withdraw", petId, count: cnt })}
        >
          Take
        </button>
      </div>
    </div>
  );
}

function DepositPets({ room, cat, user, act, busy, frozen }) {
  const [qty, setQty] = useState(1);
  const [selected, setSelected] = useState("");
  const inventory = user.inventory || {};
  const owned = Object.entries(inventory).filter(([, c]) => c > 0);
  const petById = (cat?.pets || []).reduce((m, p) => ((m[p.id] = p), m), {});
  const selectedPet = petById[selected];

  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
      <h3 className="font-display text-sm font-bold text-white">Deposit own pet to treasury</h3>
      {owned.length === 0 ? (
        <p className="mt-3 text-sm text-white/40">You have no pets in your inventory.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <select
            className="input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Choose a pet...</option>
            {owned.map(([pid, c]) => {
              const p = petById[pid];
              return (
                <option key={pid} value={pid}>
                  {p ? p.emoji + " " : ""}
                  {p ? p.name : pid} (x{c})
                </option>
              );
            })}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              className="input"
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
            />
            <button
              className="btn-primary !px-4 !py-2 text-sm"
              disabled={busy || frozen || !selected}
              onClick={() =>
                act("pet_deposit", { type: "pet_deposit", petId: selected, count: qty })
              }
            >
              Deposit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
