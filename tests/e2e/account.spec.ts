import { test, expect, type Locator } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  mockAccount,
  passwordSignIn,
  beginSignUp,
  signUpAndConfirm,
  FIXTURE_PASSWORD,
  FIXTURE_SIGNUP_EMAIL,
} from "./auth-fixture";

function feedbackIsFullyVisible(notice: Locator) {
  return notice.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const left = viewport?.offsetLeft ?? 0;
    const bottom = top + (viewport?.height ?? innerHeight);
    const right = left + (viewport?.width ?? innerWidth);
    // The required sign-in gate has no bottom navigation. Query the DOM
    // immediately instead of waiting for a navigation element that cannot mount.
    const navigation = document
      .querySelector(".mobile-nav")
      ?.getBoundingClientRect();
    const visibleBottom =
      navigation && navigation.height > 0
        ? Math.min(bottom, navigation.top)
        : bottom;
    return (
      box.width > 0 &&
      box.height > 0 &&
      box.top >= top - 1 &&
      box.bottom <= visibleBottom + 1 &&
      box.left >= left - 1 &&
      box.right <= right + 1
    );
  });
}

test("password signs in, profile updates everywhere, persists on reload and disappears on sign-out", async ({
  page,
}) => {
  const { calls } = await mockAccount(page);
  await passwordSignIn(page);
  await expect(page.locator(".account-person h3")).toHaveText(
    "asha@example.test",
  );
  await expect(page.locator(".topbar-settings")).toHaveAttribute(
    "aria-label",
    "Your account: asha@example.test",
  );
  await page.getByRole("button", { name: "Edit your name" }).click();
  await page.getByLabel("Name (optional)", { exact: true }).fill("Asha Rao");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".account-person h3")).toHaveText("Asha Rao");
  await expect(page.locator(".guest-profile strong")).toHaveText("Asha Rao");
  await expect(page.locator(".topbar-settings")).toHaveAttribute(
    "aria-label",
    "Your account: Asha Rao",
  );
  expect(
    calls.find((call) => call.path.endsWith("/token"))?.body,
  ).toMatchObject({
    email: "asha@example.test",
    password: FIXTURE_PASSWORD,
  });
  expect(
    calls.filter((call) => /\/(otp|verify)$/.test(call.path)),
  ).toHaveLength(0);
  expect(calls.find((call) => call.method === "PUT")?.body).toMatchObject({
    data: { full_name: "Asha Rao" },
  });
  expect(
    calls.filter((call) => call.path.includes("notebook_entries")),
  ).toHaveLength(0);
  await page.reload();
  await expect(page.locator(".account-person h3")).toHaveText("Asha Rao");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Your email", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Welcome to Sajag" }),
  ).toBeVisible();
  await expect(
    page.locator(".guest-profile, .topbar-settings, .mobile-nav"),
  ).toHaveCount(0);
  await expect(page.locator(".account-card")).not.toContainText(
    "asha@example.test",
  );
});

test("ten-digit signup confirmation codes work and no code or password is persisted", async ({
  page,
}) => {
  const { calls } = await mockAccount(page, { verificationCode: "0192837465" });
  await page.goto("/settings");
  await signUpAndConfirm(
    page,
    FIXTURE_SIGNUP_EMAIL,
    FIXTURE_PASSWORD,
    "0192837465",
  );
  await expect(page.locator(".account-person h3")).toHaveText(
    FIXTURE_SIGNUP_EMAIL,
  );
  expect(calls.find((call) => call.path.endsWith("/verify"))?.body.token).toBe(
    "0192837465",
  );
  const stored = await page.evaluate(() =>
    JSON.stringify({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }),
  );
  expect(stored).not.toContain("0192837465");
  expect(stored).not.toContain(FIXTURE_PASSWORD);
});

test("invalid and expired codes show recovery without signing in or sending malformed values", async ({
  page,
}) => {
  const { calls } = await mockAccount(page, { rejectCode: true });
  await page.goto("/settings");
  await beginSignUp(page);
  const code = page.getByLabel("Enter the code from your email", {
    exact: true,
  });
  await expect(code).toBeFocused();
  await code.fill("12a456");
  await page.getByRole("button", { name: "Verify email and sign in" }).click();
  expect(calls.filter((call) => call.path.endsWith("/verify"))).toHaveLength(0);
  await code.fill("123456");
  await page.getByRole("button", { name: "Verify email and sign in" }).click();
  await expect(page.locator(".account-notice")).toContainText(
    "could not be verified",
  );
  await expect(page.locator(".account-person")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Resend in/ })).toBeDisabled();
  await page.getByRole("button", { name: "Change email" }).click();
  await expect(page.getByLabel("Your email", { exact: true })).toHaveValue(
    FIXTURE_SIGNUP_EMAIL,
  );
  await expect(page.locator("#email-code")).toHaveCount(0);
});

test("failed profile edit preserves identity and blank name restores email fallback", async ({
  page,
}) => {
  const options = { rejectName: true };
  await mockAccount(page, options);
  await passwordSignIn(page);
  await page.getByRole("button", { name: "Edit your name" }).click();
  await page.getByLabel("Name (optional)", { exact: true }).fill("Asha Rao");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".account-notice")).toContainText(
    "could not be saved",
  );
  await expect(page.locator(".account-person h3")).toHaveText(
    "asha@example.test",
  );
  options.rejectName = false;
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".account-person h3")).toHaveText("Asha Rao");
  await page.getByRole("button", { name: "Edit your name" }).click();
  await page.getByLabel("Name (optional)", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".account-person h3")).toHaveText(
    "asha@example.test",
  );
});

test("profile on narrow Hindi screens stays usable and passes accessibility checks", async ({
  page,
}) => {
  await mockAccount(page);
  await passwordSignIn(page);
  await page.getByRole("button", { name: "Edit your name" }).click();
  await page.getByLabel("Name (optional)", { exact: true }).fill("आशा वर्मा");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.locator(".account-person h3")).toHaveText("आशा वर्मा");
  await page.getByLabel("Choose language").selectOption("hi");
  await page.setViewportSize({ width: 360, height: 800 });
  await page.getByRole("switch", { name: "बड़े अक्षर" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .include(".account-card")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});

test("cloud backup is explicit and delete requires confirmation", async ({
  page,
}) => {
  const { calls } = await mockAccount(page);
  await passwordSignIn(page);
  await expect(
    page.getByRole("button", { name: "Back up 0 saved checks" }),
  ).toBeDisabled();
  expect(
    calls.filter((call) => call.path.includes("notebook_entries")),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Restore my cloud notebook" }).click();
  await expect(
    page.getByRole("button", { name: "Restore my cloud notebook" }),
  ).toBeEnabled();
  expect(
    calls.filter(
      (call) => call.path.includes("notebook_entries") && call.method === "GET",
    ),
  ).toHaveLength(1);
  await page.getByRole("button", { name: "Delete cloud notebook" }).click();
  await page.getByRole("button", { name: "Keep it", exact: true }).click();
  expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);
  await page.getByRole("button", { name: "Delete cloud notebook" }).click();
  await page
    .getByRole("button", { name: "Delete this data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
});

test("web download is explicit and targets the fixed APK", async ({
  page,
  context,
}) => {
  await context.route("**/downloads/latest.json", (route) =>
    route.fulfill({
      json: {
        schemaVersion: 1,
        versionName: "1.2",
        bytes: 5000000,
        sha256: "a".repeat(64),
      },
    }),
  );
  await mockAccount(page);
  await passwordSignIn(page);
  const link = page.getByRole("link", { name: "Download Android APK" });
  await expect(link).toHaveAttribute(
    "href",
    "/downloads/Sajag-Android-Debug.apk",
  );
  await expect(link).toHaveAttribute("download", "Sajag-Android-Debug.apk");
  await expect(page.locator(".app-download")).toContainText("Version 1.2");
});

test("native shell enables password sign-in and hides web downloads", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { androidBridge: unknown }).androidBridge = {
      postMessage() {},
    };
  });
  const { calls } = await mockAccount(page);
  const downloads: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/downloads/")) downloads.push(request.url());
  });
  await passwordSignIn(page);
  await expect(page.locator(".account-person h3")).toHaveText(
    "asha@example.test",
  );
  await expect(
    page.getByRole("link", { name: "Download Android APK" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Get the app", exact: true }),
  ).toHaveCount(0);
  expect(downloads).toEqual([]);
  const request = calls.find((call) => call.path.endsWith("/token"));
  expect(request).toBeTruthy();
  expect(request?.body).toMatchObject({
    email: "asha@example.test",
    password: FIXTURE_PASSWORD,
  });
  expect(
    calls.filter((call) => /\/(otp|verify)$/.test(call.path)),
  ).toHaveLength(0);
});

test("account notebook backs up only by choice and remains accessible after signing in again", async ({
  page,
}) => {
  const { calls } = await mockAccount(page);
  await passwordSignIn(page);
  await expect(page.locator(".account-person h3")).toHaveText(
    "asha@example.test",
  );
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill("Guaranteed daily returns. Join our VIP group now!");
  await page.getByRole("button", { name: "Check this message" }).click();
  await page.getByRole("button", { name: "Save to notebook" }).click();
  await page.goto("/settings");
  expect(
    calls.filter((call) => call.path.includes("notebook_entries")),
  ).toHaveLength(0);
  await page.getByRole("button", { name: "Back up 1 saved checks" }).click();
  await expect(
    page.getByRole("button", { name: "Back up 1 saved checks" }),
  ).toBeEnabled();
  const upload = calls.find(
    (call) => call.path.includes("notebook_entries") && call.method === "POST",
  );
  expect(upload).toBeTruthy();
  const rows = upload!.body as unknown as {
    user_id: string;
    id: string;
    saved_at: string;
    analysis: unknown;
  }[];
  expect(rows).toHaveLength(1);
  expect(rows[0].user_id).toBe("11111111-2222-4333-8444-555555555555");
  await page.route("https://*.supabase.co/rest/v1/notebook_entries*", (route) =>
    route.fulfill({ json: rows }),
  );
  await page.getByRole("button", { name: "Restore my cloud notebook" }).click();
  await expect(
    page.getByRole("button", { name: "Restore my cloud notebook" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByLabel("Your email", { exact: true })).toBeVisible();
  await page.goto("/saved");
  await expect(page.locator(".notebook-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Welcome to Sajag" }),
  ).toBeVisible();
  await page.goto("/settings");
  await passwordSignIn(page);
  await page.goto("/saved");
  await expect(page.locator(".notebook-card")).toHaveCount(1);
});

for (const transition of ["sign-out", "different-user"] as const) {
  test(`delayed name save cannot reverse a cross-tab ${transition}`, async ({
    page,
  }) => {
    await mockAccount(page);
    await passwordSignIn(page);
    await expect(page.locator(".account-person h3")).toHaveText(
      "asha@example.test",
    );
    const oldUser = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
      )!;
      return JSON.parse(localStorage.getItem(key)!).user;
    });
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started = false;
    await page.route("https://*.supabase.co/auth/v1/user", async (route) => {
      if (route.request().method() !== "PUT") return route.fallback();
      started = true;
      await gate;
      await route.fulfill({
        json: {
          ...oldUser,
          user_metadata: { full_name: "Updated first user" },
        },
      });
    });
    await page.getByRole("button", { name: "Edit your name" }).click();
    await page
      .getByLabel("Name (optional)", { exact: true })
      .fill("Updated first user");
    await page.getByRole("button", { name: "Save name" }).click();
    await expect.poll(() => started).toBe(true);
    await page.evaluate((transition) => {
      const key = Object.keys(localStorage).find(
        (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
      )!;
      let session = null;
      let event = "SIGNED_OUT";
      if (transition === "different-user") {
        session = JSON.parse(localStorage.getItem(key)!);
        session.user = {
          ...session.user,
          id: "99999999-8888-4777-8666-555555555555",
          email: "second@example.test",
          user_metadata: { full_name: "Second user" },
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
          ".test-signature";
        session.refresh_token = "second-mock-refresh";
        localStorage.setItem(key, JSON.stringify(session));
        event = "SIGNED_IN";
      } else localStorage.removeItem(key);
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event, session });
      setTimeout(() => channel.close(), 100);
    }, transition);
    if (transition === "sign-out")
      await expect(
        page.getByLabel("Your email", { exact: true }),
      ).toBeVisible();
    else
      await expect(page.locator(".account-person h3")).toHaveText(
        "Second user",
      );
    release();
    if (transition === "sign-out") {
      // Sign-out remounts the verification gate. Old asynchronous profile work
      // cannot restore its account or keep the new gate busy.
      await expect(
        page.getByLabel("Your email", { exact: true }),
      ).toBeEnabled();
      await expect(
        page.locator('form:has(#password) button[type="submit"]'),
      ).toBeEnabled();
    } else {
      await expect(
        page.getByRole("button", { name: "Edit your name" }),
      ).toBeEnabled();
    }
    await expect(page.locator(".account-card")).not.toContainText(
      "Updated first user",
    );
    const storedIdentity = await page.evaluate(() => {
      const key = Object.keys(localStorage).find(
        (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
      );
      return key ? JSON.parse(localStorage.getItem(key)!).user.email : null;
    });
    expect(storedIdentity).toBe(
      transition === "sign-out" ? null : "second@example.test",
    );
  });
}

test("a revoked profile read for an old account cannot sign out the current account", async ({
  page,
}) => {
  await mockAccount(page);
  await passwordSignIn(page);
  await expect(page.locator(".account-person h3")).toHaveText(
    "asha@example.test",
  );
  const oldUser = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    )!;
    return JSON.parse(localStorage.getItem(key)!).user;
  });
  const secondUser = {
    ...oldUser,
    id: "99999999-8888-4777-8666-555555555555",
    email: "second@example.test",
    user_metadata: { full_name: "Second user" },
  };
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route("https://*.supabase.co/auth/v1/user", async (route) => {
    if (route.request().method() !== "GET") return route.fallback();
    const token = route.request().headers().authorization!.split(" ")[1];
    const claims = JSON.parse(
      Buffer.from(token.split(".")[1], "base64url").toString(),
    );
    if (claims.sub !== oldUser.id) return route.fulfill({ json: secondUser });
    started = true;
    await gate;
    await route.fulfill({
      status: 403,
      json: { error_code: "session_not_found", msg: "Session was revoked" },
    });
  });
  await page.reload();
  await expect.poll(() => started).toBe(true);
  await page.evaluate((secondUser) => {
    const key = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    )!;
    const session = JSON.parse(localStorage.getItem(key)!);
    session.user = secondUser;
    session.access_token =
      "eyJhbGciOiJIUzI1NiJ9." +
      btoa(
        JSON.stringify({
          sub: secondUser.id,
          exp: Math.floor(Date.now() / 1000) + 3600,
          role: "authenticated",
        }),
      )
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replace(/=+$/, "") +
      ".test-signature";
    session.refresh_token = "second-mock-refresh";
    localStorage.setItem(key, JSON.stringify(session));
    const channel = new BroadcastChannel(key);
    channel.postMessage({ event: "SIGNED_IN", session });
    setTimeout(() => channel.close(), 100);
  }, secondUser);
  await expect(page.locator(".account-person h3")).toHaveText("Second user");
  const rejectedRead = page.waitForResponse(
    (response) =>
      response.url().includes("/auth/v1/user") && response.status() === 403,
  );
  release();
  await rejectedRead;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator(".account-person h3")).toHaveText("Second user");
  const storedIdentity = await page.evaluate(() => {
    const key = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
    return key ? JSON.parse(localStorage.getItem(key)!).user.email : null;
  });
  expect(storedIdentity).toBe("second@example.test");
});

for (const language of ["en", "hi", "bn"] as const) {
  test(`phone ${language} signup feedback stays fully visible and invalid confirmation codes are localized`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 839 });
    const { calls } = await mockAccount(page, { rejectCode: true });
    await page.goto("/settings");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await page.locator(".language-control select").selectOption(language);
    await page.locator("#email").fill(FIXTURE_SIGNUP_EMAIL);
    await page.locator("#password").fill(FIXTURE_PASSWORD);
    await page.locator("#confirm-password").fill(FIXTURE_PASSWORD);
    await page.locator('.account-signin form button[type="submit"]').click();
    const notice = page.locator("#account-feedback");
    await expect(notice).toHaveAttribute("role", "status");
    await expect.poll(() => feedbackIsFullyVisible(notice)).toBe(true);
    await page.locator("#email-code").fill("12");
    await page.locator('.email-code-form button[type="submit"]').click();
    await expect(notice).toHaveAttribute("role", "alert");
    await expect(notice).toContainText(
      language === "en" ? "6–10" : language === "hi" ? "6–10" : "৬–১০",
    );
    expect(calls.filter((call) => call.path.endsWith("/verify"))).toHaveLength(
      0,
    );
    await expect.poll(() => feedbackIsFullyVisible(notice)).toBe(true);
    await page.locator("#email-code").fill("123456");
    const verify = page.locator('.email-code-form button[type="submit"]');
    await verify.click();
    await expect(notice).toHaveAttribute("role", "alert");
    await expect(notice).toContainText(
      {
        en: "That code or reset could not be verified.",
        hi: "कोड या पासवर्ड बदलने की पुष्टि नहीं हो सकी।",
        bn: "কোড বা রিসেট যাচাই করা যায়নি।",
      }[language],
    );
    await expect(verify).toBeEnabled();
    // Audit the completed rejection state, not the previous validation alert
    // or a button midway through its disabled-to-enabled hover transition.
    await verify.evaluate(async (button) => {
      await Promise.all(
        button
          .getAnimations()
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    await expect.poll(() => feedbackIsFullyVisible(notice)).toBe(true);
    expect(calls.filter((call) => call.path.endsWith("/verify"))).toHaveLength(
      1,
    );
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });
}

for (const language of ["en", "hi", "bn"] as const) {
  test(`${language} signup validates email in-app, blocks malformed requests and recovers`, async ({
    page,
  }, info) => {
    const { calls } = await mockAccount(page);
    await page.goto("/settings");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    await page.locator(".language-control select").selectOption(language);
    await page.locator("#password").fill(FIXTURE_PASSWORD);
    await page.locator("#confirm-password").fill(FIXTURE_PASSWORD);
    const field = page.locator("#email");
    const submit = page.locator('.account-signin form button[type="submit"]');
    const notice = page.locator("#account-feedback");
    const message = {
      en: "Enter a valid email address, such as name@example.com.",
      hi: "सही ईमेल पता लिखें, जैसे name@example.com।",
      bn: "সঠিক ইমেল ঠিকানা লিখুন, যেমন name@example.com।",
    }[language];
    await expect(page.locator(".account-signin form")).toHaveAttribute(
      "novalidate",
      "",
    );
    // The browser still provides validity flags, but may never emit its own popup.
    await page.evaluate(() => {
      (window as unknown as { invalidEvents: number }).invalidEvents = 0;
      document.addEventListener(
        "invalid",
        () => {
          (window as unknown as { invalidEvents: number }).invalidEvents++;
        },
        true,
      );
    });
    for (const value of [
      "",
      "not-an-email",
      "a@",
      "two@example.test,other@example.test",
    ]) {
      await field.fill(value);
      await submit.click();
      await expect(notice).toHaveText(message);
      await expect(notice).toHaveAttribute("role", "alert");
      await expect(field).toHaveAttribute("aria-invalid", "true");
      await expect(field).toHaveAttribute(
        "aria-describedby",
        /account-feedback/,
      );
      expect(
        calls.filter((call) => call.path.endsWith("/signup")),
      ).toHaveLength(0);
    }
    expect(
      await page.evaluate(
        () => (window as unknown as { invalidEvents: number }).invalidEvents,
      ),
    ).toBe(0);
    if (info.project.name === "mobile") {
      await expect.poll(() => feedbackIsFullyVisible(notice)).toBe(true);
    }
    expect(
      (await new AxeBuilder({ page }).include(".account-card").analyze())
        .violations,
    ).toEqual([]);
    // Correcting the email and submitting by keyboard must send exactly once.
    await field.fill("  asha+learning@example.test  ");
    await field.press("Enter");
    await expect(page.locator("#email-code")).toBeFocused();
    expect(calls.filter((call) => call.path.endsWith("/signup"))).toHaveLength(
      1,
    );
    expect(
      calls.find((call) => call.path.endsWith("/signup"))?.body.email,
    ).toBe("asha+learning@example.test");
    await expect(notice).toHaveAttribute("role", "status");
    await expect(notice).not.toHaveText(message);
  });
}
