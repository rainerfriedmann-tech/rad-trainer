import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native Node addon — keep it out of the bundler and
  // load it via native require on the server.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
