import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Las instrucciones para agentes viven en CLAUDE.md; sin esto, next dev genera un AGENTS.md en la raíz.
  agentRules: false,
  experimental: {
    // Las portadas suben hasta 2 MB, y FormData agrega su propio peso sobre el archivo.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
