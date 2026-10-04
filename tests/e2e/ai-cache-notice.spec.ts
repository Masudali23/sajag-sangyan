import { test, expect } from "./app-fixture";
import AxeBuilder from "@axe-core/playwright";

for (const language of ["en", "hi", "bn"] as const) {
  test(`${language} AI notice and privacy disclose text-free reuse, including quota downtime`, async ({
    page,
  }) => {
    let available = true;
    let provider = "gemini";
    const analysisCalls: string[] = [];
    await page.route("**/api/health", (route) =>
      route.fulfill({
        json: {
          aiAvailable: available,
          aiProvider: provider,
          aiConsentVersion: 1,
        },
      }),
    );
    await page.route("**/api/analyze", (route) => {
      analysisCalls.push(route.request().url());
      return route.abort();
    });
    const parts = {
      en: ["up to 6 hours", "memory only", "does not keep the message text"],
      hi: ["6 घंटे तक", "केवल अस्थायी मेमोरी", "संदेश का पाठ नहीं रखता"],
      bn: [
        "৬ ঘণ্টা পর্যন্ত",
        "শুধু অস্থায়ী মেমোরি",
        "বার্তার লেখা এতে রাখা হয় না",
      ],
    }[language];
    await page.goto("/check");
    await page.locator(".language-control select").selectOption(language);
    await page.locator(".ai-options summary").click();
    const notice = page.getByTestId("ai-cache-notice");
    for (const part of parts) await expect(notice).toContainText(part);
    const consent = page.locator('.ai-options input[type="checkbox"]');
    await expect(consent).toBeEnabled();
    await expect(consent).not.toBeChecked();
    await expect(page.locator(".ai-data-notice")).toContainText(
      "Google Gemini",
    );
    expect(
      (await new AxeBuilder({ page }).include(".ai-options").analyze())
        .violations,
    ).toEqual([]);
    // Privacy stays truthful even if the server cannot currently offer AI.
    for (const state of ["available", "unavailable", "openai"] as const) {
      available = state !== "unavailable";
      provider = state === "openai" ? "openai" : "gemini";
      await page.goto("/sources");
      for (const part of parts) await expect(notice).toContainText(part);
      if (state === "openai")
        await expect(page.locator(".ai-data-notice")).toContainText("OpenAI");
    }
    expect(analysisCalls).toEqual([]);
  });
}
