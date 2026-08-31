"use client";

import { useApp } from "./Providers";

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  const styles = {
    success: "from-emerald-500 to-cyan-400",
    error: "from-rose-500 to-red-400",
    info: "from-fuchsia-500 to-purple-400",
  };
  const cls = styles[toast.type] || styles.info;
  return (
    <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2">
      <div
        key={toast.key}
        className={`animate-floaty rounded-2xl bg-gradient-to-r ${cls} px-6 py-3 font-display text-sm font-semibold text-white shadow-2xl`}
      >
        {toast.msg}
      </div>
    </div>
  );
}
