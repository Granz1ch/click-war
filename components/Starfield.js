"use client";

import { useMemo } from "react";

export function Starfield() {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: Math.random() * 3,
        size: Math.random() > 0.8 ? 3 : 2,
      })),
    []
  );
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {stars.map((s) => (
        <span
          key={s.id}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
