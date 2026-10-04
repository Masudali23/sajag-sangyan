import { Capacitor } from "@capacitor/core";

// Native bundles run at https://localhost; web builds keep same-origin requests.
// A deployment-specific VITE_API_BASE_URL remains an explicit build override.
export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (Capacitor.isNativePlatform() ? "https://sajag-ashen.vercel.app" : "")
).replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function isApiAuthError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError &&
    ["AUTH_REQUIRED", "SESSION_INVALID", "AUTH_UNAVAILABLE"].includes(
      error.code || "",
    )
  );
}

export async function api<T>(path: string, body?: unknown): Promise<T> {
  // Never forward account tokens to caller-supplied URLs or a public bootstrap.
  if (!/^[a-z][a-z0-9-]*$/.test(path)) throw new Error("Invalid API endpoint");
  const publicEndpoint = ["health", "auth"].includes(path);
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const abort = new AbortController();
  let accountChanged = false;
  let owner: string | undefined;
  let observedOwner: string | null | undefined;
  let unsubscribe: (() => void) | undefined;
  const ended = () =>
    new ApiError(
      "Your session has ended. Sign in again with your email code.",
      401,
      "SESSION_INVALID",
    );
  try {
    if (!publicEndpoint) {
      const { supabase } = await import("./supabase");
      if (!supabase)
        throw new ApiError(
          "Sign-in is temporarily unavailable. Please try again later.",
          503,
          "AUTH_UNAVAILABLE",
        );
      const { data: subscription } = supabase.auth.onAuthStateChange(
        (event, session) => {
          observedOwner = session?.user.id ?? null;
          if (event === "SIGNED_OUT" || (owner && session?.user.id !== owner)) {
            accountChanged = true;
            abort.abort();
          }
        },
      );
      unsubscribe = () => subscription.subscription.unsubscribe();
      const { data, error } = await supabase.auth.getSession();
      if (accountChanged) throw ended();
      if (error) {
        if ([400, 401, 403].includes(error.status || 0)) throw ended();
        throw new ApiError(
          "Your sign-in could not be checked. Please try again when connected.",
          503,
          "AUTH_UNAVAILABLE",
        );
      }
      const session = data.session;
      if (!session?.access_token || !session.user.id)
        throw new ApiError(
          "Sign in with your email code before using Sajag.",
          401,
          "AUTH_REQUIRED",
        );
      if (
        !session.expires_at ||
        session.expires_at <= Math.floor(Date.now() / 1000)
      )
        throw ended();
      owner = session.user.id;
      if (observedOwner !== undefined && observedOwner !== owner) throw ended();
      // getSession supplies only the token. The server validates it with
      // Supabase Auth on every request, without trusting this local user object.
      headers.Authorization = `Bearer ${session.access_token}`;
    }
    const response = await fetch(`${API_BASE}/api/${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Protected analysis first checks the current session (up to 5 seconds),
      // then keeps the provider's existing shared 14-second review deadline.
      signal: AbortSignal.any([
        abort.signal,
        AbortSignal.timeout(path === "analyze" ? 22000 : 16000),
      ]),
    });
    if (accountChanged) throw ended();
    if (!response.ok) {
      const detail: unknown = await response.json().catch(() => null);
      const error = detail as { error?: unknown; code?: unknown } | null;
      throw new ApiError(
        typeof error?.error === "string"
          ? error.error
          : `Request failed (${response.status})`,
        response.status,
        typeof error?.code === "string" ? error.code : undefined,
      );
    }
    const value = (await response.json()) as T;
    if (accountChanged) throw ended();
    return value;
  } catch (error) {
    if (accountChanged) throw ended();
    throw error;
  } finally {
    unsubscribe?.();
  }
}
