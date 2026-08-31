/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow Supabase routes for the demo; production uses the same URLs.
  env: {
    NEXT_PUBLIC_APP_NAME: "Click War",
  },
};

module.exports = nextConfig;
