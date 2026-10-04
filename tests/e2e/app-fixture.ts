import { test as base } from "@playwright/test";
import { signInForApp } from "./auth-fixture";

// Seed only this test's ordinary page. The production sign-in guard still checks
// Supabase getUser; the test intercepts that network response instead of adding
// an anonymous mode or sending a real sign-in email.
export const test = base.extend({
  page: async ({ page }, use) => {
    await signInForApp(page);
    await use(page);
  },
});
export { expect } from "@playwright/test";
