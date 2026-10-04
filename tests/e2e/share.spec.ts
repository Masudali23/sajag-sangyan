import { test, expect } from "./app-fixture";
import { chromium, type Page } from "@playwright/test";
import { mockAccount, signInForApp } from "./auth-fixture";
import { mkdir, readdir, open, access } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const field = (page: Page) => page.locator("#claim-text");

async function controlled(page: Page) {
  await page.goto("/check");
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
}

// A real multipart navigation exercises the browser/SW path. Remove the sender
// fixture immediately so it cannot create an unrelated saved form-state leak.
async function share(
  page: Page,
  values: Record<string, string>,
  fileField = false,
) {
  const navigation = page.waitForEvent("framenavigated", {
    predicate: (frame) => frame === page.mainFrame(),
  });
  await page.evaluate(
    ({ values, fileField }) => {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/share-target";
      form.enctype = "multipart/form-data";
      form.acceptCharset = "UTF-8";
      form.autocomplete = "off";
      for (const [name, value] of Object.entries(values)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = name;
        input.value = value;
        form.append(input);
      }
      if (fileField) {
        const input = document.createElement("input");
        input.type = "file";
        input.name = "text";
        const transfer = new DataTransfer();
        transfer.items.add(
          new File(["attachment content"], "not-a-claim.txt", {
            type: "text/plain",
          }),
        );
        input.files = transfer.files;
        form.append(input);
      }
      document.body.append(form);
      form.submit();
      form.remove();
    },
    { values, fileField },
  );
  await navigation;
  await expect(page).toHaveURL(/\/check$/);
  await expect(field(page)).toBeVisible();
}

async function takeAgain(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ status: string; message?: unknown }>((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(() => {
          channel.port1.close();
          resolve({ status: "timeout" });
        }, 2000);
        channel.port1.onmessage = (event) => {
          clearTimeout(timer);
          channel.port1.close();
          resolve(event.data);
        };
        navigator.serviceWorker.controller!.postMessage(
          {
            type: "SAJAG_TAKE_SHARE",
            version: 1,
            clientId: "cannot-select-another-client",
          },
          [channel.port2],
        );
      }),
  );
}

async function gateIncomingHandoff(page: Page) {
  await page.addInitScript(() => {
    const original = ServiceWorker.prototype.postMessage;
    ServiceWorker.prototype.postMessage = function (
      message: unknown,
      options?: Transferable[] | StructuredSerializeOptions,
    ) {
      if ((message as { type?: string })?.type === "SAJAG_TAKE_SHARE") {
        (window as unknown as { releaseShare: () => void }).releaseShare = () =>
          Reflect.apply(original, this, [message, options]);
        return;
      }
      return Reflect.apply(original, this, [message, options]);
    };
  });
}

async function releaseHandoff(page: Page) {
  await page.evaluate(() =>
    (window as unknown as { releaseShare: () => void }).releaseShare(),
  );
}

test("POST share stays literal, local, one-use and waits for analysis consent", async ({
  page,
  context,
}) => {
  await controlled(page);
  const manifest = await (
    await page.request.get("/manifest.webmanifest")
  ).json();
  expect(manifest.share_target).toMatchObject({
    action: "/share-target",
    method: "POST",
    enctype: "multipart/form-data",
    params: { text: "text", url: "url", title: "title" },
  });
  const marker = "share-post-sentinel";
  const message = `${marker}: हर महीने 8% पक्का मुनाफा। <script>window.evil=1</script>`;
  const networkLeaks: string[] = [];
  const analysisCalls: string[] = [];
  await context.route("**/*", async (route) => {
    const request = route.request();
    if (request.url().includes(marker) || request.postData()?.includes(marker))
      networkLeaks.push(request.url());
    await route.continue();
  });
  page.on("request", (request) => {
    if (request.url().includes("/api/analyze"))
      analysisCalls.push(request.url());
  });
  await share(page, { text: message, title: "A shared forward" });
  await expect(field(page)).toHaveValue(message + "\n\nA shared forward");
  await expect(
    page.getByRole("status").filter({ hasText: "Shared message ready" }),
  ).toBeVisible();
  expect(await field(page).getAttribute("autocomplete")).toBe("off");
  expect(await page.evaluate(() => "evil" in window)).toBe(false);
  await expect(page.locator(".original-message")).toHaveCount(0);
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-options input")).not.toBeChecked();
  expect(analysisCalls).toEqual([]);
  expect(networkLeaks).toEqual([]);
  expect(await takeAgain(page)).toMatchObject({ status: "unavailable" });
  const stored = await page.evaluate(async () => ({
    local: { ...localStorage },
    session: { ...sessionStorage },
    state: history.state,
    caches: (
      await Promise.all(
        (await caches.keys()).map(async (key) =>
          (await (await caches.open(key)).keys()).map((request) => request.url),
        ),
      )
    ).flat(),
  }));
  expect(JSON.stringify(stored)).not.toContain(marker);
  expect(
    stored.caches.some((url) =>
      new URL(url).pathname.split("/").some((part) => part.startsWith(".")),
    ),
  ).toBe(false);
  await page.reload();
  await expect(field(page)).toHaveValue("");
});

test("long Hindi POST works offline and truncates without splitting an emoji", async ({
  page,
  context,
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
  await controlled(page);
  await page.locator(".ai-options summary").click();
  await page.locator(".ai-options input").check();
  await context.setOffline(true);
  const text = "अ".repeat(5999) + "😀" + "अ".repeat(400);
  await share(page, { text });
  await expect(field(page)).toHaveValue("अ".repeat(5999));
  await expect(
    page.getByRole("status").filter({ hasText: "Shared message ready" }),
  ).toContainText("first 6,000 characters");
  await page.locator(".ai-options summary").click();
  await expect(page.locator(".ai-options input")).not.toBeChecked();
  await context.setOffline(false);
});

test("shared links are text, while empty/attachment shares and legacy browser GET do not prefill", async ({
  page,
  context,
}) => {
  await controlled(page);
  const external: string[] = [];
  await context.route("https://untrusted.invalid/**", async (route) => {
    external.push(route.request().url());
    await route.abort();
  });
  await share(page, { url: "https://untrusted.invalid/offer" });
  await expect(field(page)).toHaveValue("https://untrusted.invalid/offer");
  await page.getByRole("button", { name: "Check this message" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "does not open or verify links",
  );
  expect(external).toEqual([]);
  await share(page, { text: "  \0  " });
  await expect(field(page)).toHaveValue("");
  await expect(
    page.getByRole("status").filter({ hasText: "Shared message ready" }),
  ).toHaveCount(0);
  await share(page, {}, true);
  await expect(field(page)).toHaveValue("");
  await page.goto("/check?text=legacy-browser-query-must-not-prefill");
  await expect(page).toHaveURL(/\/check$/);
  await expect(field(page)).toHaveValue("");
});

test("concurrent shares are isolated by navigation client", async ({
  page,
  context,
}) => {
  await controlled(page);
  const other = await context.newPage();
  // Same browser context: the first tab's session is shared, so this tab only
  // needs its own mocked account responses, not a second sign-in.
  await mockAccount(other);
  await controlled(other);
  await Promise.all([
    share(page, { text: "FIRST tab claim: guaranteed 9% monthly" }),
    share(other, { text: "SECOND tab claim: guaranteed 4% weekly" }),
  ]);
  await expect(field(page)).toHaveValue(
    "FIRST tab claim: guaranteed 9% monthly",
  );
  await expect(field(other)).toHaveValue(
    "SECOND tab claim: guaranteed 4% weekly",
  );
  expect(await takeAgain(page)).toMatchObject({ status: "unavailable" });
  expect(await takeAgain(other)).toMatchObject({ status: "unavailable" });
});

test("an unrelated tab cannot take a waiting share, and expiry fails closed", async ({
  page,
  context,
}) => {
  await controlled(page);
  const other = await context.newPage();
  // Same browser context: the first tab's session is shared, so this tab only
  // needs its own mocked account responses, not a second sign-in.
  await mockAccount(other);
  await controlled(other);
  await gateIncomingHandoff(page);
  await share(page, { text: "Bound to this receiving client only" });
  await page.waitForFunction(() => "releaseShare" in window);
  expect(await takeAgain(other)).toMatchObject({ status: "unavailable" });
  await releaseHandoff(page);
  await expect(field(page)).toHaveValue("Bound to this receiving client only");

  await share(page, { text: "This waiting share must expire" });
  await page.waitForFunction(() => "releaseShare" in window);
  const worker = context.serviceWorkers()[0];
  await worker.evaluate(() => {
    const original = Date.now;
    (
      globalThis as unknown as { originalClock: typeof Date.now }
    ).originalClock = original;
    Date.now = () => original() + 31_000;
  });
  try {
    await releaseHandoff(page);
    await expect(
      page
        .getByRole("status")
        .filter({ hasText: /could not|couldn.t|unavailable|receive/i }),
    ).toBeVisible();
    await expect(field(page)).toHaveValue("");
  } finally {
    await worker.evaluate(() => {
      Date.now = (
        globalThis as unknown as { originalClock: typeof Date.now }
      ).originalClock;
    });
  }
});

test("worker termination loses pending text safely", async ({
  page,
  context,
}) => {
  await controlled(page);
  await gateIncomingHandoff(page);
  await share(page, {
    text: "Ephemeral pending message must not survive worker termination",
  });
  await page.waitForFunction(() => "releaseShare" in window);
  const cdp = await context.newCDPSession(page);
  await cdp.send("ServiceWorker.enable");
  await cdp.send("ServiceWorker.stopAllWorkers");
  await releaseHandoff(page);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /could not|couldn.t|unavailable|receive/i }),
  ).toBeVisible();
  await expect(field(page)).toHaveValue("");
  await cdp.detach();
});

test("oversized bodies and missing workers are discarded with no-store fallback", async ({
  page,
  browser,
  baseURL,
}) => {
  await controlled(page);
  await share(page, { text: "x".repeat(100 * 1024) });
  await expect(field(page)).toHaveValue("");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: /could not|couldn.t|unavailable|receive/i }),
  ).toBeVisible();
  const bare = await browser.newContext({ baseURL, serviceWorkers: "block" });
  try {
    const cold = await bare.newPage();
    await signInForApp(cold);
    await cold.goto("/check");
    await share(cold, { text: "Discarded missing-worker claim" });
    await expect(field(cold)).toHaveValue("");
    await expect(
      cold
        .getByRole("status")
        .filter({ hasText: /could not|couldn.t|unavailable|receive/i }),
    ).toBeVisible();
    const html = await cold.request.get("/check");
    expect(html.headers()["cache-control"]).toContain("no-store");
    const fallback = await cold.request.post("/share-target", {
      multipart: { text: "do not parse or reflect" },
      maxRedirects: 0,
    });
    expect(fallback.status()).toBe(303);
    expect(fallback.headers().location).toBe("/check?shared=unavailable");
    expect(fallback.headers()["cache-control"]).toContain("no-store");
  } finally {
    await bare.close();
  }
});

async function scanProfile(directory: string, marker: string) {
  const needles = [Buffer.from(marker, "utf8"), Buffer.from(marker, "utf16le")];
  const overlap = Math.max(...needles.map((needle) => needle.length)) - 1;
  const matches: string[] = [];
  let scannedFiles = 0;
  let scannedBytes = 0;
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const filename = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(filename);
        continue;
      }
      if (!entry.isFile()) continue;
      const handle = await open(filename, "r");
      scannedFiles++;
      let tail = Buffer.alloc(0);
      try {
        const buffer = Buffer.alloc(128 * 1024);
        while (true) {
          const { bytesRead } = await handle.read(buffer);
          if (!bytesRead) break;
          scannedBytes += bytesRead;
          const joined = Buffer.concat([tail, buffer.subarray(0, bytesRead)]);
          if (needles.some((needle) => joined.includes(needle))) {
            matches.push(path.relative(directory, filename));
            break;
          }
          tail = Buffer.from(
            joined.subarray(Math.max(0, joined.length - overlap)),
          );
        }
      } finally {
        await handle.close();
      }
    }
  }
  await walk(directory);
  return { matches, scannedFiles, scannedBytes };
}

function sqliteMatches(filename: string, query: string, marker: string) {
  const database = new DatabaseSync(filename, { readOnly: true });
  try {
    return database.prepare(query).all(marker, marker);
  } finally {
    database.close();
  }
}

for (const hasWorker of [true, false]) {
  test(`${hasWorker ? "controlled POST" : "missing-worker fallback"} leaves no UTF8/UTF16 sentinel in a closed persistent Chromium profile`, async ({
    baseURL,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "One durable desktop Chromium profile check covers the shared browser implementation.",
    );
    test.setTimeout(90_000);
    const profile = testInfo.outputPath("chromium-profile");
    await mkdir(profile, { recursive: true });
    const marker = "SAJAGPOSTPROFILE" + crypto.randomUUID().replaceAll("-", "");
    const context = await chromium.launchPersistentContext(profile, {
      channel: "chromium",
      headless: true,
      baseURL,
      serviceWorkers: hasWorker ? "allow" : "block",
    });
    try {
      const page = context.pages()[0] || (await context.newPage());
      await signInForApp(page);
      if (hasWorker) await controlled(page);
      else await page.goto("/check");
      await share(page, {
        text: marker + " हर महीने 8% पक्का मुनाफा",
        title: "Private test forward",
      });
      await expect(field(page)).toHaveValue(
        hasWorker
          ? marker + " हर महीने 8% पक्का मुनाफा\n\nPrivate test forward"
          : "",
      );
      await expect(field(page)).toHaveAttribute("autocomplete", "off");
      if (hasWorker) await field(page).fill(marker + " user-edited निजी पाठ");
      // Deliberately do NOT clear or reload: ordinary textareas save these values
      // into UTF16 session files during graceful shutdown, even without a name.
    } finally {
      await context.close();
    }
    const rawScan = await scanProfile(profile, marker);
    expect(rawScan.scannedFiles).toBeGreaterThan(10);
    expect(rawScan.matches, JSON.stringify(rawScan)).toEqual([]);
    const history = sqliteMatches(
      path.join(profile, "Default/History"),
      "SELECT url,title FROM urls WHERE instr(url,?)>0 OR instr(title,?)>0",
      marker,
    );
    expect(history).toEqual([]);
    const faviconsPath = path.join(profile, "Default/Favicons");
    let favicons: unknown[] = [];
    if (
      await access(faviconsPath).then(
        () => true,
        () => false,
      )
    ) {
      favicons = sqliteMatches(
        faviconsPath,
        "SELECT page_url FROM icon_mapping WHERE instr(page_url,?)>0 OR instr(page_url,?)>0",
        marker,
      );
      expect(favicons).toEqual([]);
    }
    await testInfo.attach("persistent-profile-scan.json", {
      body: Buffer.from(
        JSON.stringify(
          {
            chromiumProfile: profile,
            mode: hasWorker ? "controlled POST" : "missing-worker fallback",
            encodings: ["UTF8", "UTF16LE"],
            ...rawScan,
            historyRows: history.length,
            faviconRows: favicons.length,
            includes:
              "all regular files, including Sessions/Tabs, HTTP cache, History, Favicons and ukm_db when present",
          },
          null,
          2,
        ),
      ),
      contentType: "application/json",
    });
  });
}
