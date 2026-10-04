import { test, expect } from "./app-fixture";
import { readTestNotebook } from "./auth-fixture";
import { analyzeClaim, addAiFindings } from "../../shared/engine";

test("analysis and reset move focus; result tabs support keyboard and quoted language", async ({
  page,
}) => {
  await page.goto("/check");
  await page
    .getByLabel("Paste or write a message")
    .fill("हर महीने ८% पक्का मुनाफा मिलेगा। अभी निवेश करें।");
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(
    page.getByRole("heading", {
      name: /(?:Strong|Potential) scam indicators/,
    }),
  ).toBeFocused();
  await expect(page.locator(".original-message blockquote")).toHaveAttribute(
    "lang",
    "hi",
  );
  await expect(page.locator(".finding blockquote").first()).toHaveAttribute(
    "lang",
    "hi",
  );
  const first = page.getByRole("tab", { name: /What to notice/ });
  const second = page.getByRole("tab", { name: "Evidence & gaps" });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute("aria-selected", "true");
  await expect(first).toHaveAttribute("tabindex", "-1");
  await expect(page.getByRole("tabpanel")).toHaveAttribute(
    "aria-labelledby",
    (await second.getAttribute("id"))!,
  );
  await page.keyboard.press("Home");
  await expect(first).toBeFocused();
  await page.keyboard.press("End");
  await expect(second).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(first).toBeFocused();
  await page.getByRole("button", { name: "Check another message" }).click();
  await expect(page.getByLabel("Paste or write a message")).toBeFocused();
});

test("consented AI cues are visibly labelled and low-data mode prevents the request", async ({
  page,
}) => {
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: {
        aiAvailable: true,
        aiProvider: "openai",
        aiConsentVersion: 1,
      },
    }),
  );
  const novel =
    "A clearance charge is needed before the balance can reach you.";
  const analysis = addAiFindings(analyzeClaim(novel), [
    { category: "release-fee", excerpt: novel },
  ]);
  const posts: string[] = [];
  await page.route("**/api/analyze", async (route) => {
    posts.push(route.request().postData() || "");
    await route.fulfill({ json: { analysis } });
  });
  await page.goto("/check");
  await page.getByLabel("Paste or write a message").fill(novel);
  await page.locator(".ai-options summary").click();
  await page.locator(".ai-options input").check();
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(
    page.getByText("AI-noticed · may be wrong", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Choose language").selectOption("hi");
  await expect(
    page.getByText("AI ने देखा · गलत हो सकता है", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByLabel("भाषा चुनें").selectOption("en");
  expect(JSON.parse(posts[0])).toMatchObject({ useAI: true, consent: true });
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Low-data mode" }).click();
  await page.goto("/check");
  await page.getByLabel("Paste or write a message").fill(novel);
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-options input")).toBeDisabled();
  await page.getByRole("button", { name: "Check this message" }).click();
  expect(posts).toHaveLength(1);
});

test("complete claim → evidence → lesson → simulator → notebook journey", async ({
  page,
}) => {
  await page.goto("/check");
  await page
    .getByRole("button", { name: /The “guaranteed returns” forward/ })
    .click();
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(
    page.getByRole("heading", {
      name: /(?:Strong|Potential) scam indicators/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A promise that needs evidence" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Evidence & gaps" }).click();
  await expect(
    page.getByText("Specific claim: not independently verified", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save to notebook" }).click();
  await expect(
    page.getByRole("button", { name: "Saved", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Risk is part of the story/ }).click();
  await page
    .getByRole("radio", { name: /Ask for independent evidence/ })
    .check();
  await page.getByRole("button", { name: "Check my understanding" }).click();
  await expect(
    page.getByText("That’s it. A little wiser already."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Try the simulator" }).click();
  await page.getByRole("button", { name: "Run this scenario" }).click();
  await expect(page.locator(".token-total")).toContainText("8,000");
  await expect(
    page.getByText(/25.0% rise from the remaining amount/),
  ).toBeVisible();
  await page.goto("/saved");
  await expect(page.locator(".notebook-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: /Delete saved check/ }).click();
  await page.getByRole("button", { name: "Remove check", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A fresh page. A good place to start." }),
  ).toBeVisible();
});
test("Hindi check and no automatic claim persistence", async ({ page }) => {
  await page.goto("/check");
  await page.getByLabel("Choose language").selectOption("hi");
  await expect(
    page.getByRole("heading", { name: "संदेश को समझें" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /“गारंटीड रिटर्न” वाला संदेश/ })
    .click();
  await page.getByRole("button", { name: "संदेश जाँचें" }).click();
  await expect(
    page.getByRole("heading", {
      name: /धोखाधड़ी के (?:प्रबल|संभावित) संकेत/,
    }),
  ).toBeVisible();
  expect((await readTestNotebook(page)).saved.length).toBe(0);
});
test("local checks never post the input to an API", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/check");
  await page
    .getByLabel("Paste or write a message")
    .fill("My account number: 12345678901. Guaranteed daily returns!");
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.locator(".original-message")).not.toContainText(
    "12345678901",
  );
  expect(posts).toEqual([]);
});
test("URLs and short text receive a useful validation message", async ({
  page,
}) => {
  await page.goto("/check");
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.getByRole("alert")).toContainText("at least 12 characters");
  await page
    .getByLabel("Paste or write a message")
    .fill("https://example.com/claim");
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "does not open or verify links",
  );
});
test("borrowed exposure can show remaining debt", async ({ page }) => {
  await page.goto("/simulate?mode=money");
  await page.getByRole("button", { name: /The weight of borrowing/ }).click();
  await page.getByLabel("Fictional change in asset value").fill("-80");
  await page.getByLabel("Exposure compared with your tokens").fill("3");
  await page.getByRole("button", { name: "Run this scenario" }).click();
  await expect(page.locator(".token-total")).toContainText("-14,000");
  await expect(page.getByText(/14,000 tokens of debt remain/)).toBeVisible();
});
test("offline shell supports fresh navigation and local checks", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page.goto("/check");
  await page
    .getByLabel("Paste or write a message")
    .fill("Guaranteed daily returns. Join our VIP group now!");
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(
    page.getByRole("heading", {
      name: /(?:Strong|Potential) scam indicators/,
    }),
  ).toBeVisible();
  await page.goto("/learn/nav");
  await expect(
    page.getByRole("heading", { name: "NAV, without the jargon" }),
  ).toBeVisible();
  await context.setOffline(false);
});
test("main routes fit the viewport without horizontal scrolling", async ({
  page,
}, testInfo) => {
  for (const route of [
    "/",
    "/check",
    "/learn",
    "/simulate",
    "/saved",
    "/settings",
    "/sources",
    "/help",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      `${route} overflow`,
    ).toBe(true);
  }
  await page.goto("/");
  await page.screenshot({
    path: `artifacts/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
});
test("preferences survive reload and larger text remains usable", async ({
  page,
}) => {
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Larger text" }).click();
  await page.getByRole("switch", { name: "Low-data mode" }).click();
  await page.reload();
  await expect(page.getByRole("switch", { name: "Larger text" })).toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Low-data mode" }),
  ).toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
});
