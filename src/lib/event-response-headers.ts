import { createServerOnlyFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

// Server-only: TanStack's compiler strips this (and its imports) from the
// client bundle, so import-protection never sees @tanstack/react-start/server
// as a client specifier. Called from the events.$slug loader only during SSR;
// on client navigations the loader skips the call via import.meta.env.SSR.
export const setEventResponseHeaders = createServerOnlyFn(
  (opts: { gone: boolean; noindex: boolean }) => {
    if (opts.gone) {
      setResponseHeader("X-Status-Override", "410");
      setResponseHeader("X-Robots-Tag", "noindex");
    } else if (opts.noindex) {
      setResponseHeader("X-Robots-Tag", "noindex");
    }
  },
);
