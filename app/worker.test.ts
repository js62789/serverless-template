import { describe, expect, it } from "vitest";

import worker from "./worker.ts";

/**
 * Sends a request through the Worker's fetch handler.
 *
 * @param path - Request path, resolved against a placeholder origin.
 * @param method - HTTP method to use.
 * @returns The Worker's response.
 */
function request(path: string, method = "GET"): Promise<Response> {
  return worker.fetch(new Request(new URL(path, "http://localhost"), { method }));
}

describe("GET /", () => {
  it("renders the home page as HTML", async () => {
    let response = await request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toMatch(/^text\/html/);
    let html = await response.text();
    expect(html).toContain("<h1");
    expect(html).toContain('href="/api/health"');
  });

  it("opts the API link out of client navigation", async () => {
    let html = await (await request("/")).text();

    expect(html).toMatch(/<a [^>]*href="\/api\/health"[^>]*data-rmx-document/);
  });

  it("server-renders the health check and loads the client entry", async () => {
    let html = await (await request("/")).text();

    expect(html).toContain("Check health");
    expect(html).toMatch(/<script type="module" src="[^"]*\/entry\.(ts|js)"/);
  });
});

describe("GET /api/health", () => {
  it("returns ok as JSON", async () => {
    let response = await request("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(await response.json()).toEqual({ status: "ok" });
  });
});

describe("unknown routes", () => {
  it.each(["/does-not-exist", "/api/does-not-exist", "/api", "/api/health/"])(
    "returns 404 for %s",
    async (path) => {
      expect((await request(path)).status).toBe(404);
    },
  );
});

describe("unsupported methods", () => {
  it.each([
    ["POST", "/"],
    ["PUT", "/api/health"],
    ["PATCH", "/"],
    ["DELETE", "/api/health"],
    ["OPTIONS", "/api/health"],
  ])("returns 405 for %s %s", async (method, path) => {
    let response = await request(path, method);

    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("GET, HEAD");
  });
});
