import type { Page } from "@playwright/test";
import type { User } from "@supabase/supabase-js";
import type { AccountNotebook } from "../../src/lib/account-notebook";
import { readFileSync } from "node:fs";
import { parse } from "dotenv";

type AccountMockOptions = {
  rejectCode?: boolean;
  rejectPassword?: boolean;
  rejectSignup?: boolean;
  rejectRecovery?: boolean;
  rejectPasswordUpdate?: boolean;
  verificationCode?: string;
  rejectName?: boolean;
  signedIn?: boolean;
  extraUsers?: User[];
};

export const FIXTURE_ACCOUNT_ID = "11111111-2222-4333-8444-555555555555";
export const TEST_NOTEBOOK_KEY = `sajag-notebook:${FIXTURE_ACCOUNT_ID}`;
export const FIXTURE_EMAIL = "asha@example.test";
export const FIXTURE_PASSWORD = "Sajag-test-password-8";
export const FIXTURE_EMAIL_CODE = "123456";
export const FIXTURE_SIGNUP_EMAIL = "new@example.test";
export const FIXTURE_RESET_PASSWORD = "Sajag-replacement-password-8";

function testAuthUrl() {
  let url = "";
  // Match the public URL baked into a production Vite build. Parse only this
  // public setting; do not mutate the environment, parse credentials or log it.
  for (const path of [
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ]) {
    try {
      const publicLine = readFileSync(path, "utf8")
        .split(/\r?\n/)
        .filter((line) => /^\s*(?:export\s+)?VITE_SUPABASE_URL\s*=/.test(line))
        .join("\n");
      const setting = parse(publicLine).VITE_SUPABASE_URL;
      if (setting !== undefined) url = setting;
    } catch {
      /* A missing optional Vite env file contributes no settings. */
    }
  }
  url = process.env.VITE_SUPABASE_URL ?? url;
  if (!url)
    throw new Error(
      "The E2E account fixture needs the web build's VITE_SUPABASE_URL.",
    );
  return new URL(url).origin;
}

function tokenSubject(authorization: string | undefined) {
  try {
    const accessToken = authorization?.split(" ")[1] || "";
    const claims = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64url").toString(),
    );
    return typeof claims.sub === "string" ? claims.sub : null;
  } catch {
    return null;
  }
}

export async function mockAccount(
  page: Page,
  options: AccountMockOptions = {},
) {
  const issuer = testAuthUrl();
  let user: User = {
    id: FIXTURE_ACCOUNT_ID,
    aud: "authenticated",
    role: "authenticated",
    email: FIXTURE_EMAIL,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-10-03T00:00:00.000Z",
    email_confirmed_at: "2026-10-03T00:00:00.000Z",
  };
  const secondUser: User = {
    ...user,
    id: "99999999-8888-4777-8666-555555555555",
    email: "second@example.test",
    user_metadata: { full_name: "Second user" },
  };
  const users = new Map(
    [user, secondUser, ...(options.extraUsers || [])].map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const passwords = new Map(
    [...users.values()].map((profile) => [profile.id, FIXTURE_PASSWORD]),
  );
  const pendingSignups = new Map<string, string>();
  const pendingRecoveries = new Set<string>();
  const recoveryTokens = new Set<string>();
  const emailFor = (body: Record<string, unknown>) =>
    typeof body.email === "string" ? body.email.toLowerCase().trim() : "";
  const userForEmail = (email: string) =>
    [...users.values()].find((profile) => profile.email === email);
  const calls: {
    path: string;
    method: string;
    body: Record<string, unknown>;
  }[] = [];
  const token = (owner: User, recovery = false) =>
    `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(
      JSON.stringify({
        sub: owner.id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "authenticated",
        aud: "authenticated",
        iss: `${issuer}/auth/v1`,
      }),
    ).toString(
      "base64url",
    )}.${recovery ? "recovery-test-signature" : "test-signature"}`;
  const refreshTokens = new Map<string, string>();
  const session = (owner = user, recovery = false) => {
    const refreshToken =
      owner.id === secondUser.id
        ? "second-mock-refresh"
        : owner.id === FIXTURE_ACCOUNT_ID
          ? "mock-refresh-session-only"
          : `mock-refresh-${owner.id}`;
    refreshTokens.set(refreshToken, owner.id);
    const accessToken = token(owner, recovery);
    if (recovery) recoveryTokens.add(accessToken);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: owner,
    };
  };
  // All Auth responses below are mocked. No helper sends a real password, OTP, email,
  // refresh request, profile update or notebook write to a Supabase project.
  await page.route(`${issuer}/auth/v1/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postData() ? request.postDataJSON() : {};
    calls.push({ path: url.pathname, method: request.method(), body });
    if (url.pathname.endsWith("/settings"))
      return route.fulfill({
        json: {
          mailer_autoconfirm: false,
          external: { email: true },
          disable_signup: false,
        },
      });
    if (url.pathname.endsWith("/signup")) {
      const email = emailFor(body);
      if (options.rejectSignup)
        return route.fulfill({ status: 503, json: { msg: "Unavailable" } });
      if (userForEmail(email)?.email_confirmed_at)
        return route.fulfill({
          status: 422,
          json: { code: "user_already_exists", msg: "Account already exists" },
        });
      if (
        !email ||
        typeof body.password !== "string" ||
        body.password.length < 8
      )
        return route.fulfill({
          status: 422,
          json: {
            code: "weak_password",
            msg: "Password needs eight characters",
          },
        });
      const profile: User = {
        ...user,
        id: `22222222-3333-4444-8555-${String(pendingSignups.size + 1).padStart(12, "0")}`,
        email,
        email_confirmed_at: undefined,
        confirmed_at: undefined,
        user_metadata:
          body.data && typeof body.data === "object" ? { ...body.data } : {},
      };
      users.set(profile.id, profile);
      passwords.set(profile.id, body.password);
      pendingSignups.set(email, profile.id);
      // Supabase's email-confirmation response deliberately has no session.
      return route.fulfill({ json: { user: profile, session: null } });
    }
    if (url.pathname.endsWith("/resend")) {
      if (body.type !== "signup" || !pendingSignups.has(emailFor(body)))
        return route.fulfill({
          status: 422,
          json: { msg: "No pending signup" },
        });
      return route.fulfill({ json: {} });
    }
    if (url.pathname.endsWith("/recover")) {
      if (options.rejectRecovery)
        return route.fulfill({ status: 503, json: { msg: "Unavailable" } });
      const email = emailFor(body);
      // Recovery's public response does not disclose whether an email exists.
      if (userForEmail(email)?.email_confirmed_at) pendingRecoveries.add(email);
      return route.fulfill({ json: {} });
    }
    if (url.pathname.endsWith("/verify")) {
      const email = emailFor(body);
      const expectedCode = options.verificationCode ?? FIXTURE_EMAIL_CODE;
      const signupId = pendingSignups.get(email);
      const signup = signupId ? users.get(signupId) : undefined;
      const recovery = userForEmail(email);
      if (
        options.rejectCode ||
        body.token !== expectedCode ||
        !/^\d{6,10}$/.test(expectedCode) ||
        (body.type === "signup" || body.type === "email"
          ? !signup
          : body.type === "recovery"
            ? !pendingRecoveries.has(email) || !recovery
            : true)
      )
        return route.fulfill({
          status: 403,
          json: { code: "otp_expired", msg: "Token invalid or expired" },
        });
      if ((body.type === "signup" || body.type === "email") && signup) {
        const confirmed = {
          ...signup,
          email_confirmed_at: "2026-10-04T00:00:00.000Z",
          confirmed_at: "2026-10-04T00:00:00.000Z",
        };
        users.set(confirmed.id, confirmed);
        pendingSignups.delete(email);
        return route.fulfill({ json: session(confirmed) });
      }
      pendingRecoveries.delete(email);
      return route.fulfill({ json: session(recovery!, true) });
    }
    if (url.pathname.endsWith("/user")) {
      const owner = tokenSubject(request.headers().authorization);
      const profile = owner ? users.get(owner) : undefined;
      if (!profile)
        return route.fulfill({
          status: 403,
          json: {
            error_code: "session_not_found",
            msg: "Unknown mocked session",
          },
        });
      if (request.method() === "PUT") {
        if (body.password !== undefined) {
          const accessToken = request.headers().authorization?.split(" ")[1];
          if (
            !accessToken ||
            !recoveryTokens.has(accessToken) ||
            typeof body.password !== "string" ||
            body.password.length < 8
          )
            return route.fulfill({
              status: 403,
              json: { msg: "A verified recovery session is required" },
            });
          if (options.rejectPasswordUpdate)
            return route.fulfill({ status: 503, json: { msg: "Unavailable" } });
          passwords.set(profile.id, body.password);
          return route.fulfill({ json: profile });
        }
        if (options.rejectName)
          return route.fulfill({ status: 503, json: { msg: "Unavailable" } });
        const updated = { ...profile, user_metadata: { ...(body.data || {}) } };
        users.set(updated.id, updated);
        if (updated.id === user.id) user = updated;
        return route.fulfill({ json: updated });
      }
      return route.fulfill({ json: profile });
    }
    if (url.pathname.endsWith("/logout")) {
      const accessToken = request.headers().authorization?.split(" ")[1];
      if (accessToken) recoveryTokens.delete(accessToken);
      return route.fulfill({ status: 204 });
    }
    if (url.pathname.endsWith("/token")) {
      if (url.searchParams.get("grant_type") === "password") {
        const profile = userForEmail(emailFor(body));
        if (
          options.rejectPassword ||
          !profile ||
          passwords.get(profile.id) !== body.password
        )
          return route.fulfill({
            status: 400,
            json: {
              code: "invalid_credentials",
              msg: "Invalid login credentials",
            },
          });
        if (!profile.email_confirmed_at)
          return route.fulfill({
            status: 400,
            json: { code: "email_not_confirmed", msg: "Email not confirmed" },
          });
        return route.fulfill({ json: session(profile) });
      }
      const ownerId =
        typeof body.refresh_token === "string"
          ? refreshTokens.get(body.refresh_token)
          : undefined;
      const owner = ownerId ? users.get(ownerId) : undefined;
      if (!owner)
        return route.fulfill({
          status: 403,
          json: {
            error_code: "refresh_token_not_found",
            msg: "Unknown mocked refresh token",
          },
        });
      return route.fulfill({ json: session(owner) });
    }
    return route.fulfill({
      status: 400,
      json: { msg: "Unexpected test route" },
    });
  });
  // No test sends cloud notebook data to a real account.
  await page.route(`${issuer}/rest/v1/**`, async (route) => {
    const request = route.request();
    const body = request.postData() ? request.postDataJSON() : {};
    calls.push({
      path: new URL(request.url()).pathname,
      method: request.method(),
      body,
    });
    return route.fulfill({ json: request.method() === "GET" ? [] : null });
  });
  if (options.signedIn) {
    const key = `sb-${new URL(issuer).hostname.split(".")[0]}-auth-token`;
    await page.addInitScript(
      ({ key, seeded }) => {
        const marker = `sajag-e2e-seeded:${key}`;
        // Seed once, so a test that signs out or changes account cannot be silently
        // signed in again by a later navigation or reload.
        if (sessionStorage.getItem(marker)) return;
        localStorage.setItem(key, JSON.stringify(seeded));
        sessionStorage.setItem(marker, "1");
      },
      { key, seeded: session() },
    );
  }
  return { calls };
}

// General feature tests authenticate through the password form. Every SDK
// request is intercepted first; these helpers never access a real account.
export async function signInForApp(page: Page) {
  const fixture = await mockAccount(page);
  await passwordSignIn(page);
  return fixture;
}

export const seedMockAccount = signInForApp;

export async function readTestNotebook(page: Page): Promise<AccountNotebook> {
  return page.evaluate(() => {
    try {
      const key = Object.keys(localStorage).find(
        (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
      );
      const owner = key
        ? JSON.parse(localStorage.getItem(key) || "null")?.user?.id
        : null;
      if (!owner || typeof owner !== "string")
        return { saved: [], completed: [] };
      const value = JSON.parse(
        localStorage.getItem(`sajag-notebook:${encodeURIComponent(owner)}`) ||
          "null",
      );
      return {
        saved: Array.isArray(value?.saved) ? value.saved : [],
        completed: Array.isArray(value?.completed) ? value.completed : [],
      };
    } catch {
      return { saved: [], completed: [] };
    }
  });
}

export async function passwordSignIn(
  page: Page,
  password = FIXTURE_PASSWORD,
  email = FIXTURE_EMAIL,
) {
  await page.goto("/settings");
  await submitPasswordSignIn(page, password, email);
  // A click finishes before SDK persistence and the guard's getUser check.
  // Wait for the verified Settings view before callers navigate elsewhere.
  await page
    .locator(".main-content .account-person")
    .waitFor({ state: "visible" });
}

export async function submitPasswordSignIn(
  page: Page,
  password = FIXTURE_PASSWORD,
  email = FIXTURE_EMAIL,
) {
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator('form:has(#password) button[type="submit"]').click();
}

// Compatibility for existing feature callers. The old second argument is no
// longer an OTP and is ignored; new credential tests use passwordSignIn instead.
export async function codeSignIn(page: Page, _legacyCode?: string) {
  await passwordSignIn(page);
}

export async function beginSignUp(
  page: Page,
  email = FIXTURE_SIGNUP_EMAIL,
  password = FIXTURE_PASSWORD,
) {
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("#confirm-password").fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
}

export async function signUpAndConfirm(
  page: Page,
  email = FIXTURE_SIGNUP_EMAIL,
  password = FIXTURE_PASSWORD,
  code = FIXTURE_EMAIL_CODE,
) {
  await beginSignUp(page, email, password);
  await page.locator("#email-code").fill(code);
  await page
    .getByRole("button", { name: "Verify email and sign in", exact: true })
    .click();
  await page.locator(".main-content").waitFor({ state: "visible" });
}

export async function beginPasswordReset(page: Page, email = FIXTURE_EMAIL) {
  await page
    .getByRole("button", { name: "Set or reset password", exact: true })
    .click();
  await page.locator("#email").fill(email);
  await page
    .getByRole("button", { name: "Send reset code", exact: true })
    .click();
}

export async function resetPassword(
  page: Page,
  password = FIXTURE_RESET_PASSWORD,
  email = FIXTURE_EMAIL,
  code = FIXTURE_EMAIL_CODE,
) {
  await beginPasswordReset(page, email);
  await page.locator("#email-code").fill(code);
  await page.locator("#new-password").fill(password);
  await page.locator("#confirm-new-password").fill(password);
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  // Recovery returns to password sign-in. It must not unlock the app.
  await page.locator("#password").waitFor({ state: "visible" });
}
