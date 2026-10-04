// Implicit recovery links must not be consumed by the ordinary PKCE client.
// Keep credentials in memory and scrub auth fragments before SDK initialization.
export type RecoveryLinkTokens = {
  access_token: string;
  refresh_token: string;
};
export function parseRecoveryLink(
  hash: string,
  search = "",
): RecoveryLinkTokens | null {
  const values = new URLSearchParams(hash.replace(/^#/, ""));
  if (
    new URLSearchParams(search).has("code") ||
    values.getAll("type").length !== 1 ||
    values.get("type") !== "recovery"
  )
    return null;
  if (
    values.getAll("access_token").length !== 1 ||
    values.getAll("refresh_token").length !== 1
  )
    return null;
  const access_token = values.get("access_token");
  const refresh_token = values.get("refresh_token");
  if (
    !access_token ||
    !refresh_token ||
    access_token.length > 16384 ||
    refresh_token.length > 16384
  )
    return null;
  return { access_token, refresh_token };
}
let pending: RecoveryLinkTokens | null = null;
let requested = false;
if (typeof window !== "undefined") {
  try {
    const url = new URL(window.location.href);
    const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
    requested =
      url.searchParams.get("recovery") === "1" ||
      fragment.getAll("type").includes("recovery");
    const authFragment = [
      "access_token",
      "refresh_token",
      "error",
      "error_code",
      "error_description",
    ].some((key) => fragment.has(key));
    pending = parseRecoveryLink(url.hash, url.search);
    const errorFragment =
      fragment.has("error") || fragment.has("error_description");
    if ((requested && (authFragment || url.hash)) || errorFragment) {
      // Even expired or malformed credentials must not remain in URL/history.
      url.hash = "";
      if (requested) {
        url.searchParams.set("recovery", "1");
        if (fragment.has("access_token") || fragment.has("refresh_token"))
          url.searchParams.delete("code");
      }
      window.history.replaceState(window.history.state, "", url);
    }
  } catch {
    pending = null;
    requested = true;
  }
  // A reset link pasted into an already-open tab changes only the fragment and
  // does not reload. Reload so it is captured, scrubbed and gated like a fresh visit.
  window.addEventListener("hashchange", () => {
    const next = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (
      [
        "type",
        "access_token",
        "refresh_token",
        "error",
        "error_description",
      ].some((key) => next.has(key))
    )
      window.location.reload();
  });
}
export const getRecoveryLinkTokens = () => pending;
export const recoveryLinkRequested = () => requested;
export function clearRecoveryLinkTokens() {
  pending = null;
  requested = false;
}
