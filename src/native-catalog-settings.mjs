// Polling cadence is independent of account-cache freshness. Keep the shipped
// five-minute cadence unless the operator explicitly chooses a slower one.
export const DEFAULT_NATIVE_CATALOG_POLL_INTERVAL_MS = 5 * 60_000;
export const MAX_NATIVE_CATALOG_POLL_INTERVAL_MS = 2 ** 31 - 1;
const POLL_INTERVAL_ENV = "CODEX_ROUTER_NATIVE_CATALOG_POLL_INTERVAL_MS";

export function nativeCatalogPollIntervalMs(environment = process.env) {
  const value = String(environment[POLL_INTERVAL_ENV] ?? "").trim();
  if (!/^\d+$/.test(value)) return DEFAULT_NATIVE_CATALOG_POLL_INTERVAL_MS;
  const milliseconds = Number(value);
  // Node turns an overflowing interval into 1 ms; reject it rather than
  // accidentally hammering the account endpoint or drift comparison.
  return Number.isSafeInteger(milliseconds) &&
    milliseconds >= DEFAULT_NATIVE_CATALOG_POLL_INTERVAL_MS &&
    milliseconds <= MAX_NATIVE_CATALOG_POLL_INTERVAL_MS
    ? milliseconds
    : DEFAULT_NATIVE_CATALOG_POLL_INTERVAL_MS;
}

const NATIVE_BASE_URL_ENV = "CODEX_NATIVE_BASE_URL";

// The router reads CODEX_NATIVE_BASE_URL to reach native GPT through another
// local proxy. The service launchers are regenerated from a fixed variable
// list, so an override that is not carried here vanished on every reinstall
// and native turns silently went straight to chatgpt.com. Only a plain
// http(s) URL is persisted: the value lands in a CMD `set` line and a plist,
// where whitespace or control characters could break or extend the file.
function nativeBaseUrl(environment) {
  const value = String(environment[NATIVE_BASE_URL_ENV] ?? "").trim();
  if (!value || /[\s\x00-\x1f\x7f"%]/.test(value)) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : undefined;
  } catch {
    return undefined;
  }
}

export function serviceNativeCatalogEnvironment(environment = process.env) {
  const result = {};
  if (Object.hasOwn(environment, POLL_INTERVAL_ENV)) {
    result[POLL_INTERVAL_ENV] = String(nativeCatalogPollIntervalMs(environment));
  }
  const baseUrl = nativeBaseUrl(environment);
  if (baseUrl) result[NATIVE_BASE_URL_ENV] = baseUrl;
  return result;
}
