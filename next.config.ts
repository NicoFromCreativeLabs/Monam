import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // The user's home directory holds an unrelated top-level git repo/lockfile;
  // pin Turbopack's workspace root to this project so it doesn't try to trace
  // up into it.
  turbopack: {
    root: path.join(__dirname),
  },
  // Drop the "X-Powered-By: Next.js" response header — free framework
  // fingerprinting removed for attackers, no functional cost.
  poweredByHeader: false,
};

export default nextConfig;
