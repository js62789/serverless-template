import { render } from "remix/middleware/render";
import { createRouter, type MiddlewareContext } from "remix/router";

import controller from "./actions/controller.tsx";
import { routes } from "./routes.ts";

const renderMiddleware = render();
type AppContext = MiddlewareContext<[typeof renderMiddleware]>;

declare module "remix" {
  interface RouterTypes {
    context: AppContext;
  }
}

export const router = createRouter<AppContext>({
  middleware: [renderMiddleware],
});

router.map(routes, controller);
