import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a self-contained server bundle for the Fly.io Docker image.
  output: "standalone",

  async headers() {
    return [
      {
        // Self-hosted MobileNet weights: immutable, cache forever. If we ever
        // swap models, use a new directory name instead of editing in place.
        source: "/models/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
