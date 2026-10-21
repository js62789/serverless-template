# Serverless Template

A minimal [Remix v3](https://github.com/remix-run/remix) TypeScript starter that runs on Cloudflare Workers. It uses Remix's native router and component model with no React, server-renders every page, and hydrates one interactive component in the browser.

## Prerequisites

- Node.js 24.3 or newer (required by `remix`)
- pnpm 12 (`corepack enable` picks up the version pinned in `package.json`)

No Cloudflare account is needed for local development.

## Getting started

```sh
pnpm install
pnpm dev
```

Open http://localhost:5173. The Worker runs locally in `workerd`, the actual Workers runtime, through the Cloudflare Vite plugin. Edits to TypeScript, TSX, and CSS take effect without restarting the server. Server-side edits re-render the open page in place, and edits to browser components hot-swap them; both keep component state. See [Design notes](#design-notes-and-known-limitations) for details.

## Endpoints

| Method | Path          | Response                                                            |
| ------ | ------------- | ------------------------------------------------------------------- |
| GET    | `/`           | Server-rendered HTML home page, with a hydrated health check button |
| GET    | `/api/health` | `{"status":"ok"}` (`application/json`)                              |

Every other path returns `404`. Other methods on the routes above return `405` with an `Allow: GET, HEAD` header. `HEAD` is answered automatically for `GET` routes.

## Project structure

```text
app/
  worker.ts                Workers entry; hands each request to the router
  routes.ts                Route definitions (URL + method contract)
  router.ts                Router and middleware setup
  actions/
    controller.tsx         Handlers for the routes in routes.ts
    document.tsx           Shared HTML document shell
    home-page.tsx          Home page component
    home-page.module.css   Home page CSS Module
    public/                Browser source (bundled for the client)
      entry.ts             Browser entry; boots the Remix runtime and hydrates client entries
      entry-href.ts        URL of entry.ts in dev and production
      health-check.tsx     Hydrated component that calls /api/health
      health-check.test.tsx
  worker.test.ts           Route tests, run in workerd
  styles/
    tokens.css             Design tokens (CSS custom properties)
    global.css             Base element styles; imports tokens.css
vite.config.ts             Vite + Cloudflare plugin
vitest.config.ts           Test projects (workerd and DOM)
wrangler.jsonc             Worker configuration
```

To add a route, define it in `app/routes.ts` and add a matching action in `app/actions/controller.tsx`. Remix throws at startup if a route has no action.

## Client-side JavaScript

Pages render on the server. Components that need to run in the browser are wrapped in Remix's `clientEntry()`: they render as HTML on the server, and `run()` in `app/actions/public/entry.ts` hydrates them in the browser.

To add an interactive component:

1. Create it under `app/actions/public/` and wrap it with ``clientEntry(`${entryHref}#Name`, function Name(handle) { ... })``. Its props must be serializable.
2. Register it in the `components` map in `app/actions/public/entry.ts`.

Everything under `public/` ships to the browser, so keep server-only code out of it.

## Styling

- `app/styles/tokens.css` defines semantic tokens for color, typography, spacing, and radius. Colors use `light-dark()`, so the page follows the system light/dark preference with no JavaScript.
- Page styles live in a CSS Module next to the page component. The module is imported twice: once for its class names and once with `?inline` for the compiled CSS, which the document renders in a `<style>` tag.

## Code quality

| Command             | Tool                                 |
| ------------------- | ------------------------------------ |
| `pnpm typecheck`    | TypeScript 7 (`tsc --noEmit`)        |
| `pnpm lint`         | Oxlint                               |
| `pnpm lint:fix`     | Oxlint with autofix                  |
| `pnpm format`       | Oxfmt                                |
| `pnpm format:check` | Oxfmt in check mode                  |
| `pnpm test`         | Vitest (run once)                    |
| `pnpm test:watch`   | Vitest in watch mode                 |
| `pnpm check`        | Typecheck, lint, format check, tests |

`pnpm install` points git at `.githooks/`, whose `pre-push` hook runs `pnpm check`. Skip it with `git push --no-verify`. The `Check` GitHub Actions workflow (`.github/workflows/check.yml`) runs `pnpm check` on every pull request and push to `main`.

## Testing

Vitest runs two projects (see `vitest.config.ts`):

- **worker**: `app/**/*.test.ts(x)` outside `public/`. Runs inside `workerd` through `@cloudflare/vitest-plugin`, so route tests exercise the real Workers runtime.
- **browser**: tests under `app/**/public/`. Runs in `happy-dom` and uses Remix's `render()` from `remix/component/test` to mount and interact with components.

## Production preview

```sh
pnpm build
pnpm preview
```

`pnpm build` writes the Worker bundle to `dist/serverless_template/` and browser assets (the client entry and global CSS) to `dist/client/`. `pnpm preview` serves that build locally in `workerd` at http://localhost:4173.

## Deploying to Cloudflare Workers

Nothing is deployed by this project. To deploy later you would need:

1. A Cloudflare account, plus `wrangler login` or a `CLOUDFLARE_API_TOKEN` with Workers edit permission.
2. `pnpm build`, then `pnpm wrangler deploy` (which uses the generated `dist/serverless_template/wrangler.json`).
3. Optionally, a route or custom domain configured in `wrangler.jsonc`.

## Design notes and known limitations

- **Vite instead of the Remix CLI dev server.** Remix's own dev tooling (`remix/node-tsx`, `remix/node-hmr`, `remix/assets`, `remix/middleware/static`) only runs on Node and can't run inside `workerd`. Remix's asset server also doesn't support CSS Modules. Vite with `@cloudflare/vite-plugin` provides both, and the application code still uses only Remix APIs.
- **CSS Modules are inlined.** Vite does not support `?url` imports of CSS Modules, so each page's module CSS is inlined in its HTML. Global CSS is served as a cacheable stylesheet.
- **Dev updates without full reloads.** Two small plugins in `vite.config.ts` handle this:
  - **Server code and CSS:** a plugin sends a `remix:server-update` event when a Worker module changes. `app/actions/public/entry.ts` responds with `app.frames.top.reload()`, which diffs fresh HTML (including `<head>`) into the page and keeps component state.
  - **Browser components:** a plugin applies Remix's component HMR transform (`remix/component-hmr`, the same one `remix/assets` uses) to `.tsx` files under `public/`. Render-only edits hot-swap with state kept; edits to a component's setup scope remount just that component.
  - **Everything else in `public/`** (for example `entry.ts` itself) falls back to a real reload. Remix intercepts same-origin reloads and would turn Vite's reload into a soft one that keeps running the old code, so the entry disposes the runtime on `vite:beforeFullReload` to let it through.
- **One client bundle.** Remix's asset server would give each `clientEntry()` its own module URL. Here, all client entries are bundled into `entry.ts` and looked up by export name. The entry is emitted at the stable path `/assets/entry.js` so the Worker can reference it without a build manifest. Shared chunks stay content-hashed, and Workers static assets revalidate with ETags.
- **Vite's CORS middleware is disabled** in dev and preview. Otherwise it answers every `OPTIONS` request with `204`, which hides the Worker's real `405`/`404` responses.
- **No Workers runtime types.** The app uses no bindings, so standard `Request`/`Response` types are enough. When you add bindings (KV, D1, and so on), run `pnpm wrangler types` and add the generated file to `tsconfig.json`.
- **No type-aware lint rules.** They need the extra `oxlint-tsgolint` package, and `pnpm typecheck` already covers type errors.
- **Vitest 5 and the renamed Workers plugin.** `@cloudflare/vitest-pool-workers` is deprecated in favor of `@cloudflare/vitest-plugin`, which supports Vitest 5.
- **TypeScript 7.** The native Go compiler, previously previewed as `tsgo` (`@typescript/native-preview`), is now the stable `typescript` package, so `tsc` here is the native compiler.
- **pnpm build scripts.** pnpm blocks dependency install scripts by default. `pnpm-workspace.yaml` allows only `esbuild` and `workerd`, which need them to install their platform binaries.
