import { test, expect, type Page } from "@playwright/test";
import {
  mockAccount,
  passwordSignIn,
  submitPasswordSignIn,
  beginSignUp,
  beginPasswordReset,
  FIXTURE_EMAIL,
  FIXTURE_PASSWORD,
  FIXTURE_EMAIL_CODE,
  FIXTURE_SIGNUP_EMAIL,
  FIXTURE_RESET_PASSWORD,
} from "./auth-fixture";
import { analyzeClaim } from "../../shared/engine";

// The no-config case uses a separate bundle built with both VITE_SUPABASE_*
// settings blank and E2E_SUPABASE_UNCONFIGURED=1. All other auth calls are mocked.
const noConfig = process.env.E2E_SUPABASE_UNCONFIGURED === "1";
async function signInOnCurrentPage(page: Page, email = FIXTURE_EMAIL) {
  await submitPasswordSignIn(page, FIXTURE_PASSWORD, email);
}
async function storedAppSession(page: Page) {
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find(
      (candidate) =>
        candidate.startsWith("sb-") && candidate.endsWith("-auth-token"),
    );
    return key ? JSON.parse(localStorage.getItem(key) || "null") : null;
  });
}
async function broadcastSession(
  page: Page,
  options: { otherOwner?: boolean; event?: string } = {},
) {
  return page.evaluate(({ otherOwner, event }) => {
    const key = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    )!;
    const session = JSON.parse(localStorage.getItem(key)!);
    if (otherOwner)
      session.user = {
        ...session.user,
        id: "99999999-8888-4777-8666-555555555555",
        email: "second@example.test",
      };
    session.access_token =
      "eyJhbGciOiJIUzI1NiJ9." +
      btoa(
        JSON.stringify({
          sub: session.user.id,
          exp: Math.floor(Date.now() / 1000) + 3600,
          role: "authenticated",
        }),
      )
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "") +
      ".new-test-signature";
    localStorage.setItem(key, JSON.stringify(session));
    const channel = new BroadcastChannel(key);
    channel.postMessage({ event: event || "SIGNED_IN", session });
    setTimeout(() => channel.close(), 100);
    return session.user;
  }, options);
}

test.describe("required verified sign-in", () => {
  test.skip(
    noConfig,
    "This group needs the configured mocked Supabase bundle.",
  );
  test("every first-entry route is gated, with no guest navigation or check fields", async ({
    page,
  }) => {
    await mockAccount(page);
    for (const path of ["/", "/check", "/learn", "/simulate", "/saved"]) {
      await page.goto(path);
      await expect(
        page.getByRole("heading", { name: "Welcome to Sajag" }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Sign up", exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("group", { name: "Account access" })
          .getByRole("button", { name: "Sign in", exact: true }),
      ).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
      await expect(page.locator("#email-code")).toHaveCount(0);
      await expect(
        page.locator(".mobile-nav, .topbar, #claim-text"),
      ).toHaveCount(0);
    }
  });
  test("wrong password never unlocks the app or requests an email code", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page, { rejectPassword: true });
    await page.goto("/check");
    await signInOnCurrentPage(page);
    await expect(page.locator(".account-notice")).toContainText(
      "Could not sign in",
    );
    await expect(
      page.locator("#claim-text, .mobile-nav, .topbar, #email-code"),
    ).toHaveCount(0);
    expect(await storedAppSession(page)).toBeNull();
    expect(calls.filter((call) => call.path.endsWith("/token"))).toHaveLength(
      1,
    );
    expect(
      calls.filter((call) =>
        /\/(otp|signup|verify|resend|recover)$/.test(call.path),
      ),
    ).toHaveLength(0);
  });
  test("signup password validation sends no request for short or mismatched passwords", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    await page.goto("/check");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await page.locator("#email").fill(FIXTURE_SIGNUP_EMAIL);
    for (const values of [
      { password: "1234567", confirmation: "1234567", message: "at least 8" },
      {
        password: FIXTURE_PASSWORD,
        confirmation: FIXTURE_PASSWORD.toLowerCase(),
        message: "do not match",
      },
    ]) {
      await page.locator("#password").fill(values.password);
      await page.locator("#confirm-password").fill(values.confirmation);
      await page
        .getByRole("button", { name: "Create account", exact: true })
        .click();
      await expect(page.locator(".account-notice")).toContainText(
        values.message,
      );
      expect(
        calls.filter((call) => /\/(signup|token|verify)$/.test(call.path)),
      ).toHaveLength(0);
      expect(await storedAppSession(page)).toBeNull();
      await expect(page.locator("#claim-text")).toHaveCount(0);
    }
  });
  test("signup refuses automatic email confirmation before creating an account", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    await page.route("**/auth/v1/settings", (route) =>
      route.fulfill({
        json: {
          mailer_autoconfirm: true,
          external: { email: true },
          disable_signup: false,
        },
      }),
    );
    await page.goto("/check");
    await beginSignUp(page);
    await expect(page.locator(".account-notice")).toHaveAttribute(
      "role",
      "alert",
    );
    await expect(page.locator("#email-code, #claim-text, .topbar")).toHaveCount(
      0,
    );
    expect(calls.filter((call) => call.path.endsWith("/signup"))).toHaveLength(
      0,
    );
    expect(await storedAppSession(page)).toBeNull();
  });
  test("wrong signup code never unlocks the app and changing email preserves the resend cooldown", async ({
    page,
  }) => {
    await mockAccount(page, { rejectCode: true });
    await page.goto("/check");
    await beginSignUp(page);
    await page.locator("#email-code").fill(FIXTURE_EMAIL_CODE);
    await page
      .getByRole("button", { name: "Verify email and sign in", exact: true })
      .click();
    await expect(page.locator(".account-notice")).toContainText(
      "could not be verified",
    );
    await expect(page.locator("#claim-text")).toHaveCount(0);
    await page.getByRole("button", { name: "Change email" }).click();
    await expect(
      page.getByRole("button", { name: /^Try again in \d+s$/ }),
    ).toBeDisabled();
    await expect(page.locator("#claim-text")).toHaveCount(0);
  });
  test("unavailable signup email delivery never unlocks the app", async ({
    page,
  }) => {
    await mockAccount(page);
    await page.route("**/auth/v1/signup*", (route) => route.abort());
    // Test transport failure from a fresh entry, independently of the resend
    // countdown and React's recurring timers.
    await page.goto("/check");
    await beginSignUp(page);
    await expect(page.locator(".account-notice")).toContainText(
      "could not send",
    );
    await expect(page.locator("#claim-text")).toHaveCount(0);
  });
  test("unavailable reset email delivery never unlocks the app", async ({
    page,
  }) => {
    await mockAccount(page, { rejectRecovery: true });
    await page.goto("/check");
    await beginPasswordReset(page);
    await expect(page.locator(".account-notice")).toContainText(
      "could not send",
    );
    await expect(
      page.locator("#email-code, #claim-text, .mobile-nav"),
    ).toHaveCount(0);
    expect(await storedAppSession(page)).toBeNull();
  });
  test("email resend becomes available after the full cooldown and restarts it", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    await page.clock.install({ time: new Date("2026-10-04T08:00:00Z") });
    await page.goto("/check");
    await expect(page.getByLabel("Your email", { exact: true })).toBeVisible();
    await page.clock.pauseAt(new Date("2026-10-04T09:00:00Z"));
    await beginSignUp(page);
    const resend = page.locator(".email-code-form .button-row button").first();
    await expect(resend).toHaveText("Resend in 60s");
    await expect(resend).toBeDisabled();
    // React schedules the next timeout after committing each decrement. Let
    // each commit finish rather than collapsing the chain into one clock jump.
    for (let remaining = 59; remaining > 0; remaining--) {
      await page.clock.runFor(1000);
      await expect(resend).toHaveText(`Resend in ${remaining}s`);
      await expect(resend).toBeDisabled();
    }
    await page.clock.runFor(1000);
    await expect(resend).toHaveText("Resend code");
    await expect(resend).toBeEnabled();
    expect(calls.filter((call) => call.path.endsWith("/signup"))).toHaveLength(
      1,
    );
    expect(calls.filter((call) => call.path.endsWith("/resend"))).toHaveLength(
      0,
    );
    await resend.click();
    await expect(resend).toHaveText("Resend in 60s");
    await expect(resend).toBeDisabled();
    expect(calls.filter((call) => call.path.endsWith("/signup"))).toHaveLength(
      1,
    );
    expect(calls.filter((call) => call.path.endsWith("/resend"))).toHaveLength(
      1,
    );
    expect(
      calls.find((call) => call.path.endsWith("/resend"))?.body,
    ).toMatchObject({ type: "signup", email: FIXTURE_SIGNUP_EMAIL });
    await expect(page.locator("#claim-text")).toHaveCount(0);
  });
  for (const status of [401, 503] as const) {
    test(`online auth ${status} never displays an analysis fallback`, async ({
      page,
    }) => {
      await mockAccount(page);
      await page.route("**/api/health", (route) =>
        route.fulfill({
          json: {
            aiAvailable: true,
            aiProvider: "gemini",
            aiConsentVersion: 1,
          },
        }),
      );
      await page.route("**/api/analyze", (route) =>
        route.fulfill({
          status,
          json: {
            code: status === 401 ? "SESSION_INVALID" : "AUTH_UNAVAILABLE",
            error: "Auth unavailable for this test",
          },
        }),
      );
      await passwordSignIn(page);
      await expect(page.locator(".account-person h3")).toHaveText(
        "asha@example.test",
      );
      await page.goto("/check");
      await page
        .locator("#claim-text")
        .fill(
          "Pay a parcel redelivery fee using the link from an unknown sender.",
        );
      await page.locator(".ai-options summary").click();
      await page.locator(".ai-options input").check();
      await page.getByRole("button", { name: "Check this message" }).click();
      await expect(page.locator(".analysis-result")).toHaveCount(0);
      if (status === 401) {
        await expect(
          page.getByRole("heading", { name: "Welcome to Sajag" }),
        ).toBeVisible();
        await expect(page.locator("#claim-text")).toHaveCount(0);
      } else {
        await expect(page.getByRole("alert")).toContainText(
          "sign-in could not be checked",
        );
        await expect(page.locator("#claim-text")).toBeVisible();
      }
    });
  }
  test("password sign-in never creates an unknown account; sign-up requires email verification first", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    await page.goto("/learn");
    await submitPasswordSignIn(page, FIXTURE_PASSWORD, FIXTURE_SIGNUP_EMAIL);
    await expect(page.locator("#email-code")).toHaveCount(0);
    await expect(page.locator(".account-notice")).toContainText(
      "Could not sign in",
    );
    expect(calls.filter((call) => call.path.endsWith("/signup"))).toHaveLength(
      0,
    );
    expect(await storedAppSession(page)).toBeNull();
    await beginSignUp(page);
    await expect(page.locator("#email-code")).toBeVisible();
    await expect(
      page.locator(".main-content, .topbar, .mobile-nav"),
    ).toHaveCount(0);
    expect(await storedAppSession(page)).toBeNull();
    expect(
      calls.find((call) => call.path.endsWith("/signup"))?.body,
    ).toMatchObject({
      email: FIXTURE_SIGNUP_EMAIL,
      password: FIXTURE_PASSWORD,
    });
    await page.locator("#email-code").fill(FIXTURE_EMAIL_CODE);
    await page
      .getByRole("button", { name: "Verify email and sign in", exact: true })
      .click();
    await expect(page.locator(".lesson-card")).toHaveCount(15);
    expect(
      calls.find((call) => call.path.endsWith("/verify"))?.body,
    ).toMatchObject({
      email: FIXTURE_SIGNUP_EMAIL,
      token: FIXTURE_EMAIL_CODE,
      type: "email",
    });
    expect((await storedAppSession(page))?.user.email).toBe(
      FIXTURE_SIGNUP_EMAIL,
    );
    expect(calls.some((call) => call.path.endsWith("/user"))).toBe(true);
    expect(calls.filter((call) => call.path.endsWith("/otp"))).toHaveLength(0);
  });
  test("returning password sign-in opens the requested route without sending an email code", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    await page.goto("/check");
    await signInOnCurrentPage(page);
    await expect(page.locator("#claim-text")).toBeVisible();
    await expect(page).toHaveURL(/\/check$/);
    expect(calls.filter((call) => call.path.endsWith("/token"))).toHaveLength(
      1,
    );
    expect(
      calls.find((call) => call.path.endsWith("/token"))?.body,
    ).toMatchObject({ email: FIXTURE_EMAIL, password: FIXTURE_PASSWORD });
    expect(
      calls.filter((call) =>
        /\/(otp|signup|verify|resend|recover)$/.test(call.path),
      ),
    ).toHaveLength(0);
    const stored = await page.evaluate(() =>
      JSON.stringify({
        local: { ...localStorage },
        session: { ...sessionStorage },
      }),
    );
    expect(stored).not.toContain(FIXTURE_PASSWORD);
  });
  test("wrong reset code leaves the app locked and cannot update the password", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page, { rejectCode: true });
    await page.goto("/check");
    await beginPasswordReset(page);
    expect(await storedAppSession(page)).toBeNull();
    await page.locator("#email-code").fill(FIXTURE_EMAIL_CODE);
    await page.locator("#new-password").fill(FIXTURE_RESET_PASSWORD);
    await page.locator("#confirm-new-password").fill(FIXTURE_RESET_PASSWORD);
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    await expect(page.locator(".account-notice")).toContainText(
      "could not be verified",
    );
    await expect(
      page.locator("#claim-text, .main-content, .mobile-nav"),
    ).toHaveCount(0);
    expect(await storedAppSession(page)).toBeNull();
    expect(calls.filter((call) => call.path.endsWith("/verify"))).toHaveLength(
      1,
    );
    expect(
      calls.find((call) => call.path.endsWith("/verify"))?.body,
    ).toMatchObject({ type: "recovery" });
    expect(calls.filter((call) => call.method === "PUT")).toHaveLength(0);
    await page.reload();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#claim-text")).toHaveCount(0);
  });
  test("reset password validation sends no verification or update for short or mismatched passwords", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    await page.goto("/check");
    await beginPasswordReset(page);
    await page.locator("#email-code").fill(FIXTURE_EMAIL_CODE);
    for (const values of [
      { password: "1234567", confirmation: "1234567", message: "at least 8" },
      {
        password: FIXTURE_RESET_PASSWORD,
        confirmation: FIXTURE_RESET_PASSWORD.toLowerCase(),
        message: "do not match",
      },
    ]) {
      await page.locator("#new-password").fill(values.password);
      await page.locator("#confirm-new-password").fill(values.confirmation);
      await page
        .getByRole("button", { name: "Reset password", exact: true })
        .click();
      await expect(page.locator(".account-notice")).toContainText(
        values.message,
      );
      expect(
        calls.filter(
          (call) => call.path.endsWith("/verify") || call.method === "PUT",
        ),
      ).toHaveLength(0);
      expect(await storedAppSession(page)).toBeNull();
      await expect(page.locator("#claim-text")).toHaveCount(0);
    }
  });
  test("verified password recovery stays isolated during the update and requires fresh password sign-in", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    let release!: () => void;
    const updating = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    await page.route("**/auth/v1/user", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      started = true;
      await updating;
      return route.fallback();
    });
    await page.goto("/check");
    await beginPasswordReset(page);
    await page.locator("#email-code").fill(FIXTURE_EMAIL_CODE);
    await page.locator("#new-password").fill(FIXTURE_RESET_PASSWORD);
    await page.locator("#confirm-new-password").fill(FIXTURE_RESET_PASSWORD);
    await page
      .getByRole("button", { name: "Reset password", exact: true })
      .click();
    try {
      await expect.poll(() => started).toBe(true);
      await expect(
        page.locator("#claim-text, .main-content, .mobile-nav"),
      ).toHaveCount(0);
      expect(await storedAppSession(page)).toBeNull();
    } finally {
      release();
    }
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator(".account-notice")).toContainText(
      "Password updated",
    );
    expect(await storedAppSession(page)).toBeNull();
    expect(calls.filter((call) => call.path.endsWith("/token"))).toHaveLength(
      0,
    );
    expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({
      password: FIXTURE_RESET_PASSWORD,
    });
    await page.reload();
    await expect(page.locator("#claim-text")).toHaveCount(0);
    await submitPasswordSignIn(page, FIXTURE_PASSWORD);
    await expect(page.locator(".account-notice")).toContainText(
      "Could not sign in",
    );
    await expect(page.locator("#claim-text")).toHaveCount(0);
    await submitPasswordSignIn(page, FIXTURE_RESET_PASSWORD);
    await expect(page.locator("#claim-text")).toBeVisible();
    expect((await storedAppSession(page))?.user.email).toBe(FIXTURE_EMAIL);
    expect(calls.filter((call) => call.path.endsWith("/token"))).toHaveLength(
      2,
    );
  });
  for (const scenario of [
    {
      name: "reloaded recovery URL",
      destination: (_accessToken: string, _refreshToken: string) =>
        "/settings?recovery=1",
    },
    {
      name: "recovery fragment without a refresh token",
      destination: (accessToken: string, _refreshToken: string) =>
        `/settings#${new URLSearchParams({
          type: "recovery",
          access_token: accessToken,
        })}`,
    },
    {
      name: "recovery fragment with duplicate access tokens",
      destination: (accessToken: string, refreshToken: string) => {
        const fragment = new URLSearchParams({
          type: "recovery",
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        fragment.append("access_token", "duplicate-fixture-token");
        return `/settings#${fragment}`;
      },
    },
    {
      name: "mixed code and implicit recovery fragment",
      destination: (accessToken: string, refreshToken: string) =>
        `/settings?recovery=1&code=fixture-code#${new URLSearchParams({
          type: "recovery",
          access_token: accessToken,
          refresh_token: refreshToken,
        })}`,
    },
  ]) {
    test(`${scenario.name} cannot use an ordinary persisted account to reset its password`, async ({
      page,
    }) => {
      const { calls } = await mockAccount(page);
      await passwordSignIn(page);
      const original = await storedAppSession(page);
      expect(original?.user.email).toBe(FIXTURE_EMAIL);
      expect(typeof original?.access_token).toBe("string");
      expect(typeof original?.refresh_token).toBe("string");

      // These are synthetic fixture credentials from an ordinary SIGNED_IN
      // session. INITIAL_SESSION after navigation/reload is not recovery proof.
      await page.goto(
        scenario.destination(original.access_token, original.refresh_token),
      );
      const lostRecovery = page.getByRole("alert").filter({
        hasText: "This reset link is expired, incomplete or was reloaded",
      });
      await expect(lostRecovery).toBeVisible();
      await expect(
        page.locator("#new-password, #confirm-new-password"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Reset password", exact: true }),
      ).toBeDisabled();
      await expect(
        page.locator(".main-content, .mobile-nav, .topbar"),
      ).toHaveCount(0);
      expect((await storedAppSession(page))?.user.id).toBe(original.user.id);
      expect(
        calls.filter(
          (call) =>
            call.method === "PUT" && typeof call.body.password === "string",
        ),
      ).toHaveLength(0);
      expect(
        calls.filter((call) => /\/(verify|recover)$/.test(call.path)),
      ).toHaveLength(0);

      // Reloading the scrubbed URL must keep the gate closed rather than
      // substituting the ordinary SDK account for missing link credentials.
      await expect(page).toHaveURL(/\/settings\?recovery=1$/);
      await page.reload();
      await expect(lostRecovery).toBeVisible();
      await expect(
        page.locator("#new-password, #confirm-new-password"),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Reset password", exact: true }),
      ).toBeDisabled();
      await expect(
        page.locator(".main-content, .mobile-nav, .topbar"),
      ).toHaveCount(0);
      expect(
        calls.filter(
          (call) =>
            call.method === "PUT" && typeof call.body.password === "string",
        ),
      ).toHaveLength(0);

      await page
        .getByRole("button", { name: "Back to sign in", exact: true })
        .click();
      await expect(page.locator("#password")).toBeVisible();
      expect(await storedAppSession(page)).toBeNull();
      await passwordSignIn(page, FIXTURE_PASSWORD);
      await expect(page.locator(".account-person h3")).toHaveText(
        FIXTURE_EMAIL,
      );
      expect(
        calls.filter(
          (call) =>
            call.method === "PUT" && typeof call.body.password === "string",
        ),
      ).toHaveLength(0);
      expect(
        calls.filter(
          (call) =>
            call.path.endsWith("/token") &&
            typeof call.body.password === "string",
        ),
      ).toHaveLength(2);
    });
  }
  test("server-unconfirmed email cannot be replaced by user-editable verified metadata", async ({
    page,
  }) => {
    await mockAccount(page);
    await page.route("**/auth/v1/user", async (route) => {
      const token = route.request().headers().authorization!.split(" ")[1];
      const claims = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      );
      return route.fulfill({
        json: {
          id: claims.sub,
          aud: "authenticated",
          email: "asha@example.test",
          app_metadata: {},
          user_metadata: { email_verified: true },
          created_at: "2026-10-03T00:00:00Z",
        },
      });
    });
    await page.goto("/check");
    await signInOnCurrentPage(page);
    await expect(
      page.getByRole("alert").filter({ hasText: "needs verification" }),
    ).toBeVisible();
    await expect(page.locator("#claim-text")).toHaveCount(0);
  });
  test("remembered verified session opens without a new password submission, including a later Auth outage", async ({
    page,
  }) => {
    const { calls } = await mockAccount(page);
    await passwordSignIn(page);
    await expect(page.locator(".account-person h3")).toHaveText(
      "asha@example.test",
    );
    const submitted = calls.filter(
      (call) =>
        call.path.endsWith("/token") && typeof call.body.password === "string",
    ).length;
    expect(submitted).toBe(1);
    await page.reload();
    await expect(page.locator(".account-person h3")).toHaveText(
      "asha@example.test",
    );
    expect(
      calls.filter(
        (call) =>
          call.path.endsWith("/token") &&
          typeof call.body.password === "string",
      ),
    ).toHaveLength(submitted);
    expect(calls.filter((call) => call.path.endsWith("/otp"))).toHaveLength(0);
    await page.route("**/auth/v1/user", (route) => route.abort());
    await page.reload();
    await expect(page.locator(".account-person h3")).toHaveText(
      "asha@example.test",
      { timeout: 12000 },
    );
    expect(
      calls.filter(
        (call) =>
          call.path.endsWith("/token") &&
          typeof call.body.password === "string",
      ),
    ).toHaveLength(submitted);
    expect(calls.filter((call) => call.path.endsWith("/otp"))).toHaveLength(0);
  });
  test("sign-out gates deep links and account switching keeps notebooks and progress separate", async ({
    page,
  }) => {
    await mockAccount(page);
    await passwordSignIn(page);
    await expect(page.locator(".account-person h3")).toHaveText(
      "asha@example.test",
    );
    await page.evaluate(
      (analysis) =>
        localStorage.setItem(
          "sajag-notebook:11111111-2222-4333-8444-555555555555",
          JSON.stringify({
            version: 1,
            saved: [
              { id: analysis.id, analysis, savedAt: "2026-10-03T00:00:00Z" },
            ],
            completed: ["risk"],
          }),
        ),
      analyzeClaim("Guaranteed returns if you pay a joining fee today.", "en"),
    );
    await page.goto("/saved");
    await expect(page.locator(".notebook-card")).toHaveCount(1);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.goto("/saved");
    await expect(page.locator(".notebook-card")).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Welcome to Sajag" }),
    ).toBeVisible();
    await signInOnCurrentPage(page);
    await expect(page.locator(".notebook-card")).toHaveCount(1);
    await page.route("**/auth/v1/user", (route) =>
      route.fulfill({
        json: {
          id: "99999999-8888-4777-8666-555555555555",
          email: "second@example.test",
          email_confirmed_at: "2026-10-03T00:00:00Z",
          aud: "authenticated",
          app_metadata: {},
          user_metadata: {},
          created_at: "2026-10-03T00:00:00Z",
        },
      }),
    );
    await broadcastSession(page, { otherOwner: true });
    await expect(page.locator(".notebook-card")).toHaveCount(0);
    await page.goto("/settings");
    await expect(page.locator(".account-person h3")).toHaveText(
      "second@example.test",
    );
    expect(
      await page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem(
              "sajag-notebook:11111111-2222-4333-8444-555555555555",
            )!,
          ).completed,
      ),
    ).toEqual(["risk"]);
  });
  test("legacy notebook stays separate until the signed-in owner confirms import", async ({
    page,
  }) => {
    await mockAccount(page);
    await page.goto("/settings");
    await page.evaluate(
      (analysis) => {
        localStorage.setItem(
          "sajag-saved",
          JSON.stringify([
            { id: analysis.id, analysis, savedAt: "2026-10-03T00:00:00Z" },
          ]),
        );
        localStorage.setItem("sajag-completed", JSON.stringify(["risk"]));
      },
      analyzeClaim("Never share a bank OTP with a caller.", "en"),
    );
    await page.reload();
    await signInOnCurrentPage(page);
    await expect(
      page.getByRole("button", { name: "Back up 0 saved checks" }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Import my older notebook" })
      .click();
    await page.getByRole("button", { name: "Keep separate" }).click();
    await expect(
      page.getByRole("button", { name: "Back up 0 saved checks" }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Import my older notebook" })
      .click();
    await page.getByRole("button", { name: "These are mine — import" }).click();
    await expect(
      page.getByRole("button", { name: "Back up 1 saved checks" }),
    ).toBeEnabled();
    expect(
      await page.evaluate(() => localStorage.getItem("sajag-saved")),
    ).toBeNull();
  });
  test("shared Android message survives waiting for password sign-in and opens its original check destination", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { androidBridge: unknown }).androidBridge = {
        postMessage() {},
      };
    });
    await mockAccount(page);
    await page.clock.install();
    const text =
      "Do not pay a parcel redelivery charge from an unverified message.";
    await page.goto(`/check?text=${encodeURIComponent(text)}`);
    await expect(page).toHaveURL(/\/check$/);
    await page.clock.fastForward(65000);
    await signInOnCurrentPage(page);
    await expect(page.locator("#claim-text")).toHaveValue(text);
    await expect(page.locator(".analysis-result")).toHaveCount(0);
  });
  test("same-owner token refresh preserves an unsaved draft; server rejection locks the route", async ({
    page,
  }) => {
    await mockAccount(page);
    await passwordSignIn(page);
    await expect(page.locator(".account-person h3")).toHaveText(
      "asha@example.test",
    );
    await page.goto("/check");
    const draft = "My unsaved message must survive a token refresh.";
    await page.locator("#claim-text").fill(draft);
    let release!: () => void;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    await page.route("**/auth/v1/user", async (route) => {
      started = true;
      await wait;
      await route.fallback();
    });
    await broadcastSession(page, { event: "TOKEN_REFRESHED" });
    await expect.poll(() => started).toBe(true);
    await expect(page.locator("#claim-text")).toHaveValue(draft);
    release();
    await expect(page.locator("#claim-text")).toHaveValue(draft);
    await page.route("**/auth/v1/user", (route) =>
      route.fulfill({
        status: 401,
        json: { error_code: "session_not_found", msg: "Session revoked" },
      }),
    );
    await broadcastSession(page, { event: "TOKEN_REFRESHED" });
    await expect(
      page.getByRole("heading", { name: "Welcome to Sajag" }),
    ).toBeVisible();
    await expect(page.locator("#claim-text")).toHaveCount(0);
  });
});

test("missing sign-in configuration shows no guest bypass", async ({
  page,
}) => {
  test.skip(!noConfig, "Run with a separately built unconfigured bundle.");
  await page.goto("/check");
  await expect(
    page.getByRole("heading", { name: "Welcome to Sajag" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Sign-in is temporarily unavailable",
  );
  await expect(page.locator("#claim-text, .mobile-nav, .topbar")).toHaveCount(
    0,
  );
  await expect(page.locator("#email")).toHaveCount(0);
});
