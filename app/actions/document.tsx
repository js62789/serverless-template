import { unsafeHTML, type Handle, type RemixNode } from "remix/component";

import globalStylesHref from "../styles/global.css?url";
import { entryHref } from "./public/entry-href.ts";

export interface DocumentProps {
  children?: RemixNode;
  /** Compiled CSS for the page, inlined into the document head. */
  styles?: string;
  title: string;
}

/**
 * Renders the shared HTML document shell.
 *
 * @param handle - Component handle carrying the document's title, page styles, and body content.
 * @returns A render function producing the full `<html>` tree.
 */
export function Document(handle: Handle<DocumentProps>) {
  return () => {
    let { children, styles, title } = handle.props;

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>{title}</title>
          {/* No favicon yet; an empty data URL stops browsers requesting /favicon.ico. */}
          <link rel="icon" href="data:," />
          <link rel="stylesheet" href={globalStylesHref} />
          {styles ? <style innerHTML={unsafeHTML(styles)} /> : null}
          {import.meta.env.DEV ? <script type="module" src="/@vite/client"></script> : null}
          <script type="module" src={entryHref}></script>
        </head>
        <body>{children}</body>
      </html>
    );
  };
}
