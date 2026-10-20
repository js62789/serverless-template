import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        // Server tests run inside workerd, the Cloudflare Workers runtime.
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
        test: {
          name: "worker",
          include: ["app/**/*.test.{ts,tsx}"],
          exclude: ["app/**/public/**"],
        },
      },
      {
        // Browser source in public/ directories is tested against a DOM.
        test: {
          name: "browser",
          environment: "happy-dom",
          include: ["app/**/public/**/*.test.{ts,tsx}"],
        },
      },
    ],
  },
});
