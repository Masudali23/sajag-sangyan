import { createClient } from "@supabase/supabase-js";

export type SessionVerification =
  | { status: "verified"; userId: string }
  | { status: "invalid" }
  | { status: "unavailable" };

// Explicit dependency injection keeps provider tests isolated. The default
// implementation always checks Supabase Auth; NODE_ENV never bypasses sign-in.
export type SessionAuth = {
  configured: boolean;
  verify: (accessToken: string) => Promise<SessionVerification>;
};

export const AUTH_TIMEOUT_MS = 5000;

function configuration() {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ""
  ).trim();
  const key = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ""
  ).trim();
  if (!url || !key) return null;
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
    if (
      (parsed.protocol !== "https:" &&
        !(
          process.env.NODE_ENV !== "production" &&
          local &&
          parsed.protocol === "http:"
        )) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash ||
      (parsed.pathname !== "/" && parsed.pathname !== "")
    )
      return null;
    return { url: parsed.origin, key };
  } catch {
    return null;
  }
}

// Decode only *after* getUser has authenticated this exact token. These extra
// checks bind the returned user to the token and reject a stale service response;
// decoding by itself is never an authorization decision.
function matchesVerifiedUser(token: string, userId: string, issuer: string) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const claims = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    return (
      claims.sub === userId &&
      claims.iss === `${issuer}/auth/v1` &&
      claims.role === "authenticated" &&
      (claims.aud === "authenticated" ||
        (Array.isArray(claims.aud) && claims.aud.includes("authenticated"))) &&
      Number.isSafeInteger(claims.exp) &&
      claims.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function createSessionAuth(): SessionAuth {
  const config = configuration();
  if (!config)
    return {
      configured: false,
      verify: async () => ({ status: "unavailable" }),
    };
  const client = createClient(config.url, config.key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) =>
        fetch(input, { ...init, signal: AbortSignal.timeout(AUTH_TIMEOUT_MS) }),
    },
  });
  return {
    configured: true,
    async verify(accessToken) {
      try {
        // This network lookup uses the public project key and the caller's token.
        // No service-role key, decoded email or stored client profile is trusted.
        const { data, error } = await client.auth.getUser(accessToken);
        if (error) {
          return {
            status:
              error.status === 429 || !error.status || error.status >= 500
                ? "unavailable"
                : "invalid",
          };
        }
        const user = data.user;
        if (
          !user ||
          !user.id ||
          !user.email?.trim() ||
          !user.email_confirmed_at ||
          user.is_anonymous ||
          user.role !== "authenticated" ||
          !matchesVerifiedUser(accessToken, user.id, config.url)
        )
          return { status: "invalid" };
        return { status: "verified", userId: user.id };
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}
