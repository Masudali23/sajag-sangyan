import type { Session, User } from "@supabase/supabase-js";

export const REMEMBERED_VERIFICATION_KEY = "sajag-verified-session-v1";
const OFFLINE_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

export type RememberedVerification = {
  version: 1;
  project: string;
  owner: string;
  email: string;
  emailConfirmedAt: string;
  tokenHash: string;
  checkedAt: number;
};

// This predicate applies only to an Auth-server response or a matching receipt
// previously created from one. User-editable metadata is never proof.
export function hasConfirmedEmail(user: User | null): user is User {
  return Boolean(
    user &&
    typeof user.id === "string" &&
    user.id &&
    typeof user.email === "string" &&
    user.email &&
    typeof user.email_confirmed_at === "string" &&
    Number.isFinite(Date.parse(user.email_confirmed_at)) &&
    user.is_anonymous !== true,
  );
}

export async function sessionTokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function readPersistedAuthSession(
  storage: Pick<Storage, "getItem">,
  project: string,
): Session | null {
  try {
    // Matches Supabase's configured default storage key. These values supply
    // only a candidate: the exact token must match a prior verified receipt.
    const reference = new URL(project).hostname.split(".")[0];
    const value = JSON.parse(
      storage.getItem(`sb-${reference}-auth-token`) || "null",
    );
    if (
      value &&
      typeof value.access_token === "string" &&
      value.access_token &&
      typeof value.user?.id === "string" &&
      typeof value.user?.email === "string"
    )
      return value as Session;
  } catch {
    /* No persisted candidate is a signed-out account. */
  }
  return null;
}

export function rememberedSessionMatches(
  record: unknown,
  session: Session,
  project: string,
  tokenHash: string,
  now = Date.now(),
): record is RememberedVerification {
  if (!record || typeof record !== "object") return false;
  const value = record as Partial<RememberedVerification>;
  return Boolean(
    value.version === 1 &&
    value.project === project &&
    value.owner === session.user.id &&
    value.email === session.user.email &&
    typeof value.emailConfirmedAt === "string" &&
    Number.isFinite(Date.parse(value.emailConfirmedAt)) &&
    /^[a-f0-9]{64}$/.test(tokenHash) &&
    value.tokenHash === tokenHash &&
    session.user.is_anonymous !== true &&
    typeof value.checkedAt === "number" &&
    value.checkedAt <= now &&
    now - value.checkedAt <= OFFLINE_REMEMBER_MS,
  );
}

export function isAuthConnectionFailure(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const status = (error as { status?: unknown }).status;
  return (
    status === undefined ||
    status === 0 ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
}
