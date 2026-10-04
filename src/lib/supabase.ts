import { createClient } from "@supabase/supabase-js";
import { recoveryLinkRequested } from "./password-recovery-link";
import { requireSignupConfirmation } from "./signup-settings";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: !recoveryLinkRequested(),
          flowType: "pkce",
        },
      })
    : null;

function profileClient() {
  if (!url || !key) throw new Error("Account unavailable");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `sajag-profile-${crypto.randomUUID()}`,
    },
  });
}

// Password recovery verifies its email code in memory. It must not install a
// recovery session into the app or its remembered offline account.
export const createPasswordRecoveryClient = profileClient;

// A server configuration change must not silently turn first-time signup into
// an unverified login. This read-only public endpoint sends no account data.
export async function requireEmailConfirmation() {
  if (!url || !key) throw new Error("Account unavailable");
  await requireSignupConfirmation(url, key);
}

// Even getUser(token) can clear an SDK client's session when an old token has
// been revoked. Keep that failure isolated from whichever account is current.
export async function getProfileUser(accessToken: string) {
  const isolated = profileClient();
  try {
    return await isolated.auth.getUser(accessToken);
  } finally {
    await isolated.auth.dispose();
  }
}

// A profile update must never restore a captured session after another tab has
// signed out or changed accounts. auth.updateUser normally persists its session;
// isolate that SDK side effect in memory, then re-read the active user's profile.
export async function updateProfileName(
  fullName: string | null,
  owner: string,
  stillCurrent: () => boolean,
) {
  if (!supabase || !url || !key) throw new Error("Account unavailable");
  const { data, error } = await supabase.auth.getSession();
  const session = data.session;
  if (error || !session || session.user.id !== owner || !stillCurrent())
    throw new Error("Account changed");
  const isolated = profileClient();
  try {
    const installed = await isolated.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (installed.error || installed.data.user?.id !== owner || !stillCurrent())
      throw installed.error || new Error("Account changed");
    const updated = await isolated.auth.updateUser({
      data: { full_name: fullName },
    });
    if (updated.error) throw updated.error;
  } finally {
    await isolated.auth.dispose();
  }
}
