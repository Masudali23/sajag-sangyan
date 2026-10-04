import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { hasConfirmedEmail } from "./auth-verification";
import { validEmailCode } from "./profile";

type Auth = SupabaseClient["auth"];
export type PasswordAuthClient = {
  auth: Pick<Auth, "signUp" | "signInWithPassword" | "resend">;
};
export type PasswordRecoveryClient = {
  auth: Pick<
    Auth,
    | "resetPasswordForEmail"
    | "verifyOtp"
    | "setSession"
    | "getUser"
    | "updateUser"
    | "dispose"
  >;
};
// The factory must create a fresh client with nonpersistent, uniquely keyed
// memory storage, no auto-refresh and no URL detection. Never return the main
// AuthProvider client: recovery verification itself creates an SDK session.
export type PasswordRecoveryFactory = () => PasswordRecoveryClient;
export type PasswordValidationError = "too-short" | "confirmation-mismatch";
export type PasswordAuthErrorCode =
  | PasswordValidationError
  | "invalid-email"
  | "empty-password"
  | "invalid-code"
  | "unverified-session"
  | "recovery-owner-mismatch"
  | "recovery-cancelled";

export class PasswordAuthError extends Error {
  constructor(public readonly code: PasswordAuthErrorCode) {
    // Neither credentials nor server response bodies belong in local errors.
    super(code);
    this.name = "PasswordAuthError";
  }
}

export function validatePassword(
  password: string,
  confirmation?: string,
): PasswordValidationError | null {
  if (password.length < 8) return "too-short";
  if (confirmation !== undefined && confirmation !== password)
    return "confirmation-mismatch";
  return null;
}

function requirePassword(password: string, confirmation?: string) {
  const error = validatePassword(password, confirmation);
  if (error) throw new PasswordAuthError(error);
}

function emailAddress(email: string): string {
  const address = email.trim();
  if (!address || address.length > 254 || !/^[^\s@]+@[^\s@]+$/.test(address))
    throw new PasswordAuthError("invalid-email");
  return address;
}

function sameEmail(a: string | undefined, b: string): boolean {
  return a?.toLowerCase() === b.toLowerCase();
}

export type PasswordSignInResult = {
  status: "signed-in";
  session: Session;
  user: User;
};
export type PasswordSignUpResult =
  PasswordSignInResult | { status: "confirmation-required" };
export type PasswordRecoveryResult = {
  status: "password-updated";
  requiresPasswordSignIn: true;
};

function confirmedSession(
  data: { session: Session | null; user: User | null },
  email: string,
): PasswordSignInResult {
  if (
    !data.session?.access_token ||
    !hasConfirmedEmail(data.user) ||
    !hasConfirmedEmail(data.session.user) ||
    data.session.user.id !== data.user.id ||
    !sameEmail(data.user.email, email) ||
    !sameEmail(data.session.user.email, email)
  )
    throw new PasswordAuthError("unverified-session");
  return { status: "signed-in", session: data.session, user: data.user };
}

export async function signUpWithPassword(
  client: PasswordAuthClient,
  email: string,
  password: string,
  confirmation: string,
  emailRedirectTo?: string,
): Promise<PasswordSignUpResult> {
  requirePassword(password, confirmation);
  const address = emailAddress(email);
  const { data, error } = await client.auth.signUp({
    email: address,
    password,
    ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
  });
  if (error) throw error;
  // Supabase can intentionally obscure an existing signup. A response without
  // a session is only a request to check email, never evidence of a login.
  if (!data.session) return { status: "confirmation-required" };
  return confirmedSession(data, address);
}

export async function signInWithPassword(
  client: PasswordAuthClient,
  email: string,
  password: string,
): Promise<PasswordSignInResult> {
  // Creation/reset policy must not prevent a legitimate older account from
  // signing in with the password its provider already accepted.
  if (!password) throw new PasswordAuthError("empty-password");
  const address = emailAddress(email);
  const { data, error } = await client.auth.signInWithPassword({
    email: address,
    password,
  });
  if (error) throw error;
  return confirmedSession(data, address);
}

export async function resendSignup(
  client: PasswordAuthClient,
  email: string,
  emailRedirectTo?: string,
): Promise<void> {
  const { error } = await client.auth.resend({
    type: "signup",
    email: emailAddress(email),
    ...(emailRedirectTo ? { options: { emailRedirectTo } } : {}),
  });
  if (error) throw error;
}

async function isolatedRecovery<T>(
  factory: PasswordRecoveryFactory,
  operation: (auth: PasswordRecoveryClient["auth"]) => Promise<T>,
): Promise<T> {
  const client = factory();
  try {
    return await operation(client.auth);
  } finally {
    // All operations are awaited before disposal. dispose does not abort an
    // in-flight request, and unique memory storage is essential for isolation.
    await client.auth.dispose();
  }
}

export async function sendPasswordRecovery(
  factory: PasswordRecoveryFactory,
  email: string,
  redirectTo?: string,
): Promise<void> {
  const address = emailAddress(email);
  await isolatedRecovery(factory, async (auth) => {
    const { error } = await auth.resetPasswordForEmail(
      address,
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) throw error;
  });
}

async function updateRecoveredPassword(
  auth: PasswordRecoveryClient["auth"],
  owner: User,
  password: string,
  stillCurrent: () => boolean,
): Promise<PasswordRecoveryResult> {
  if (!stillCurrent()) throw new PasswordAuthError("recovery-cancelled");
  const { data, error } = await auth.updateUser({ password });
  if (error) throw error;
  if (
    !hasConfirmedEmail(data.user) ||
    data.user.id !== owner.id ||
    !sameEmail(data.user.email, owner.email!)
  )
    throw new PasswordAuthError("recovery-owner-mismatch");
  if (!stillCurrent()) throw new PasswordAuthError("recovery-cancelled");
  // Never return recovery tokens/session to the main AuthProvider. The next
  // authenticated action is a fresh, explicit password sign-in.
  return { status: "password-updated", requiresPasswordSignIn: true };
}

export async function completePasswordRecovery(
  factory: PasswordRecoveryFactory,
  email: string,
  code: string,
  password: string,
  confirmation: string,
  stillCurrent: () => boolean = () => true,
): Promise<PasswordRecoveryResult> {
  requirePassword(password, confirmation);
  const address = emailAddress(email);
  if (!validEmailCode(code)) throw new PasswordAuthError("invalid-code");
  if (!stillCurrent()) throw new PasswordAuthError("recovery-cancelled");
  return isolatedRecovery(factory, async (auth) => {
    const { data, error } = await auth.verifyOtp({
      email: address,
      token: code.trim(),
      type: "recovery",
    });
    if (error) throw error;
    const verified = confirmedSession(data, address);
    return updateRecoveredPassword(auth, verified.user, password, stillCurrent);
  });
}

export async function completePasswordRecoverySession(
  factory: PasswordRecoveryFactory,
  session: Session,
  password: string,
  confirmation: string,
  stillCurrent: () => boolean = () => true,
): Promise<PasswordRecoveryResult> {
  requirePassword(password, confirmation);
  const address = emailAddress(session.user.email || "");
  if (!session.access_token || !session.refresh_token || !session.user.id)
    throw new PasswordAuthError("unverified-session");
  if (!stillCurrent()) throw new PasswordAuthError("recovery-cancelled");
  return isolatedRecovery(factory, async (auth) => {
    const installed = await auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (installed.error) throw installed.error;
    const verified = confirmedSession(installed.data, address);
    if (verified.user.id !== session.user.id)
      throw new PasswordAuthError("recovery-owner-mismatch");
    if (!stillCurrent()) throw new PasswordAuthError("recovery-cancelled");
    const profile = await auth.getUser(verified.session.access_token);
    if (profile.error) throw profile.error;
    if (
      !hasConfirmedEmail(profile.data.user) ||
      profile.data.user.id !== session.user.id ||
      !sameEmail(profile.data.user.email, address)
    )
      throw new PasswordAuthError("recovery-owner-mismatch");
    return updateRecoveredPassword(
      auth,
      profile.data.user,
      password,
      stillCurrent,
    );
  });
}
