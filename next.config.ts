import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the libSQL client out of the bundler (it has optional native deps for
  // local file URLs); load it via native require on the server.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
