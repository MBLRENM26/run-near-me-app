// Retry only read-only JustGo page requests, never database writes.
export const SCOTTISH_PAGE_TIMEOUT_MS = 30_000;
export const SCOTTISH_PAGE_RETRIES = 3;

class JustGoHttpError extends Error {
  constructor(readonly status: number) {
    super(`JustGo API returned ${status}`);
  }
}

export async function requestScottishPage(
  url: string,
  init: RequestInit,
  dependencies: {
    fetch: typeof fetch;
    sleep: (ms: number) => Promise<void>;
    timeout: (ms: number) => AbortSignal;
  } = {
    fetch: globalThis.fetch,
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    timeout: (ms) => AbortSignal.timeout(ms),
  },
): Promise<unknown> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await dependencies.fetch(url, {
        ...init,
        signal: dependencies.timeout(SCOTTISH_PAGE_TIMEOUT_MS),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new JustGoHttpError(response.status);
      }
      return await response.json();
    } catch (error) {
      const transient = error instanceof JustGoHttpError
        ? error.status === 429 || error.status >= 500
        : error instanceof Error && ["TimeoutError", "AbortError", "TypeError"].includes(error.name);
      if (!transient || attempt >= SCOTTISH_PAGE_RETRIES) throw error;
      console.warn(`[scottish-athletics-sync] Temporary page failure; retry ${attempt + 1}/${SCOTTISH_PAGE_RETRIES}`);
      await dependencies.sleep(1000 * 2 ** attempt);
    }
  }
}