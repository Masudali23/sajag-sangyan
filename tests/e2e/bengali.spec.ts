import { test, expect } from "./app-fixture";
import { test as accountTest } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  mockAccount,
  codeSignIn,
  readTestNotebook,
  TEST_NOTEBOOK_KEY,
} from "./auth-fixture";

const forward = "প্রতি মাসে নিশ্চিত ৮% লাভ পাবেন। আমাদের VIP গ্রুপে যোগ দিন।";
async function bengali(page: import("@playwright/test").Page) {
  await page.goto("/check");
  await page.locator(".language-control select").selectOption("bn");
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
}

test("Bengali check gives sourced Bengali warnings, remains local and saves only by choice", async ({
  page,
  context,
}) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await bengali(page);
  await page.locator("#claim-text").fill(forward);
  await page.getByRole("button", { name: "এই বার্তাটি যাচাই করুন" }).click();
  await expect(page.locator(".finding").first()).toBeVisible();
  await expect(page.locator(".original-message blockquote")).toHaveAttribute(
    "lang",
    "bn",
  );
  await expect(page.locator(".finding").first()).toContainText(
    /লাভ|রিটার্ন|টাকা/,
  );
  expect((await readTestNotebook(page)).saved.length).toBe(0);
  await page.getByRole("tab", { name: "প্রমাণ ও ঘাটতি" }).click();
  await expect(page.locator(".source-link").first()).toHaveAttribute(
    "href",
    /^https:\/\//,
  );
  await expect(page.locator(".source-scope").first()).toContainText(
    /[\u0980-\u09ff]/,
  );
  await page.getByRole("button", { name: "নোটবুকে সেভ করুন" }).click();
  const saved = (await readTestNotebook(page)).saved;
  expect(saved[0].analysis.language).toBe("bn");
  expect(saved[0].analysis.summary.bn).toBeTruthy();
  expect(posts).toEqual([]);
  await page.goto("/saved");
  await expect(page.locator(".notebook-entry")).toHaveCount(1);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".notebook-entry")).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
  await context.setOffline(false);
});

test("Bengali routes, all lessons and the scam stories fit narrow screens and pass accessibility", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 360, height: 800 });
  await bengali(page);
  for (const route of [
    "/",
    "/learn",
    "/learn/risk",
    "/learn/diversification",
    "/learn/volatility",
    "/learn/compounding",
    "/learn/fees",
    "/learn/nav",
    "/learn/nomination",
    "/learn/digital-arrest",
    "/learn/kyc-update",
    "/learn/upi-pin",
    "/learn/task-jobs",
    "/learn/trading-apps",
    "/learn/advance-fees",
    "/learn/online-friend",
    "/learn/after-fraud",
    "/simulate",
    "/simulate?mode=money",
    "/simulate?story=digital-arrest",
    "/saved",
    "/settings",
    "/sources",
    "/help",
  ]) {
    await page.goto(route);
    // Wait for the signed-in app shell, not a transient session check.
    await expect(page.locator("main#main.main-content")).toBeVisible();
    await expect(page.locator("h1")).toContainText(/[\u0980-\u09ff]/);
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations,
      route,
    ).toEqual([]);
  }
  await expect(page.locator("html")).toHaveAttribute("lang", "bn");
});

test("Bengali bill reminder stays unverified and does not recommend a loss simulation", async ({
  page,
}) => {
  await bengali(page);
  await page
    .locator("#claim-text")
    .fill("আপনার ক্রেডিট কার্ডের বিল তৈরি। এই লিংক থেকে পরিশোধের তারিখ দেখুন।");
  await page.getByRole("button", { name: "এই বার্তাটি যাচাই করুন" }).click();
  await expect(page.locator(".payment-context")).toContainText("নিজে");
  await expect(page.locator(".finding")).toHaveCount(0);
  await expect(page.locator(".payment-context")).toContainText("যাচাই");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

accountTest(
  "Bengali profile name and notebook backup keep their language and account owner",
  async ({ page }) => {
    const auth = await mockAccount(page);
    await codeSignIn(page);
    await page.locator(".language-control select").selectOption("bn");
    await page.getByRole("button", { name: "আপনার নাম বদলান" }).click();
    await page.locator("#profile-name").fill("আশা দাস");
    await page.getByRole("button", { name: "নাম সেভ করুন" }).click();
    await expect(page.locator(".account-identity h3")).toHaveText("আশা দাস");
    await page.goto("/check");
    await page.locator("#claim-text").fill(forward);
    await page.getByRole("button", { name: "এই বার্তাটি যাচাই করুন" }).click();
    await page.getByRole("button", { name: "নোটবুকে সেভ করুন" }).click();
    await page.goto("/settings");
    await page
      .getByRole("button", {
        name: "১টি সেভ করা যাচাইয়ের ব্যাকআপ নিন".replace("১", "1"),
      })
      .click();
    await expect
      .poll(
        () =>
          auth.calls.filter(
            (c) => c.path.includes("/rest/") && c.method === "POST",
          ).length,
      )
      .toBe(1);
    const row = auth.calls.find(
      (c) => c.path.includes("/rest/") && c.method === "POST",
    )!;
    const body = Array.isArray(row.body) ? row.body[0] : row.body;
    expect(body.analysis.language).toBe("bn");
    expect(body.user_id).toBe("11111111-2222-4333-8444-555555555555");
    await page.route(
      "https://*.supabase.co/rest/v1/notebook_entries**",
      async (route) => {
        if (route.request().method() === "GET")
          return route.fulfill({ json: [body] });
        return route.fallback();
      },
    );
    await page.evaluate(
      (key) => localStorage.removeItem(key),
      TEST_NOTEBOOK_KEY,
    );
    await page.reload();
    await page.getByRole("button", { name: "আমার ক্লাউড নোটবুক আনুন" }).click();
    await expect
      .poll(() =>
        readTestNotebook(page).then((notebook) => notebook.saved.length),
      )
      .toBe(1);
    const restored = (await readTestNotebook(page)).saved[0];
    expect(restored.analysis.language).toBe("bn");
    expect(restored.analysis.summary.bn).toBe(body.analysis.summary.bn);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  },
);

test("Bengali Gemini consent names its recipient and human review before any message transfer", async ({
  page,
}) => {
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: { aiAvailable: true, aiProvider: "gemini", aiConsentVersion: 1 },
    }),
  );
  const sent: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/api/analyze")) sent.push(r.url());
  });
  await bengali(page);
  await page.locator("#claim-text").fill(forward);
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-data-notice")).toContainText("Google");
  await expect(page.locator(".ai-data-notice")).toContainText(/মানুষ|মানব/);
  await expect(page.locator("input[type=checkbox]")).not.toBeChecked();
  expect(sent).toEqual([]);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("Bengali dictation uses bn-IN after consent and returns editable text", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      SpeechRecognition: unknown;
      voiceLocale: string;
      voiceStarts: number;
    };
    state.voiceStarts = 0;
    state.SpeechRecognition = class {
      lang = "";
      onstart?: () => void;
      onresult?: (event: unknown) => void;
      start() {
        state.voiceStarts++;
        state.voiceLocale = this.lang;
        this.onstart?.();
        setTimeout(
          () =>
            this.onresult?.({
              results: [[{ transcript: "নিশ্চিত লাভের কথা আগে যাচাই করুন।" }]],
            }),
          20,
        );
      }
      abort() {}
    };
  });
  await bengali(page);
  await page.getByRole("button", { name: "বলে লিখুন" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { voiceStarts: number }).voiceStarts,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "বলে লেখার অনুমতি দিয়ে শুরু করুন" })
    .click();
  await expect(page.locator("#claim-text")).toHaveValue(
    "নিশ্চিত লাভের কথা আগে যাচাই করুন।",
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { voiceLocale: string }).voiceLocale,
    ),
  ).toBe("bn-IN");
  await expect(page.locator(".analysis-result")).toHaveCount(0);
});

test("an unknown path has a Bengali recovery action", async ({ page }) => {
  await bengali(page);
  await page.goto("/missing-page");
  await expect(
    page.getByRole("heading", { name: "পেজ পাওয়া যায়নি" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "সজাগে ফিরে যান" }).click();
  await expect(page).toHaveURL(/\/$/);
});
