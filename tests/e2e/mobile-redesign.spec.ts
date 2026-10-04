import { test, expect } from "./app-fixture";
import { readTestNotebook } from "./auth-fixture";

test("phone check exposes its primary action and respects native safe areas", async ({
  page,
}) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/check");
  await page.locator("#claim-text").waitFor();
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--safe-area-inset-top", "28px");
    document.documentElement.style.setProperty(
      "--safe-area-inset-bottom",
      "24px",
    );
  });
  const action = await page
    .getByRole("button", { name: "Check this message" })
    .boundingBox();
  const nav = await page
    .getByRole("navigation", { name: "Mobile navigation" })
    .boundingBox();
  expect(action && nav && action.y + action.height < nav.y).toBeTruthy();
  expect(
    await page
      .locator(".topbar")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingTop)),
  ).toBe(28);
  expect(
    await page
      .locator(".mobile-nav")
      .evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom)),
  ).toBe(31);
});

test("card reminder offers an independent check and Hindi explanation without authenticating it", async ({
  page,
}) => {
  await page.goto("/check");
  const reminder =
    "प्रिय कार्डधारक, आपका क्रेडिट कार्ड बिल तैयार है। बिल और भुगतान तारीख देखने के लिए इस लिंक पर जाएँ। ".repeat(
      3,
    );
  await page.locator("#claim-text").fill(reminder);
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.locator(".payment-context")).toContainText(
    "Open your card issuer’s app yourself",
  );
  await expect(page.locator(".payment-context")).toContainText(
    "remain unverified",
  );
  await expect(page.locator(".result-side")).not.toContainText(
    "Experience a fictional loss",
  );
  await expect(page.locator(".no-findings")).toContainText(
    "does not establish",
  );
  const quote = page.locator(".original-message blockquote");
  await expect(quote).toHaveClass(/quote-preview/);
  await page.getByRole("button", { name: "Read full message" }).click();
  await expect(quote).not.toHaveClass(/quote-preview/);
  await expect(quote).toHaveText(reminder.trim());
  await page.getByRole("button", { name: "हिन्दी में समझें" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "hi");
  await expect(page.locator(".payment-context")).toContainText(
    "सत्यापन नहीं हुआ",
  );
  expect((await readTestNotebook(page)).saved.length).toBe(0);
});

test("a card-bill mention never hides a credential warning", async ({
  page,
}) => {
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill(
      "Your credit card bill is ready. Share your OTP with our agent to complete payment.",
    );
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.locator(".payment-context")).toBeVisible();
  await expect(page.locator(".finding").first()).toBeVisible();
  await expect(page.locator(".result-banner")).toHaveClass(/attention/);
});

test("voice starts only after consent and produces editable unsent text", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      SpeechRecognition: unknown;
      voiceStarts: number;
    };
    state.voiceStarts = 0;
    state.SpeechRecognition = class {
      onstart?: () => void;
      onresult?: (event: unknown) => void;
      start() {
        state.voiceStarts++;
        this.onstart?.();
        setTimeout(
          () =>
            this.onresult?.({
              results: [[{ transcript: "A fictional message for checking" }]],
            }),
          50,
        );
      }
      abort() {}
    };
  });
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto("/check");
  await page.getByRole("button", { name: "Speak it" }).click();
  expect(
    await page.evaluate(
      () => (window as unknown as { voiceStarts: number }).voiceStarts,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Allow voice input and start" })
    .click();
  await expect(page.locator("#claim-text")).toHaveValue(
    "A fictional message for checking",
  );
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".analysis-result")).toHaveCount(0);
  expect(posts).toEqual([]);
});

test("blocked microphone stays in the voice dialog with recovery instructions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition =
      class {
        onerror?: (event: { error: string }) => void;
        start() {
          setTimeout(() => this.onerror?.({ error: "not-allowed" }), 20);
        }
        abort() {}
      };
  });
  await page.goto("/check");
  await page.getByRole("button", { name: "Speak it" }).click();
  await page
    .getByRole("button", { name: "Allow voice input and start" })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Microphone access is blocked",
  );
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Permissions",
  );
  await expect(page.locator("#claim-text")).toHaveValue("");
});

test("voice dialog returns keyboard focus to its opener", async ({ page }) => {
  await page.goto("/check");
  const microphone = page.getByRole("button", { name: "Speak it" });
  await microphone.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(microphone).toBeFocused();
});

test("saved checks validate after reload without triggering CSP eval probes", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { cspViolations: string[] };
    state.cspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) =>
      state.cspViolations.push(event.blockedURI),
    );
  });
  await page.goto("/check");
  await page
    .locator("#claim-text")
    .fill("Guaranteed daily returns. Join our VIP group now!");
  await page.getByRole("button", { name: "Check this message" }).click();
  await page.getByRole("button", { name: "Save to notebook" }).click();
  await page.goto("/saved");
  await page.reload();
  await expect(page.locator(".notebook-card")).toHaveCount(1);
  expect(
    await page.evaluate(
      () => (window as unknown as { cspViolations: string[] }).cspViolations,
    ),
  ).toEqual([]);
});
