import { cloudflare } from "@cloudflare/vite-plugin";
import { transformComponentsForBrowser } from "remix/component-hmr";
import { defineConfig, type Plugin } from "vite";

/**
 * Notifies the browser when a module in the Worker's graph changes.
 *
 * Server-rendered modules aren't part of the browser's module graph, so Vite
 * has nothing to hot-update when they change. The client entry handles this
 * event by re-rendering the page in place (see `app/actions/public/entry.ts`).
 *
 * @returns A Vite plugin that sends `remix:server-update` on Worker updates.
 */
function notifyOnWorkerUpdate(): Plugin {
  return {
    name: "notify-on-worker-update",
    apply: "serve",
    hotUpdate({ modules, server }) {
      if (this.environment.name !== "client" && modules.length > 0) {
        server.environments.client.hot.send("remix:server-update");
      }
    },
  };
}

/**
 * Hot-swaps Remix components in browser modules without losing their state.
 *
 * Applies Remix's component HMR transform (the one `remix/assets` uses) to
 * browser source in `public/` directories under `app/`. Render-only edits
 * keep component state; edits to a component's setup scope remount it.
 *
 * @returns A Vite plugin that adds component HMR to browser modules in dev.
 */
function remixComponentHmr(): Plugin {
  return {
    name: "remix-component-hmr",
    apply: "serve",
    applyToEnvironment: (environment) => environment.name === "client",
    transform: {
      filter: { id: /\/app\/(?:.+\/)?public\/.+\.tsx$/ },
      handler(code, id) {
        let result = transformComponentsForBrowser(code, {
          importSource: "remix",
          moduleUrl: id,
          sourceMap: true,
        });
        return result.transformed ? { code: result.code, map: result.map } : null;
      },
    },
  };
}

export default defineConfig({
  plugins: [cloudflare(), notifyOnWorkerUpdate(), remixComponentHmr()],
  environments: {
    client: {
      // Imported by the component HMR transform; listed so Vite pre-bundles
      // them up front instead of re-optimizing (and reloading) on first use.
      optimizeDeps: {
        include: ["remix/component-hmr/runtime/browser", "remix/component/dev/refresh"],
      },
      build: {
        rolldownOptions: {
          input: { entry: "app/actions/public/entry.ts" },
          // Keep the entry at a stable URL so the Worker can reference it
          // without reading a build manifest. Shared chunks stay hashed.
          output: { entryFileNames: "assets/[name].js" },
        },
      },
    },
  },
  // Vite's CORS middleware answers every OPTIONS request with 204, masking the
  // Worker's real responses. Disable it so local behavior matches production.
  server: { cors: false },
  preview: { cors: false },
});
