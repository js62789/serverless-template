/**
 * Browser URL of the client entry module. In development Vite serves the
 * source file directly; production builds emit it at a stable path (see
 * `vite.config.ts`).
 */
export const entryHref = import.meta.env.DEV ? "/app/actions/public/entry.ts" : "/assets/entry.js";
