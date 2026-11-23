import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Encuentra la configuración de los idiomas en src/i18n/request.ts.
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Las instrucciones para agentes viven en CLAUDE.md; sin esto, next dev genera un AGENTS.md en la raíz.
  agentRules: false,
  experimental: {
    // Las portadas suben hasta 2 MB, y FormData agrega su propio peso sobre el archivo.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default withNextIntl(nextConfig);
