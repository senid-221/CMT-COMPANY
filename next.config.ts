import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Shared hosting caps the number of processes the build user may spawn.
  // Default is one worker per CPU minus one, which trips EAGAIN on fork.
  experimental: { cpus: 1 },
  // Trace build output from this folder, not from a parent holding another lockfile.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
