import { expect, test } from "./app-fixture";
import AxeBuilder from "@axe-core/playwright";

for (const [language, show, hide] of [
  ["en", "Show original wording", "Hide offensive words"],
  ["hi", "मूल शब्द दिखाएँ", "अपशब्द छिपाएँ"],
  ["bn", "মূল শব্দ দেখুন", "আপত্তিকর শব্দ আড়াল করুন"],
]) {
  test(`${language}: offensive quotations require deliberate reveal, with personal data still masked`, async ({
    page,
  }) => {
    await page.addInitScript(
      (language) =>
        localStorage.setItem(
          "sajag-preferences",
          JSON.stringify({ language, lowData: false, largeText: false }),
        ),
      language,
    );
    await page.route("**/api/health", (route) =>
      route.fulfill({
        json: { aiAvailable: false, aiProvider: null, aiConsentVersion: 1 },
      }),
    );
    await page.goto("/check");
    await page
      .locator("#claim-text")
      .fill(
        "You fucking bastard, pay the money or I will leak your photos. Contact private@example.com.",
      );
    await page.locator(".analyze-button").click();
    const message = page.locator(".original-message");
    await expect(message.locator("blockquote")).not.toContainText(
      /fucking|bastard|private@example.com/,
    );
    await expect(
      message.getByRole("button", { name: show, exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await message.getByRole("button", { name: show, exact: true }).click();
    await expect(message.locator("blockquote")).toContainText(
      "fucking bastard",
    );
    await expect(message.locator("blockquote")).not.toContainText(
      "private@example.com",
    );
    await message.getByRole("button", { name: hide, exact: true }).click();
    await expect(message.locator("blockquote")).not.toContainText(
      /fucking|bastard/,
    );
    for (const quote of await page.locator(".finding blockquote").all())
      await expect(quote).not.toContainText(/fucking|bastard/);
    expect(
      (await new AxeBuilder({ page }).include(".analysis-result").analyze())
        .violations,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
