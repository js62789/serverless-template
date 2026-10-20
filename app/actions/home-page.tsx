import { routes } from "../routes.ts";
import { Document } from "./document.tsx";
import styles from "./home-page.module.css";
import inlineStyles from "./home-page.module.css?inline";
import { HealthCheck } from "./public/health-check.tsx";

/**
 * Renders the home page.
 *
 * @returns A render function producing the home page document.
 */
export function HomePage() {
  return () => (
    <Document title="Serverless Template" styles={inlineStyles}>
      <main class={styles.main}>
        <h1 class={styles.title}>Serverless Template</h1>
        <p>A minimal Remix v3 starter for Cloudflare Workers.</p>
        {/* Remix intercepts same-origin links and expects HTML back, so links to
            non-HTML resources must opt out to get a normal browser navigation. */}
        <a class={styles.link} href={routes.health.href()} data-rmx-document>
          View the API health endpoint
        </a>
        <div class={styles.healthCheck}>
          <HealthCheck href={routes.health.href()} />
        </div>
      </main>
    </Document>
  );
}
