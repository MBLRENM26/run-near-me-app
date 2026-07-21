import { createServerOnlyFn } from "@tanstack/react-start";

/**
 * Lightweight same-origin check for state-changing admin server functions.
 *
 * Wrapped in `createServerOnlyFn` so the underlying `@tanstack/react-start/server`
 * import (denied in the client environment) never lands in a client bundle,
 * even if this module is transitively reachable via a `*.functions.ts` file's
 * top-level imports (only handler bodies are stripped by the server-fn splitter).
 */
export const requireSameOriginOrThrow = createServerOnlyFn((): void => {
  // Loaded lazily inside the server-only body to avoid the `/server` specifier
  // appearing in the module graph seen by the client bundler.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    getRequestHeader,
    getRequestUrl,
  } = require("@tanstack/react-start/server") as typeof import("@tanstack/react-start/server");

  const url = getRequestUrl();
  const expectedOrigin = `${url.protocol}//${url.host}`;

  const origin = getRequestHeader("origin");
  if (origin) {
    if (origin !== expectedOrigin) {
      throw new Error("Invalid origin");
    }
    return;
  }

  const referer = getRequestHeader("referer");
  if (referer) {
    let refererOrigin: string;
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      throw new Error("Invalid referer");
    }
    if (refererOrigin !== expectedOrigin) {
      throw new Error("Invalid referer");
    }
  }
});
