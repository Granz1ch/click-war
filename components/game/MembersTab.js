"use client";

import { useEffect, useState } from "react";
import { useApp } from "../Providers";

export function MembersTab({ room, members, refresh }) {
  const { api, showToast, user } = useApp();
  const [requests, setRequests] = useState([]);
  const isOwner = room.ownerId === user.id;

  async function loadRequests() {
    if (!isOwner) return;
    const res = await api(`/api/rooms/${room.id}/requests`, { method: "GET" });
    if (res && res.ok) setRequests(res.requests);
  }

  useEffect(() => {
    loadRequests();
  }, [room.id, isOwner]);

  async function decide(userId, action) {
    const res = await api(`/api/rooms/${room.id}/requests`, {
      method: "POST",
      body: { userId, action },
    });
    if (!res.ok) showToast(res.error, "error");
    else {
      showToast(action === "accept" ? "Player accepted!" : "Request rejected", "success");
      loadRequests();
      refresh();
    }
  }

  async function leave() {
    const res = await api(`/api/rooms/${room.id}/leave`, { method: "POST" });
    if (!res.ok) showToast(res.error, "error");
    else {
      showToast("You left the room", "info");
      refresh();
    }
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="font-display text-lg font-extrabold text-white">
            Join requests
          </h3>
          {requests.length === 0 ? (
            <p className="mt-2 text-sm text-white/40">No pending requests.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 p-3"
                >
                  <span className="font-display font-semibold text-white">{r.login}</span>
                  <div className="flex gap-2">
                    <button
                      className="btn-primary !px-4 !py-2 text-sm"
                      onClick={() => decide(r.id, "accept")}
                    >
                      Accept
                    </button>
                    <button
                      className="btn-ghost !px-4 !py-2 text-sm"
                      onClick={() => decide(r.id, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold text-white">
            Members ({members.length}/{room.maxPlayers})
          </h3>
          <button
            className="btn-ghost !py-2 text-sm"
            disabled={room.blocked}
            onClick={leave}
          >
            🚪 Leave room
          </button>
        </div>
        {room.blocked && (
          <p className="mt-1 text-xs text-rose-300">
            You can&apos;t leave while the room is locked.
          </p>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 font-display font-bold text-white">
                {m.login[0]?.toUpperCase()}
              </span>
              <div className="flex-1">
                <div className="font-display text-sm font-bold text-white">
                  {m.login}
                  {m.isOwner && <span className="ml-1 text-amber-300">👑</span>}
                </div>
              </div>
              {m.id === user.id && (
                <span className="chip border-cyan-400/30 bg-cyan-400/10 text-cyan-200">
                  You
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
