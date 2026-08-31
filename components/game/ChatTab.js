"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useApp } from "../Providers";

export function ChatTab({ room, refresh }) {
  const { api, user, showToast } = useApp();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);
  const specialFont = user.effects?.specialFont;

  const load = useCallback(async () => {
    const res = await api(`/api/rooms/${room.id}/chat`, { method: "GET" });
    if (res && res.ok) setMessages(res.chat || []);
  }, [api, room.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for new messages every 4s
  useEffect(() => {
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (boxRef.current) {
      boxRef.current.scrollTop = boxRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const res = await api(`/api/rooms/${room.id}/chat`, {
      method: "POST",
      body: { text },
    });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error, "error");
      return;
    }
    setMessages(res.chat || []);
    setText("");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div
        ref={boxRef}
        className="h-72 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-4"
      >
        {messages.length === 0 ? (
          <p className="text-center text-sm text-white/40">
            No messages yet. Say hi to your room! 👋
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-xs font-bold text-white">
                {m.login[0]?.toUpperCase()}
              </span>
              <div className="min-w-0">
                <span
                  className={`text-xs font-semibold ${
                    m.userId === user.id ? "text-cyan-300" : "text-fuchsia-300"
                  }`}
                >
                  {m.special && "✦ "}
                  {m.login}
                </span>
                <p
                  className={`break-words ${
                    m.special
                      ? "font-display text-[13px] leading-snug text-gradient"
                      : "text-sm text-white/85"
                  }`}
                >
                  {m.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          className="input"
          placeholder={specialFont ? "You unlocked the special font! ✦" : "Type a message..."}
          value={text}
          maxLength={320}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn-primary !px-5" disabled={busy || !text.trim()}>
          Send
        </button>
      </form>
      <p className="text-xs text-white/40">
        {specialFont
          ? "✦ Your special dex font shows in your messages."
          : "Complete the pet dex to unlock a glowing nickname + special message font."}
      </p>
    </div>
  );
}
