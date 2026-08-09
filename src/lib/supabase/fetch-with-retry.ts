/**
 * Wraps `fetch` with a couple of retries for transient network-level
 * failures (DNS hiccups, TLS handshake blips, connection resets) — the
 * kind of thing that surfaces as a bare "fetch failed" with no HTTP
 * response at all. Deliberately does NOT retry once a response comes
 * back, even an error one (4xx/5xx) — those are real answers, not
 * transient failures, and retrying them could e.g. double-submit a
 * signup. Used for every Supabase client (auth + REST) in this app.
 */
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

export const fetchWithRetry: typeof fetch = async (input, init) => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetch(input, init);
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw lastError;
};
