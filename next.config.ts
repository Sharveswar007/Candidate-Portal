import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  // Increase body size limit for proctoring uploads (videos/screenshots)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;

    // Ignore Node.js modules for client-side face-api.js
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
      };
    }

    return config;
  },
};

export default nextConfig;
