import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "192.168.*.*", 
    "10.*.*.*", 
    "localhost",
    "127.0.0.1",
    "*" // Allow any origin during development
  ],
  serverExternalPackages: ["@auth/core"],
};

export default nextConfig;
