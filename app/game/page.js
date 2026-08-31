"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/Providers";
import { Toast } from "@/components/Toast";
import { GameShell } from "@/components/game/GameShell";

export default function GamePage() {
  const { user, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spinSlow rounded-full border-4 border-fuchsia-400 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/50">
        Redirecting...
      </div>
    );
  }

  return (
    <>
      <GameShell />
      <Toast />
    </>
  );
}
