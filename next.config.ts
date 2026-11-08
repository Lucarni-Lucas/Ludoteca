import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Las instrucciones para agentes viven en CLAUDE.md; sin esto, next dev genera un AGENTS.md en la raíz.
  agentRules: false,
};

export default nextConfig;
