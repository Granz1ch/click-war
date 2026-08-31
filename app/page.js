"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TapCoin } from "@/components/TapCoin";
import { Starfield } from "@/components/Starfield";
import { useApp } from "@/components/Providers";

const FEATURES = [
  {
    emoji: "🪙",
    title: "Tap to earn",
    desc: "Tap the coin to fill your room's treasury every second. Upgrade click power, auto-miners and energy cores.",
  },
  {
    emoji: "🥚",
    title: "Hatch rare pets",
    desc: "Spend coins on eggs to hatch companions of six rarities — plus ultra-rare Exclusives that net your room stars.",
  },
  {
    emoji: "👑",
    title: "Run your treasury",
    desc: "Every room has its own shared bank. Deposit coins and pets, cap the capacity, and climb the star leaderboard.",
  },
  {
    emoji: "🏠",
    title: "Play over the network",
    desc: "Create a room, share the tag, and let friends join from their own homes. Real online multiplayer.",
  },
  {
    emoji: "🌱",
    title: "Skill tree",
    desc: "Rebirth to earn crystals, then spend them on permanent personal skills: stronger taps, more luck, automation.",
  },
  {
    emoji: "🎁",
    title: "Promos & admin",
    desc: "Redeem promo codes for coin, crystal or even pet rewards — and builders get a full admin control panel.",
  },
];

const RARITIES = [
  { name: "Common", color: "#9ca3af" },
  { name: "Uncommon", color: "#4ade80" },
  { name: "Rare", color: "#38bdf8" },
  { name: "Epic", color: "#a855f7" },
  { name: "Legendary", color: "#f59e0b" },
  { name: "Mythic", color: "#f43f5e" },
  { name: "Exclusive", color: "#f472b6" },
];

export default function LandingPage() {
  const { user } = useApp();
  const [count, setCount] = useState(0);

  return (
    <>
      <Starfield />
      <div className="relative z-10 min-h-screen">
        {/* Nav */}
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="Click War logo"
              className="h-10 w-10 rounded-full shadow-lg"
              draggable={false}
            />
            <span className="font-display text-xl font-extrabold tracking-tight text-gradient">
              CLICK WAR
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/game" className="btn-primary">
                  Play now
                </Link>
                <span className="hidden font-display text-sm text-white/60 sm:inline">
                  {user.login}
                </span>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-ghost">
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary">
                  Play free
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero */}
        <header className="mx-auto grid max-w-7xl items-center gap-10 px-6 pb-20 pt-10 lg:grid-cols-2">
          <div>
            <span className="chip border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200">
              ⚡ Online clicker · Multiplayer
            </span>
            <h1 className="mt-5 font-display text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
              Tap. Build.
              <br />
              <span className="text-gradient">Conquer the treasury.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/60">
              Click War is a neon fantasy clicker where you and your friends
              mine coins into a shared treasury, hatch legendary pets, and
              race to top the starboard. Start a room, share the tag, and
              battle from any home on the network.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/register" className="btn-primary text-base">
                Start playing — it's free
              </Link>
              {!user && (
                <Link href="/login" className="btn-ghost text-base">
                  I have an account
                </Link>
              )}
            </div>
          </div>

          {/* animated coin */}
          <div className="flex flex-col items-center justify-center">
            <img
              src="/logo.png"
              alt=""
              className="pointer-events-none absolute -z-10 opacity-20 blur-2xl"
              draggable={false}
            />
            <p className="mb-4 font-display text-sm uppercase tracking-widest text-white/40">
              Try the coin · {count.toLocaleString()}
            </p>
            <TapCoin size="lg" onTap={() => setCount((c) => c + 1)} />
            <p className="mt-4 text-sm text-white/40">
              {count > 0 ? "Feels good, right? Now imagine it goes to your room." : "Tap the coin to warm up."}
            </p>
          </div>
        </header>

        {/* Rarity strip */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="card flex flex-wrap items-center justify-center gap-3">
            <span className="font-display text-sm uppercase tracking-widest text-white/40">
              Rarities
            </span>
            {RARITIES.map((r) => (
              <span
                key={r.name}
                className="chip border"
                style={{
                  color: r.color,
                  borderColor: r.color + "66",
                  background: r.color + "1a",
                }}
              >
                {r.name}
              </span>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-7xl px-6 pb-24">
          <h2 className="mb-2 text-center font-display text-3xl font-extrabold">
            Everything a clicker should be
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-white/50">
            Every mechanic is designed to keep the whole group tapping, trading
            and showing off.
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="card group transition-all hover:-translate-y-1 hover:border-fuchsia-400/40 hover:glow-purple"
              >
                <div className="mb-4 text-4xl transition-transform group-hover:scale-110">
                  {f.emoji}
                </div>
                <h3 className="font-display text-lg font-bold text-white">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="card glow-purple text-center">
            <h3 className="font-display text-3xl font-extrabold">
              Ready to start your own <span className="text-gradient">Click War</span>?
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-white/60">
              Create a room in under a minute, send the tag to your friends,
              and let the tapping begin.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <Link href={user ? "/game" : "/register"} className="btn-primary text-base">
                {user ? "Enter your room" : "Create my room"}
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 py-8 text-center text-sm text-white/30">
          Click War · open-source fullstack game · built with Next.js
        </footer>
      </div>
    </>
  );
}
