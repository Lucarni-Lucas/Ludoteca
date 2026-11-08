import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/{app,config,model,persistence,security,service,shared}/**/*.test.{ts,tsx}"],
        },
      },
      {
        extends: true,
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["tests/{components,hooks}/**/*.test.{ts,tsx}"],
          setupFiles: ["tests/setup-dom.ts"],
        },
      },
    ],
  },
});
