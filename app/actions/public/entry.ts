import { run } from "remix/component";

import { HealthCheck } from "./health-check.tsx";

// Every client entry component must be registered here so the browser
// runtime can hydrate it.
const components: Record<string, unknown> = { HealthCheck };

const app = run({
  async loadModule(moduleUrl, exportName) {
    let Component = components[exportName];
    if (typeof Component !== "function") {
      throw new Error(`Unknown component: ${moduleUrl}#${exportName}`);
    }
    return Component;
  },
});

app.addEventListener("error", (event) => {
  console.error("Component error:", event.error);
});

// In development, re-render the page in place when server code changes. The
// top frame reload fetches fresh HTML and diffs <head> and <body> into the
// live document, keeping hydrated component state where the markup matches.
if (import.meta.hot) {
  // Browser modules changed, so Vite is about to reload the page. Remix
  // intercepts same-origin navigations (including reloads) and would turn
  // this into a soft reload that keeps running the old code; disposing the
  // runtime removes that interception so the document truly reloads.
  import.meta.hot.on("vite:beforeFullReload", () => {
    app.dispose();
  });

  import.meta.hot.on("remix:server-update", async () => {
    try {
      await app.ready();
      await app.frames.top.reload();
    } catch (error) {
      console.error("Soft reload failed; reloading the page:", error);
      location.reload();
    }
  });
}
