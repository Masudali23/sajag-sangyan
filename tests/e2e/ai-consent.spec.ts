import { test, expect } from "./app-fixture";
import { analyzeClaim } from "../../shared/engine";

const health = { aiAvailable: true, aiProvider: "gemini", aiConsentVersion: 1 };

test("Gemini disclosure precedes opt-in and only masked text goes to the consented provider", async ({
  page,
}) => {
  let posts = 0;
  await page.route("**/api/health", (route) => route.fulfill({ json: health }));
  await page.route("**/api/analyze", async (route) => {
    posts++;
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      consent: true,
      consentProvider: "gemini",
      useAI: true,
    });
    expect(body.text).not.toContain("private@example.com");
    await route.fulfill({ json: { analysis: analyzeClaim(body.text) } });
  });
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill("Guaranteed daily returns. Contact private@example.com for access.");
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-options")).toContainText("human reviewers");
  await expect(page.locator(".ai-options")).toContainText("masking can miss");
  expect(posts).toBe(0);
  await page.locator(".ai-options input").check();
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.locator(".analysis-result")).toBeVisible();
  expect(posts).toBe(1);
  await page.getByRole("button", { name: "Check another message" }).click();
  await page
    .locator("#claim-text")
    .fill("A different message with guaranteed daily returns.");
  await expect(page.locator(".ai-options input")).not.toBeChecked();
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.locator(".analysis-result")).toBeVisible();
  expect(posts).toBe(1);
});

test("old or unknown AI health leaves text on the device", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  // A named provider without the server consent-binding contract is insufficient.
  await page.route("**/api/health", (route) =>
    route.fulfill({ json: { aiAvailable: true, aiProvider: "gemini" } }),
  );
  await page.goto("/check");
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-options input")).toBeDisabled();
  await expect(page.locator(".ai-options")).toContainText(
    "could not be confirmed",
  );
  await page
    .locator("#claim-text")
    .fill("Guaranteed daily returns. Join today.");
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.locator(".analysis-result")).toBeVisible();
  expect(posts).toEqual([]);
});

test("a changed provider clears consent before any message is sent", async ({
  page,
}) => {
  let reads = 0;
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.route("**/api/health", (route) =>
    route.fulfill({
      json: { ...health, aiProvider: ++reads === 1 ? "openai" : "gemini" },
    }),
  );
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill("Guaranteed daily returns. Join today.");
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-options")).toContainText("OpenAI");
  await page.locator(".ai-options input").check();
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.locator(".analysis-result")).toBeVisible();
  expect(posts).toEqual([]);
});

test("privacy and sources disclose Gemini data use in English and Hindi", async ({
  page,
}) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: health }));
  for (const path of ["/settings", "/sources"]) {
    await page.goto(path);
    await expect(page.locator(".ai-data-notice")).toContainText(
      "Google Gemini",
    );
    await page.getByLabel("Choose language").selectOption("hi");
    await expect(page.locator(".ai-data-notice")).toContainText(
      "मानवीय समीक्षक",
    );
    await page.getByLabel("भाषा चुनें").selectOption("en");
  }
});

test("offline provider lookup cannot enable AI consent", async ({ page }) => {
  await page.route("**/api/health", (route) =>
    route.abort("internetdisconnected"),
  );
  await page.goto("/check");
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-options")).toContainText(
    "could not be confirmed",
  );
  await expect(page.locator(".ai-options input")).toBeDisabled();
});
