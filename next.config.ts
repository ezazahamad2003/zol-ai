import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Produces a minimal self-contained build for Docker/Cloud Run
};

export default nextConfig;
