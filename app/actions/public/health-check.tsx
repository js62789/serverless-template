import { clientEntry, on, type Handle } from "remix/component";

import { entryHref } from "./entry-href.ts";

export interface HealthCheckProps {
  href: string;
}

/**
 * Button that queries the health endpoint from the browser and shows the result.
 *
 * @param handle - Component handle carrying the health endpoint URL.
 * @returns A render function producing the button and status output.
 */
export const HealthCheck = clientEntry(
  `${entryHref}#HealthCheck`,
  function HealthCheck(handle: Handle<HealthCheckProps>) {
    let pending = false;
    let status = "not checked";

    return () => (
      <div>
        <button
          type="button"
          disabled={pending}
          mix={on("click", async (_event, signal) => {
            pending = true;
            handle.update();

            let nextStatus = await fetchHealthStatus(handle.props.href, signal);
            if (signal.aborted) return;

            status = nextStatus;
            pending = false;
            handle.update();
          })}
        >
          {pending ? "Checking…" : "Check health"}
        </button>
        <output>{status}</output>
      </div>
    );
  },
);

/**
 * Fetches the health endpoint and describes the result.
 *
 * @param href - URL of the health endpoint.
 * @param signal - Abort signal that cancels the request.
 * @returns The reported status, or a short description of the failure.
 */
async function fetchHealthStatus(href: string, signal: AbortSignal): Promise<string> {
  try {
    let response = await fetch(href, { signal });
    if (!response.ok) return `error (HTTP ${response.status})`;

    let body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "status" in body) {
      return String(body.status);
    }
    return "error (unexpected response)";
  } catch {
    return "error (request failed)";
  }
}
