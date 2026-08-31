"use client";

import { useState, useCallback } from "react";

export function TapCoin({ onTap, size = "md", disabled = false, className = "" }) {
  const [pulse, setPulse] = useState(0);
  const [popups, setPopups] = useState([]);

  const handleTap = useCallback(
    (e) => {
      if (disabled) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now() + Math.random();
      setPopups((p) => [...p, { id, x, y }]);
      setPulse((p) => p + 1);
      setTimeout(() => setPopups((p) => p.filter((q) => q.id !== id)), 700);
      if (onTap) onTap(e);
    },
    [onTap, disabled]
  );

  const imgSrc = "/coins/coin.svg";
  const dims =
    size === "lg" ? "h-56 w-56" : size === "sm" ? "h-20 w-20" : "h-36 w-36";

  return (
    <div className={`relative ${className}`} style={{ transform: pulse ? `scale(${1.06 - (pulse % 2) * 0.06})` : "none" }}>
      <button
        onClick={handleTap}
        disabled={disabled}
        className={`relative select-none transition-transform active:scale-90 ${dims} ${
          disabled ? "opacity-50" : "cursor-pointer"
        }`}
        aria-label="Tap the coin"
      >
        <img src={imgSrc} alt="Coin" draggable={false} className="h-full w-full drop-shadow-[0_0_30px_rgba(251,191,36,0.6)]" />
      </button>
      {popups.map((p) => (
        <span
          key={p.id}
          className="pointer-events-none absolute font-display font-bold text-amber-300"
          style={{
            left: p.x,
            top: p.y,
            animation: "pop-up 0.6s ease-out forwards",
          }}
        >
          +1
        </span>
      ))}
    </div>
  );
}
