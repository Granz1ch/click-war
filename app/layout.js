import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata = {
  metadataBase: new URL("https://click-war.vercel.app"),
  title: {
    default: "Click War — Tap, hatch & conquer",
    template: "%s · Click War",
  },
  description:
    "Tap, build your treasury, hatch rare pets and conquer the scoreboard with friends. A neon fantasy online clicker.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
  openGraph: {
    title: "Click War",
    description:
      "Tap, build your treasury, hatch rare pets and conquer the scoreboard with friends.",
    images: [{ url: "/logo.png", width: 1024, height: 1024 }],
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;800&family=Rajdhani:wght@400;500;600;700&family=Unbounded:wght@400;600;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
