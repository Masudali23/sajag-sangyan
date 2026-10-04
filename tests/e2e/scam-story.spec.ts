import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { signInForApp } from "./auth-fixture";

test("a scam story teaches both replies, ends with a summary and can be replayed", async ({
  page,
}) => {
  await signInForApp(page);
  await page.goto("/simulate");
  await expect(
    page.getByRole("heading", { level: 1, name: "See how a scam unfolds" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /The “digital arrest” call/ }).click();
  await expect(page).toHaveURL(/story=digital-arrest/);
  await expect(page.getByText("Fictional practice")).toBeVisible();
  await expect(page.getByText(/This is TRAI\./)).toBeVisible();

  // A risky reply explains the trick and shows the safer reply, without shaming.
  await page.getByRole("button", { name: "Press 9 to sort it out" }).click();
  await expect(
    page.getByRole("heading", { name: "That is what the scammer wants." }),
  ).toBeVisible();
  await expect(page.getByText("A safer reply:")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).analyze()).violations,
    "feedback state",
  ).toEqual([]);
  await page.getByRole("button", { name: "Next message" }).click();

  // A safe reply is confirmed and the story still continues.
  await page
    .getByRole("button", { name: "End the video call and tell my family" })
    .click();
  await expect(page.getByRole("heading", { name: "Good call." })).toBeVisible();
  await page.getByRole("button", { name: "Next message" }).click();
  await page
    .getByRole("button", { name: "Call a family member right now" })
    .click();
  await page.getByRole("button", { name: "Next message" }).click();
  await page
    .getByRole("button", { name: "Refuse, hang up and report at 1930" })
    .click();
  await page.getByRole("button", { name: "See what you learned" }).click();
  await expect(
    page.getByRole("heading", {
      name: "You chose the safe reply at 3 of 4 steps.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText("Report at 1930 or cybercrime.gov.in."),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "summary overflow",
  ).toBe(true);

  // Replay starts fresh; switching stories keeps no stale answers.
  await page.getByRole("button", { name: "Replay" }).click();
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await page.getByRole("button", { name: "All stories" }).click();
  await page.getByRole("button", { name: /The cashback QR code/ }).click();
  await expect(page.getByText("Step 1 of 3")).toBeVisible();
  await expect(page.locator(".story-bubble.from-you")).toHaveCount(0);

  // The conclusion links to the matching lesson.
  await page.getByRole("button", { name: "Okay, send me the QR code" }).click();
  await page.getByRole("button", { name: "Next message" }).click();
  await page
    .getByRole("button", { name: "Don’t enter my PIN, and block the sender" })
    .click();
  await page.getByRole("button", { name: "Next message" }).click();
  await page
    .getByRole("button", { name: "Scan again to get my refund" })
    .click();
  await page.getByRole("button", { name: "See what you learned" }).click();
  await page.getByRole("link", { name: "Read the lesson" }).click();
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your UPI PIN sends money. It never receives it.",
    }),
  ).toBeVisible();
});

test("the money simulator stays one tap away and lessons can be filtered", async ({
  page,
}) => {
  await signInForApp(page);
  await page.goto("/simulate");
  await page.getByRole("link", { name: /Money scenarios/ }).click();
  await expect(page).toHaveURL(/mode=money/);
  await page.getByRole("button", { name: "Run this scenario" }).click();
  await expect(page.locator(".token-total")).toContainText("8,000");

  await page.goto("/learn");
  await expect(page.getByText(/15 lessons · Available offline/)).toBeVisible();
  await page.getByRole("button", { name: /Spot the scam/ }).click();
  await expect(page.locator(".lesson-card")).toHaveCount(8);
  await page.getByRole("button", { name: /Money basics/ }).click();
  await expect(page.locator(".lesson-card")).toHaveCount(7);
  await page.getByRole("button", { name: /All lessons/ }).click();
  await expect(page.locator(".lesson-card")).toHaveCount(15);

  // A scam lesson links straight to its story.
  await page.goto("/learn/digital-arrest");
  await page.getByRole("link", { name: "Walk through this scam" }).click();
  await expect(page).toHaveURL(/story=digital-arrest/);
});
