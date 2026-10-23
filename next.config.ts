import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  outputFileTracingIncludes: { "/api/body-pose": ["./src/lib/server/protos/**/*.proto"] },
};

export default nextConfig;
