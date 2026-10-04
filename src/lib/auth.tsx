import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  clearRecoveryLinkTokens,
  recoveryLinkRequested,
} from "./password-recovery-link";
import {
  hasConfirmedEmail,
  isAuthConnectionFailure,
  rememberedSessionMatches,
  REMEMBERED_VERIFICATION_KEY,
  sessionTokenHash,
  readPersistedAuthSession,
  type RememberedVerification,
} from "./auth-verification";

type AuthIssue = "unavailable" | "connection" | "unverified" | null;
const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY,
);
const project = import.meta.env.VITE_SUPABASE_URL || "";
const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  configured: boolean;
  offline: boolean;
  issue: AuthIssue;
  refreshProfile: () => Promise<void>;
  retrySession: () => Promise<void>;
  requireReverification: (expectedOwner?: string) => void;
  passwordRecovery: boolean;
  passwordRecoverySession: Session | null;
  finishPasswordRecovery: (expectedToken: string | null) => Promise<void>;
}>({
  user: null,
  loading: configured,
  configured,
  offline: false,
  issue: configured ? null : "unavailable",
  refreshProfile: async () => {},
  retrySession: async () => {},
  requireReverification: () => {},
  passwordRecovery: false,
  passwordRecoverySession: null,
  finishPasswordRecovery: async () => {},
});
const RECOVERY_PENDING = "sajag-password-recovery";
function recoveryPending() {
  try {
    return (
      recoveryLinkRequested() ||
      new URLSearchParams(window.location.search).get("recovery") === "1" ||
      sessionStorage.getItem(RECOVERY_PENDING) === "1"
    );
  } catch {
    return false;
  }
}
function rememberRecovery(pending: boolean) {
  try {
    if (pending) sessionStorage.setItem(RECOVERY_PENDING, "1");
    else {
      sessionStorage.removeItem(RECOVERY_PENDING);
      const url = new URL(window.location.href);
      url.searchParams.delete("recovery");
      window.history.replaceState(window.history.state, "", url);
    }
  } catch {
    /* The in-memory recovery gate still applies. */
  }
}
function forgetVerification() {
  try {
    localStorage.removeItem(REMEMBERED_VERIFICATION_KEY);
  } catch {
    /* Blocked storage cannot unlock the account gate. */
  }
}

// SDK persistence plus a token-bound receipt allow previously verified accounts
// to use offline lessons. The receipt is NOT an API credential; cloud requests
// independently verify the token. It contains no OTP or saved message text.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [offline, setOffline] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(recoveryPending);
  const [passwordRecoverySession, setPasswordRecoverySession] =
    useState<Session | null>(null);
  const recoveryCredential = useRef<Session | null>(null);
  const recoveryRef = useRef(passwordRecovery);
  const recoveryBaseline = useRef<string | null | undefined>(undefined);
  const [issue, setIssue] = useState<AuthIssue>(
    configured ? null : "unavailable",
  );
  const sessionRef = useRef<Session | null>(null);
  const epoch = useRef(0);
  const profileRequest = useRef(0);
  const mounted = useRef(false);
  const verifiedUser = useRef<User | null>(null);
  const publishUser = useCallback((next: User | null) => {
    verifiedUser.current = next;
    setUser(next);
  }, []);
  const restorePersistedOfflineSession = useCallback(
    async (revision: number) => {
      if (recoveryRef.current) return false;
      try {
        const snapshot = readPersistedAuthSession(localStorage, project);
        if (!snapshot) return false;
        const record: unknown = JSON.parse(
          localStorage.getItem(REMEMBERED_VERIFICATION_KEY) || "null",
        );
        const tokenHash = await sessionTokenHash(snapshot.access_token);
        if (!mounted.current || epoch.current !== revision) return false;
        if (!rememberedSessionMatches(record, snapshot, project, tokenHash))
          return false;
        // SDK initialization can wait for a failed refresh when an old access
        // token expired offline. This restores core access, never an API token.
        sessionRef.current = snapshot;
        publishUser({
          ...snapshot.user,
          email_confirmed_at: record.emailConfirmedAt,
        });
        setOffline(true);
        setIssue(null);
        setLoading(false);
        return true;
      } catch {
        return false;
      }
    },
    [publishUser],
  );
  const requireReverification = useCallback(
    (expectedOwner?: string) => {
      // A cancelled request from a former account must not lock the new account.
      if (expectedOwner && sessionRef.current?.user.id !== expectedOwner)
        return;
      epoch.current++;
      profileRequest.current++;
      forgetVerification();
      publishUser(null);
      setOffline(false);
      setLoading(false);
      setIssue("unverified");
    },
    [publishUser],
  );
  const refreshProfile = useCallback(async () => {
    if (recoveryRef.current) return;
    const snapshot = sessionRef.current;
    const previouslyVerified = verifiedUser.current;
    const revision = epoch.current;
    const request = ++profileRequest.current;
    if (!snapshot) return;
    const current = () =>
      mounted.current &&
      epoch.current === revision &&
      profileRequest.current === request;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const { getProfileUser } = await import("./supabase");
      if (!current()) return;
      const result = await Promise.race([
        getProfileUser(snapshot.access_token),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error("Session check timed out")),
            6000,
          );
        }),
      ]);
      if (!current()) return;
      if (result.error) throw result.error;
      if (
        !hasConfirmedEmail(result.data.user) ||
        result.data.user.id !== snapshot.user.id
      ) {
        forgetVerification();
        publishUser(null);
        setOffline(false);
        setIssue("unverified");
        return;
      }
      const serverUser = result.data.user;
      let tokenHash: string | null = null;
      try {
        tokenHash = await sessionTokenHash(snapshot.access_token);
      } catch {
        /* Verified online access need not depend on WebCrypto. */
      }
      if (!current()) return;
      if (tokenHash) {
        const record: RememberedVerification = {
          version: 1,
          project,
          owner: serverUser.id,
          email: serverUser.email!,
          emailConfirmedAt: serverUser.email_confirmed_at!,
          tokenHash,
          checkedAt: Date.now(),
        };
        try {
          localStorage.setItem(
            REMEMBERED_VERIFICATION_KEY,
            JSON.stringify(record),
          );
        } catch {
          /* Online verification still works without persistent storage. */
        }
      }
      publishUser(serverUser);
      setOffline(false);
      setIssue(null);
    } catch (error) {
      if (!current()) return;
      let remembered: RememberedVerification | null = null;
      if (isAuthConnectionFailure(error)) {
        try {
          const value: unknown = JSON.parse(
            localStorage.getItem(REMEMBERED_VERIFICATION_KEY) || "null",
          );
          const tokenHash = await sessionTokenHash(snapshot.access_token);
          if (rememberedSessionMatches(value, snapshot, project, tokenHash))
            remembered = value;
        } catch {
          /* Missing, corrupt or unavailable storage fails closed. */
        }
      } else forgetVerification();
      if (!current()) return;
      // Keep already verified in-memory identity through a same-owner refresh
      // outage; the new token gains no offline receipt until Auth verifies it.
      const retained =
        isAuthConnectionFailure(error) &&
        previouslyVerified?.id === snapshot.user.id &&
        previouslyVerified?.email === snapshot.user.email
          ? previouslyVerified
          : null;
      const offlineUser = remembered
        ? { ...snapshot.user, email_confirmed_at: remembered.emailConfirmedAt }
        : retained;
      publishUser(offlineUser);
      setOffline(Boolean(offlineUser));
      setIssue(
        offlineUser
          ? null
          : isAuthConnectionFailure(error)
            ? "connection"
            : "unverified",
      );
    } finally {
      clearTimeout(timeout);
      if (current()) setLoading(false);
    }
  }, [publishUser]);
  const retrySession = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    if (sessionRef.current) await refreshProfile();
    else {
      const revision = epoch.current;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const { supabase } = await import("./supabase");
        const result = await Promise.race([
          supabase?.auth.getSession(),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error("Session check timed out")),
              6000,
            );
          }),
        ]);
        if (!mounted.current || epoch.current !== revision) return;
        if (result?.data.session) {
          epoch.current++;
          sessionRef.current = result.data.session;
          await refreshProfile();
        } else setLoading(false);
      } catch {
        if (mounted.current) {
          setIssue("connection");
          setLoading(false);
        }
      } finally {
        clearTimeout(timeout);
      }
    }
  }, [refreshProfile]);
  const finishPasswordRecovery = useCallback(
    async (expectedToken: string | null) => {
      if ((sessionRef.current?.access_token || null) !== expectedToken)
        throw new Error("Account changed");
      const { supabase } = await import("./supabase");
      if (!supabase) throw new Error("Account unavailable");
      if ((sessionRef.current?.access_token || null) !== expectedToken)
        throw new Error("Account changed");
      // A recovery credential is not retained as an ordinary app login. Require
      // a fresh password sign-in after changing or cancelling recovery.
      const result = await supabase.auth.signOut({ scope: "local" });
      if (result.error) throw result.error;
      recoveryRef.current = false;
      clearRecoveryLinkTokens();
      rememberRecovery(false);
      setPasswordRecovery(false);
      recoveryCredential.current = null;
      setPasswordRecoverySession(null);
      forgetVerification();
      publishUser(null);
      setOffline(false);
      setLoading(false);
    },
    [publishUser],
  );
  useEffect(() => {
    mounted.current = true;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const timeout = setTimeout(() => {
      const revision = epoch.current;
      void restorePersistedOfflineSession(revision).then((restored) => {
        if (active && epoch.current === revision && !restored) {
          setIssue("connection");
          setLoading(false);
        }
      });
    }, 8000);
    void import("./supabase")
      .then(({ supabase }) => {
        if (!active) return;
        if (!supabase) {
          setLoading(false);
          setIssue("unavailable");
          clearTimeout(timeout);
          return;
        }
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          epoch.current++;
          profileRequest.current++;
          sessionRef.current = session;
          if (event === "PASSWORD_RECOVERY") {
            recoveryRef.current = true;
            rememberRecovery(true);
            setPasswordRecovery(true);
            recoveryBaseline.current = session?.user.id || null;
            recoveryCredential.current = session;
            setPasswordRecoverySession(session);
          } else if (recoveryRef.current) {
            if (recoveryBaseline.current === undefined)
              recoveryBaseline.current = session?.user.id || null;
            else if (
              event === "SIGNED_IN" &&
              session &&
              session.user.id !== recoveryBaseline.current
            ) {
              // A different account explicitly signed in while recovery was
              // pending. Discard the old reset UI; never sign out that account.
              recoveryRef.current = false;
              rememberRecovery(false);
              clearRecoveryLinkTokens();
              setPasswordRecovery(false);
              recoveryCredential.current = null;
              setPasswordRecoverySession(null);
            }
          }
          if (recoveryRef.current) {
            // An ordinary persisted session is never substituted for lost or
            // malformed reset-link credentials. Only a real SDK recovery event
            // establishes this in-memory provenance; reloading requires a new
            // link/code if an implicit link's memory credentials were lost.
            if (
              recoveryCredential.current &&
              session &&
              session.user.id === recoveryCredential.current.user.id
            ) {
              recoveryCredential.current = session;
              setPasswordRecoverySession(session);
            } else if (!session) {
              recoveryCredential.current = null;
              setPasswordRecoverySession(null);
            }
            // Recovery links must show the password form, never educational
            // routes or an offline receipt before recovery has completed.
            forgetVerification();
            publishUser(null);
            setOffline(false);
            setIssue(null);
            setLoading(false);
            clearTimeout(timeout);
            return;
          }
          const sameOwner =
            session &&
            verifiedUser.current?.id === session.user.id &&
            verifiedUser.current?.email === session.user.email;
          if (!sameOwner) publishUser(null);
          setIssue(null);
          clearTimeout(timeout);
          if (!session) {
            if (event === "INITIAL_SESSION") {
              const revision = epoch.current;
              queueMicrotask(() => {
                void restorePersistedOfflineSession(revision).then(
                  (restored) => {
                    if (!active || epoch.current !== revision || restored)
                      return;
                    forgetVerification();
                    setOffline(false);
                    setLoading(false);
                  },
                );
              });
              return;
            }
            forgetVerification();
            setOffline(false);
            setLoading(false);
            return;
          }
          setLoading(!sameOwner);
          // Do not await another SDK method while its auth callback holds a lock.
          queueMicrotask(() => {
            if (active) void refreshProfile();
          });
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {
        if (active) {
          setIssue("connection");
          setLoading(false);
        }
      });
    const online = () => {
      if (sessionRef.current) void refreshProfile();
    };
    window.addEventListener("online", online);
    return () => {
      active = false;
      mounted.current = false;
      epoch.current++;
      clearTimeout(timeout);
      unsubscribe?.();
      window.removeEventListener("online", online);
    };
  }, [refreshProfile, publishUser, restorePersistedOfflineSession]);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        configured,
        offline,
        issue,
        refreshProfile,
        retrySession,
        requireReverification,
        passwordRecovery,
        passwordRecoverySession,
        finishPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
