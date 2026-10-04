import { test, expect } from "@playwright/test";
import { codeSignIn, mockAccount } from "./auth-fixture";

async function back(page: import("@playwright/test").Page) {
  return page.evaluate(
    () =>
      !window.dispatchEvent(
        new Event("sajag:native-back", { cancelable: true }),
      ),
  );
}

test("Android Back from each bottom section returns Home; Home allows exit", async ({
  page,
}) => {
  await mockAccount(page);
  await codeSignIn(page);
  for (const route of [
    "/check",
    "/learn",
    "/simulate",
    "/saved",
    "/learn/risk",
  ]) {
    await page.goto(route);
    await expect(page.locator(".main-content")).toBeVisible();
    expect(await back(page)).toBe(true);
    await expect(page).toHaveURL(/\/$/);
    expect(await back(page)).toBe(false);
  }
});

test("Android Back closes a modal without leaving its screen", async ({
  page,
}) => {
  await mockAccount(page);
  await codeSignIn(page);
  await page.getByRole("button", { name: "Delete cloud notebook" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page).toHaveURL(/\/settings$/);
  expect(await back(page)).toBe(true);
  await expect(page).toHaveURL(/\/$/);
});

test("Back on a protected deep link returns Home but does not bypass sign-in", async ({
  page,
}) => {
  await mockAccount(page);
  await page.goto("/saved");
  await expect(page.getByLabel("Your email", { exact: true })).toBeVisible();
  expect(await back(page)).toBe(true);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByLabel("Your email", { exact: true })).toBeVisible();
  await expect(page.locator(".notebook-card")).toHaveCount(0);
});
