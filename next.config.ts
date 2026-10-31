import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared hosting caps the number of processes the build user may spawn.
  // Default is one worker per CPU minus one, which trips EAGAIN on fork.
  experimental: {
    cpus: 1,
    // Let the client router reuse a rendered storefront page for 30s so
    // back/forward and repeat visits skip a server round trip.
    staleTimes: { dynamic: 30, static: 300 },
  },
  // Trace build output from this folder, not from a parent holding another lockfile.
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
