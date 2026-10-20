import { render } from "remix/component/test";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HealthCheck } from "./health-check.tsx";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HealthCheck", () => {
  it("starts unchecked", (context) => {
    let { $, cleanup } = render(<HealthCheck href="/api/health" />);
    context.onTestFinished(cleanup);

    expect($("output")?.textContent).toBe("not checked");
    expect($("button")?.textContent).toBe("Check health");
  });

  it("shows the reported status", async (context) => {
    let fetchMock = vi.fn<typeof fetch>(async () => Response.json({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    let { $, act, cleanup } = render(<HealthCheck href="/api/health" />);
    context.onTestFinished(cleanup);

    await act(async () => {
      $("button")?.click();
      await vi.waitFor(() => expect($("output")?.textContent).toBe("ok"));
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/health", expect.anything());
    expect($("button")?.hasAttribute("disabled")).toBe(false);
  });

  it("reports HTTP errors", async (context) => {
    vi.stubGlobal("fetch", async () => new Response(null, { status: 503 }));
    let { $, act, cleanup } = render(<HealthCheck href="/api/health" />);
    context.onTestFinished(cleanup);

    await act(async () => {
      $("button")?.click();
      await vi.waitFor(() => expect($("output")?.textContent).toBe("error (HTTP 503)"));
    });
  });

  it("reports network failures", async (context) => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    let { $, act, cleanup } = render(<HealthCheck href="/api/health" />);
    context.onTestFinished(cleanup);

    await act(async () => {
      $("button")?.click();
      await vi.waitFor(() => expect($("output")?.textContent).toBe("error (request failed)"));
    });
  });
});
