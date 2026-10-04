import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockAccount, codeSignIn } from "./auth-fixture";

// Local layout tests only: Auth/OTP/refresh are explicit fixture responses.
// These screenshots are never live footage, email-delivery or phone evidence.
const noConfig = process.env.E2E_SUPABASE_UNCONFIGURED === "1";
const screenshots = process.env.E2E_DESKTOP_SCREENSHOTS !== "0";

async function prepareMockedPage(page: Page) {
  const account = await mockAccount(page);
  let aiRequests = 0;
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: {
        aiAvailable: false,
        aiProvider: "gemini",
        aiConsentVersion: 1,
        authRequired: true,
        authAvailable: true,
      },
    }),
  );
  await page.route("**/api/analyze", (route) => {
    aiRequests++;
    return route.abort();
  });
  return {
    assertLocalOnly() {
      expect(aiRequests, "Layout checks must never submit an AI request").toBe(
        0,
      );
      expect(
        account.calls.filter(
          (call) =>
            call.path.startsWith("/rest/v1/") &&
            !["GET", "HEAD", "OPTIONS"].includes(call.method),
        ),
        "Layout checks must never write a cloud notebook",
      ).toEqual([]);
      expect(
        account.calls.filter(
          (call) => call.path.endsWith("/user") && call.method === "PUT",
        ),
        "Layout checks must never edit an account",
      ).toEqual([]);
    },
  };
}

async function noHorizontalOverflow(page: Page, description: string) {
  const geometry = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    scrollX: window.scrollX,
  }));
  expect(
    geometry.document,
    `${description}: document width`,
  ).toBeLessThanOrEqual(geometry.viewport + 1);
  expect(geometry.body, `${description}: body width`).toBeLessThanOrEqual(
    geometry.viewport + 1,
  );
  expect(geometry.scrollX, `${description}: no sideways scroll`).toBe(0);
}

async function attachMockScreenshot(page: Page, info: TestInfo, name: string) {
  if (!screenshots) return;
  const labelId = "local-test-mock-auth-screenshot-label";
  await page.evaluate((id) => {
    const label = document.createElement("div");
    label.id = id;
    label.setAttribute("aria-hidden", "true");
    label.textContent = "LOCAL TEST MOCK AUTH · browser layout test";
    label.style.cssText =
      "position:fixed;right:8px;bottom:8px;z-index:2147483647;" +
      "max-width:calc(100vw - 16px);padding:6px 9px;border-radius:5px;" +
      "background:#251b49;color:#fff;font:11px/1.4 Arial,sans-serif;" +
      "pointer-events:none;";
    document.body.append(label);
  }, labelId);
  try {
    const path = info.outputPath(`LOCAL-TEST-MOCK-AUTH-${name}.png`);
    await page.screenshot({ path, fullPage: true });
    await info.attach(`LOCAL TEST MOCK AUTH — ${name}`, {
      path,
      contentType: "image/png",
    });
  } finally {
    await page.evaluate((id) => document.getElementById(id)?.remove(), labelId);
  }
}

async function readyGate(page: Page) {
  await page.goto("/");
  await expect(page.locator("main.signin-page")).toBeVisible();
  await expect(page.getByLabel("Your email", { exact: true })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]) {
  test.describe(`desktop website ${viewport.width}×${viewport.height}`, () => {
    test.use({ viewport });
    test.skip(noConfig, "Needs the configured, locally mocked Auth bundle.");
    test.skip(
      ({ isMobile }) => Boolean(isMobile),
      "Desktop coverage runs on the desktop project.",
    );

    test("anonymous sign-in uses two usable panels and exposes all four features accessibly", async ({
      page,
    }, info) => {
      const requests = await prepareMockedPage(page);
      await readyGate(page);
      const hero = page.locator(".signin-hero");
      const panel = page.locator(".signin-panel");
      const content = page.locator(".signin-panel-content");
      await expect(hero).toBeVisible();
      await expect(panel).toBeVisible();
      await expect(content).toBeVisible();
      const heroBox = await hero.boundingBox();
      const panelBox = await panel.boundingBox();
      const contentBox = await content.boundingBox();
      expect(heroBox).not.toBeNull();
      expect(panelBox).not.toBeNull();
      expect(contentBox).not.toBeNull();
      expect(
        heroBox!.width,
        "Hero is a desktop panel rather than a phone column",
      ).toBeGreaterThanOrEqual(400);
      expect(
        panelBox!.width,
        "Form panel has usable desktop width",
      ).toBeGreaterThanOrEqual(400);
      expect(
        contentBox!.width,
        "Form content is not compressed inside its panel",
      ).toBeGreaterThanOrEqual(340);
      expect(
        heroBox!.x + heroBox!.width,
        "Panels sit beside one another",
      ).toBeLessThanOrEqual(panelBox!.x + 1);
      expect(
        Math.abs(heroBox!.y - panelBox!.y),
        "Panel tops belong to the same desktop row",
      ).toBeLessThanOrEqual(80);

      const features = page.locator(".signin-feature-grid > *");
      await expect(features).toHaveCount(4);
      for (let index = 0; index < 4; index++) {
        await expect(features.nth(index)).toBeVisible();
        await expect(
          features.nth(index),
          "Every feature tile fits above the fold",
        ).toBeInViewport({ ratio: 1 });
      }
      await expect(page.locator("#signin-language")).toBeVisible();
      for (const name of ["Sign in", "Sign up"]) {
        const mode = page
          .getByRole("group", { name: "Account access" })
          .getByRole("button", { name, exact: true });
        await expect(mode).toBeEnabled();
        await expect(mode).toBeInViewport({ ratio: 1 });
      }
      const email = page.getByLabel("Your email", { exact: true });
      await expect(email).toHaveAttribute("type", "email");
      await expect(email).toBeEnabled();
      await expect(email).toBeInViewport({ ratio: 1 });
      expect((await email.boundingBox())!.width).toBeGreaterThanOrEqual(300);
      await email.focus();
      await expect(email).toBeFocused();
      await noHorizontalOverflow(page, "Anonymous desktop gate");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await attachMockScreenshot(page, info, `anonymous-${viewport.width}`);
      requests.assertLocalOnly();
    });

    test("signed-in routes use desktop content width without sideways overflow", async ({
      page,
    }, info) => {
      test.setTimeout(120000);
      const requests = await prepareMockedPage(page);
      await codeSignIn(page);
      const routes = [
        ["home", "/"],
        ["check", "/check"],
        ["learn", "/learn"],
        ["risk-lesson", "/learn/risk"],
        ["scam-stories", "/simulate"],
        ["task-job", "/simulate?story=task-job"],
        ["money-scenarios", "/simulate?mode=money"],
        ["saved", "/saved"],
        ["settings", "/settings"],
        ["help", "/help"],
      ] as const;
      for (const [name, route] of routes) {
        await test.step(`Desktop ${name}`, async () => {
          await page.goto(route);
          const main = page.locator("main#main.main-content");
          await expect(main).toBeVisible();
          const heading = main.getByRole("heading", { level: 1 }).first();
          await expect(heading).toBeVisible();
          await expect(heading).not.toHaveText(
            /Page not found|Let[’']s try that again/,
          );
          await page.evaluate(() => document.fonts.ready);
          const box = await main.boundingBox();
          expect(box).not.toBeNull();
          expect(
            box!.width,
            `${route}: broad desktop main`,
          ).toBeGreaterThanOrEqual(800);
          expect(
            box!.x,
            `${route}: main begins within viewport`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            box!.x + box!.width,
            `${route}: main ends within viewport`,
          ).toBeLessThanOrEqual(viewport.width + 1);
          await noHorizontalOverflow(page, route);
          await attachMockScreenshot(page, info, `${viewport.width}-${name}`);
        });
      }
      requests.assertLocalOnly();
    });
  });
}

test.describe("narrow sign-in website 393×852", () => {
  test.use({ viewport: { width: 393, height: 852 } });
  test.skip(noConfig, "Needs the configured, locally mocked Auth bundle.");
  test.skip(
    ({ isMobile }) => !isMobile,
    "Narrow coverage runs on the mobile project.",
  );

  test("sign-in stacks a compact introduction above an accessible email form", async ({
    page,
  }, info) => {
    const requests = await prepareMockedPage(page);
    await readyGate(page);
    const hero = page.locator(".signin-hero");
    const panel = page.locator(".signin-panel");
    const heroBox = await hero.boundingBox();
    const panelBox = await panel.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(
      heroBox!.height,
      "Mobile introduction leaves room for the form",
    ).toBeLessThanOrEqual(320);
    expect(
      panelBox!.y,
      "Form follows the introduction vertically",
    ).toBeGreaterThanOrEqual(heroBox!.y + heroBox!.height - 1);
    await expect(page.locator(".signin-feature-grid")).not.toBeVisible();
    await expect(page.locator("#signin-language")).toBeVisible();
    const email = page.getByLabel("Your email", { exact: true });
    await expect(email).toBeEnabled();
    await expect(email).toBeInViewport({ ratio: 1 });
    expect((await email.boundingBox())!.width).toBeGreaterThanOrEqual(260);
    await email.focus();
    await expect(email).toBeFocused();
    await email.fill("asha@example.test");
    await expect(email).toHaveValue("asha@example.test");
    const access = page.getByRole("group", { name: "Account access" });
    await expect(
      access.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await expect(
      access.getByRole("button", { name: "Sign up", exact: true }),
    ).toBeVisible();
    await noHorizontalOverflow(page, "Narrow anonymous gate");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await attachMockScreenshot(page, info, "anonymous-393");
    requests.assertLocalOnly();
  });
});
