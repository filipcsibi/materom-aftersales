import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page here is per-user and behind login, so there is nothing to
  // prerender or cache: Cache Components stays off.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
