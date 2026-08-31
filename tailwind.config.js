/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          purple: "#a855f7",
          pink: "#ec4899",
          cyan: "#22d3ee",
          gold: "#fbbf24",
        },
      },
      fontFamily: {
        game: ["var(--font-game)", "sans-serif"],
        display: ["var(--font-display)", "sans-serif"],
      },
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(-4px)" },
          "50%": { transform: "translateY(4px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 30px rgba(168,85,247,0.5)" },
          "50%": { boxShadow: "0 0 60px rgba(236,72,153,0.8)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        spinSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        floaty: "floaty 3s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
        spinSlow: "spinSlow 14s linear infinite",
      },
    },
  },
  plugins: [],
};
