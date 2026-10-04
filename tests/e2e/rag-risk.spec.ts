import { expect, test } from "./app-fixture";
import AxeBuilder from "@axe-core/playwright";
import { analyzeClaim, addAiFindings } from "../../shared/engine";
import { sources } from "../../shared/content";
import type { ClaimAnalysis } from "../../shared/types";

const health = { aiAvailable: true, aiProvider: "gemini", aiConsentVersion: 1 };

for (const [language, title] of [
  ["en", "Not enough evidence"],
  ["hi", "पर्याप्त प्रमाण नहीं"],
  ["bn", "যথেষ্ট প্রমাণ নেই"],
]) {
  test(`${language}: an ordinary message never receives a safe verdict`, async ({
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
      route.fulfill({ json: { ...health, aiAvailable: false } }),
    );
    await page.goto("/check");
    await page.locator("#claim-text").fill("Never share your OTP with anyone.");
    await page.locator(".analyze-button").click();
    await expect(page.getByTestId("risk-assessment")).toHaveAttribute(
      "data-risk",
      "insufficient",
    );
    await expect(
      page.getByTestId("risk-assessment").getByRole("heading"),
    ).toHaveText(title);
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

test("distinct action warnings get a qualified strong tier and remain in saved checks", async ({
  page,
}) => {
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill("Send your OTP. Pay a release fee to unlock your funds.");
  await page.locator(".analyze-button").click();
  await expect(page.getByTestId("risk-assessment")).toHaveAttribute(
    "data-risk",
    "strong",
  );
  await expect(page.getByTestId("risk-assessment")).toContainText(
    "not proof of fraud",
  );
  await page.getByRole("button", { name: "Save to notebook" }).click();
  await page.goto("/saved");
  await expect(page.locator(".notebook-entry")).toContainText(
    "Strong scam indicators",
  );
  await page.locator(".notebook-entry").click();
  await expect(page.getByTestId("risk-assessment")).toHaveAttribute(
    "data-risk",
    "strong",
  );
});

test("grounded AI evidence is visible, labelled uncertain and survives a notebook reload", async ({
  page,
}) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: health }));
  await page.route("**/api/analyze", async (route) => {
    const { text, language } = route.request().postDataJSON();
    const analysis: ClaimAnalysis = addAiFindings(
      analyzeClaim(text, language),
      [{ category: "release-fee", excerpt: text }],
    );
    const cue = analysis.findings.find((f) => f.id === "release-fee")!;
    cue.origin = "ai";
    cue.evidenceIds = ["test-release-guidance"];
    const source = sources.find((s) => s.id === "rbi-kyc")!;
    analysis.retrieval = {
      method: "bm25",
      corpusVersion: "test-fixture",
      usedForAi: true,
      evidence: [
        {
          id: "test-release-guidance",
          sourceId: source.id,
          url: source.url,
          score: 1,
          categoryIds: ["release-fee"],
          reviewedAt: "2026-10-03",
          title: {
            en: "Fixture: payment pressure",
            hi: "नमूना: भुगतान का दबाव",
            bn: "নমুনা: টাকা দেওয়ার চাপ",
          },
          passage: {
            en: "Test fixture guidance: independently check requests for payment.",
            hi: "नमूने का मार्गदर्शन: भुगतान के अनुरोध की स्वतंत्र जाँच करें।",
            bn: "নমুনার নির্দেশনা: টাকা চাওয়ার বিষয় আলাদা করে যাচাই করুন।",
          },
        },
      ],
    };
    await route.fulfill({ json: { analysis } });
  });
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill("A clearance charge is needed before the balance can reach you.");
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-data-notice")).toContainText(
    "retrieves relevant passages",
  );
  await page.locator(".ai-options input").check();
  await page.locator(".analyze-button").click();
  await expect(page.getByTestId("risk-assessment")).toHaveAttribute(
    "data-risk",
    "potential",
  );
  await page.getByRole("tab", { name: "Evidence & gaps" }).click();
  await expect(page.locator(".retrieved-evidence")).toContainText(
    "Fixture: payment pressure",
  );
  await expect(page.locator(".retrieved-evidence")).toContainText(
    "do not verify this sender",
  );
  expect(
    (await new AxeBuilder({ page }).include(".analysis-result").analyze())
      .violations,
  ).toEqual([]);
  await page.getByRole("button", { name: "Save to notebook" }).click();
  await page.goto("/saved");
  await page.locator(".notebook-entry").click();
  await page.getByRole("tab", { name: "Evidence & gaps" }).click();
  await expect(page.locator(".retrieved-evidence")).toContainText(
    "Fixture: payment pressure",
  );
});

test("an empty online result cannot erase original on-device warnings", async ({
  page,
}) => {
  await page.route("**/api/health", (route) => route.fulfill({ json: health }));
  await page.route("**/api/analyze", (route) =>
    route.fulfill({
      json: {
        analysis: analyzeClaim(
          "A plain financial message with no supported warning.",
        ),
      },
    }),
  );
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill("Send your OTP. Pay a release fee to unlock your funds.");
  await page.locator(".ai-options summary").click();
  await page.locator(".ai-options input").check();
  await page.locator(".analyze-button").click();
  await expect(page.getByTestId("risk-assessment")).toHaveAttribute(
    "data-risk",
    "strong",
  );
  await expect(
    page.getByRole("heading", { name: /A request for account access/ }),
  ).toBeVisible();
});
