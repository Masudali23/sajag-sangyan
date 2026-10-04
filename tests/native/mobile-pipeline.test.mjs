import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { generateOffline, workerRuntime } from "../../scripts/offline.mjs";
import {
  assertNativeAssets,
  assertCopiedAssets,
  copyForNative,
  syncMobile,
} from "../../scripts/sync-mobile.mjs";
import { parseApkInfo, publishApk } from "../../scripts/publish-apk.mjs";

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), "sajag-mobile-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function file(root, name, content = "test") {
  await mkdir(path.dirname(path.join(root, name)), { recursive: true });
  await writeFile(path.join(root, name), content);
}

function worker(
  fetchImpl = async () => {
    throw new Error("offline");
  },
) {
  const events = new Map();
  const buckets = new Map([
    ["sajag-old", new Map([["/downloads/old.apk", "OLD APK"]])],
    ["unrelated-cache", new Map()],
  ]);
  const added = [];
  const fetched = [];
  let opened = 0;
  const caches = {
    async open(name) {
      opened++;
      if (!buckets.has(name)) buckets.set(name, new Map());
      return {
        addAll: async (urls) => {
          added.push(...urls);
        },
        match: async () =>
          new Response("SAJAG_APP_SHELL", {
            headers: { "Content-Type": "text/html" },
          }),
      };
    },
    async keys() {
      return [...buckets.keys()];
    },
    async delete(name) {
      return buckets.delete(name);
    },
  };
  const self = {
    location: { origin: "https://sajag.test" },
    addEventListener: (name, handler) => events.set(name, handler),
    skipWaiting: async () => {},
    clients: { claim: async () => {} },
  };
  vm.runInNewContext(
    `(${workerRuntime.toString()})("sajag-current", ["/index.html", "/assets/app.js"]);`,
    {
      self,
      caches,
      fetch: async (...args) => {
        fetched.push(args);
        return fetchImpl(...args);
      },
      URL,
      Response,
      Headers,
      Date,
      Map,
      Set,
      Uint8Array,
      setTimeout,
      clearTimeout,
    },
  );
  return { events, buckets, added, fetched, opened: () => opened };
}
async function fetchWorker(runtime, pathname) {
  let response;
  runtime.events.get("fetch")({
    request: {
      url: `https://sajag.test${pathname}`,
      mode: "navigate",
      method: "GET",
    },
    respondWith: (promise) => {
      response = promise;
    },
  });
  assert.ok(response, `No download handler for ${pathname}`);
  return await response;
}

test("precache excludes APKs/download metadata and their changes do not churn the shell cache", async (t) => {
  const root = await fixture(t);
  await file(root, "index.html", "APP");
  await file(root, "assets/app.js", "APP JS");
  await file(root, "downloads/Sajag.apk", "APK");
  await file(root, "downloads/latest.json", "{}");
  await file(root, "nested/Downloads/latest.json", "{}");
  await file(root, "assets/other.APK", "APK");
  await file(root, ".private", "hidden");
  const initial = await generateOffline(root);
  assert.deepEqual(initial.urls, ["/assets/app.js", "/index.html"]);
  await file(root, "downloads/Sajag.apk", "NEW APK");
  await file(root, "downloads/latest.json", '{"changed":true}');
  assert.equal((await generateOffline(root)).cache, initial.cache);
});

test("normal, encoded, double-encoded and ambiguous downloads never use offline HTML", async () => {
  const paths = [
    "/downloads/Sajag-Android-Debug.apk",
    "/downloads/latest.json",
    "/downloads",
    "/Downloads/latest.json",
    "/%64ownloads/latest.json",
    "/downloads%2Flatest.json",
    "/%2564ownloads/latest.json",
    "/other/file%2eApK",
    "/other/file.apk/",
    "/downloads%5clatest.json",
    "/broken/%E0%A4%A",
  ];
  for (const pathname of paths) {
    const runtime = worker();
    const response = await fetchWorker(runtime, pathname);
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.ok(!(await response.text()).includes("SAJAG_APP_SHELL"));
    assert.equal(runtime.opened(), 0);
    assert.equal(runtime.fetched[0][1].cache, "no-store");
  }
});

test("successful downloads preserve bytes while disabling HTTP cache reuse", async () => {
  const runtime = worker(
    async () =>
      new Response("PK TEST APK", {
        headers: {
          "Content-Type": "application/vnd.android.package-archive",
          "Cache-Control": "public, max-age=999999",
        },
      }),
  );
  const response = await fetchWorker(
    runtime,
    "/downloads/Sajag-Android-Debug.apk",
  );
  assert.equal(await response.text(), "PK TEST APK");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(runtime.opened(), 0);
});

test("a hosting SPA rewrite cannot masquerade as an APK download", async () => {
  const runtime = worker(
    async () =>
      new Response("<html>APP</html>", {
        headers: { "Content-Type": "text/html" },
      }),
  );
  const response = await fetchWorker(runtime, "/downloads/missing.apk");
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("Content-Type"), "text/plain");
  assert.equal(await response.text(), "Download unavailable.");
});

test("worker upgrade deletes an old Sajag cache containing an APK", async () => {
  const runtime = worker();
  let installed;
  runtime.events.get("install")({
    waitUntil: (promise) => {
      installed = promise;
    },
  });
  await installed;
  assert.deepEqual(runtime.added, ["/index.html", "/assets/app.js"]);
  let activated;
  runtime.events.get("activate")({
    waitUntil: (promise) => {
      activated = promise;
    },
  });
  await activated;
  assert.equal(runtime.buckets.has("sajag-old"), false);
  assert.equal(runtime.buckets.has("sajag-current"), true);
  assert.equal(runtime.buckets.has("unrelated-cache"), true);
});

test("repeated native staging omits published APKs without changing website files", async (t) => {
  const root = await fixture(t);
  const source = path.join(root, "dist");
  await file(source, "index.html", "APP");
  await file(source, "assets/app.js", "JS");
  await file(source, "downloads/Sajag-Android-Debug.apk", "ORIGINAL APK");
  await file(source, "downloads/latest.json", "METADATA");
  await file(source, "assets/old.APK", "OLD APK");
  for (const pass of ["one", "two"]) {
    const staged = path.join(root, pass);
    await copyForNative(source, staged);
    await assertNativeAssets(staged);
    assert.deepEqual((await readdir(staged)).sort(), ["assets", "index.html"]);
    assert.deepEqual(await readdir(path.join(staged, "assets")), ["app.js"]);
  }
  assert.equal(
    await readFile(
      path.join(source, "downloads/Sajag-Android-Debug.apk"),
      "utf8",
    ),
    "ORIGINAL APK",
  );
});

test("native staging rejects symlinks instead of copying outside the web build", async (t) => {
  const root = await fixture(t);
  await file(root, "outside.txt", "OUTSIDE");
  await mkdir(path.join(root, "dist"));
  await symlink(
    path.join(root, "outside.txt"),
    path.join(root, "dist/linked.txt"),
  );
  await assert.rejects(
    copyForNative(path.join(root, "dist"), path.join(root, "stage")),
    /symlinks/,
  );
});

async function syncFixture(t, failure = false, badConfig = false) {
  const root = await fixture(t);
  await file(root, "dist/index.html", "FROZEN APP");
  await file(root, "dist/downloads/Sajag-Android-Debug.apk", "OLD APK");
  await file(root, "dist/downloads/latest.json", "OLD METADATA");
  await file(
    root,
    "node_modules/@capacitor/cli/bin/capacitor",
    `
    const fs = require('node:fs'); const path = require('node:path');
    const stage = process.env.SAJAG_NATIVE_WEB_DIR;
    if (!stage || fs.existsSync(path.join(stage, 'downloads'))) process.exit(9);
    const native = 'android/app/src/main/assets';
    fs.mkdirSync(native, {recursive:true});
    fs.cpSync(stage, path.join(native, 'public'), {recursive:true});
    fs.writeFileSync(path.join(native, 'capacitor.config.json'), ${badConfig ? "'INVALID JSON'" : "JSON.stringify({webDir:stage, server:{androidScheme:'https'}})"});
    process.exit(${failure ? 2 : 0});
  `,
  );
  return root;
}

test("sync uses filtered child-only staging, normalizes config, and leaves web downloads intact", async (t) => {
  const root = await syncFixture(t);
  const previous = process.env.SAJAG_NATIVE_WEB_DIR;
  await syncMobile(["android"], root);
  assert.equal(process.env.SAJAG_NATIVE_WEB_DIR, previous);
  assert.deepEqual(await readdir(path.join(root, ".tools")), []);
  const config = JSON.parse(
    await readFile(
      path.join(root, "android/app/src/main/assets/capacitor.config.json"),
      "utf8",
    ),
  );
  assert.equal(config.webDir, "dist");
  assert.deepEqual(config.server, { androidScheme: "https" });
  await assertNativeAssets(
    path.join(root, "android/app/src/main/assets/public"),
  );
  assert.equal(
    await readFile(
      path.join(root, "dist/downloads/Sajag-Android-Debug.apk"),
      "utf8",
    ),
    "OLD APK",
  );
});

test("failed cap sync leaves no recursive APK and releases staging/lock", async (t) => {
  const root = await syncFixture(t, true);
  await assert.rejects(syncMobile(["android"], root), /sync failed/);
  await assertNativeAssets(
    path.join(root, "android/app/src/main/assets/public"),
  );
  assert.deepEqual(await readdir(path.join(root, ".tools")), []);
});

test("config-normalization errors still release native staging and lock", async (t) => {
  const root = await syncFixture(t, false, true);
  await assert.rejects(syncMobile(["android"], root), /JSON/);
  assert.deepEqual(await readdir(path.join(root, ".tools")), []);
});

test("zero-exit Capacitor copy failures cannot report stale native assets as success", async (t) => {
  const root = await syncFixture(t);
  await file(
    root,
    "android/app/src/main/assets/public/index.html",
    "STALE APP",
  );
  await file(
    root,
    "android/app/src/main/assets/capacitor.config.json",
    '{"webDir":"dist"}',
  );
  await file(
    root,
    "node_modules/@capacitor/cli/bin/capacitor",
    "console.log('Simulated swallowed Capacitor copy error'); process.exit(0);",
  );
  await assert.rejects(
    syncMobile(["android"], root),
    /stale or different bytes/,
  );
  assert.deepEqual(await readdir(path.join(root, ".tools")), []);
});

test("matching index cannot hide a missing or stale JavaScript chunk after partial copy", async (t) => {
  const root = await fixture(t);
  await file(root, "stage/index.html", "SAME INDEX");
  await file(root, "stage/assets/app.js", "NEW CODE");
  await file(root, "native/index.html", "SAME INDEX");
  await assert.rejects(
    assertCopiedAssets(path.join(root, "stage"), path.join(root, "native")),
    /ENOENT/,
  );
  await file(root, "native/assets/app.js", "STALE CODE");
  await assert.rejects(
    assertCopiedAssets(path.join(root, "stage"), path.join(root, "native")),
    /stale or different bytes/,
  );
});

const info = {
  packageId: "org.sajag.app",
  versionCode: 11,
  versionName: "2.0",
  minSdk: 24,
  buildType: "debug",
};
async function publishFixture(t) {
  const root = await fixture(t);
  await file(root, "artifacts/sajag-debug.apk", "PK VERIFIED APK");
  await file(root, "deliverables/Sajag-Android-Debug.apk", "PK VERIFIED APK");
  await file(root, "dist/index.html", "APP");
  await file(root, "dist/assets/app.js", "FROZEN JS");
  await file(root, "dist/sw.js", "FROZEN WORKER");
  return root;
}

test("publication derives both downloads and metadata from the exact verified snapshot", async (t) => {
  const root = await publishFixture(t);
  const metadata = await publishApk({
    root,
    verify: async (snapshot) => {
      assert.equal(await readFile(snapshot, "utf8"), "PK VERIFIED APK");
      await file(root, "artifacts/sajag-debug.apk", "LATER REPLACEMENT");
      return info;
    },
  });
  const expected = createHash("sha256").update("PK VERIFIED APK").digest("hex");
  assert.equal(metadata.sha256, expected);
  for (const base of ["public", "dist"]) {
    assert.equal(
      await readFile(
        path.join(root, base, "downloads/Sajag-Android-Debug.apk"),
        "utf8",
      ),
      "PK VERIFIED APK",
    );
    assert.deepEqual(
      JSON.parse(
        await readFile(path.join(root, base, "downloads/latest.json"), "utf8"),
      ),
      metadata,
    );
  }
  assert.equal(
    await readFile(path.join(root, "dist/assets/app.js"), "utf8"),
    "FROZEN JS",
  );
  assert.equal(
    await readFile(path.join(root, "dist/sw.js"), "utf8"),
    "FROZEN WORKER",
  );
});

test("failed signature verification leaves an existing publication untouched", async (t) => {
  const root = await publishFixture(t);
  await file(root, "public/downloads/latest.json", "OLD METADATA");
  await file(root, "public/downloads/Sajag-Android-Debug.apk", "OLD APK");
  await assert.rejects(
    publishApk({
      root,
      verify: async () => {
        throw new Error("Signature invalid");
      },
    }),
    /Signature invalid/,
  );
  assert.equal(
    await readFile(path.join(root, "public/downloads/latest.json"), "utf8"),
    "OLD METADATA",
  );
  assert.equal(
    await readFile(
      path.join(root, "public/downloads/Sajag-Android-Debug.apk"),
      "utf8",
    ),
    "OLD APK",
  );
});

test("publication refuses mismatched artifact/deliverable copies before verification", async (t) => {
  const root = await publishFixture(t);
  await file(root, "deliverables/Sajag-Android-Debug.apk", "STALE APK");
  let called = false;
  await assert.rejects(
    publishApk({
      root,
      verify: async () => {
        called = true;
        return info;
      },
    }),
    /differ/,
  );
  assert.equal(called, false);
});

test("compiled APK identity, version and debug status are required", () => {
  const valid =
    "package: name='org.sajag.app' versionCode='11' versionName='2.0'\nsdkVersion:'24'\napplication-debuggable\n";
  assert.deepEqual(parseApkInfo(valid), info);
  assert.throws(
    () => parseApkInfo(valid.replace("org.sajag.app", "another.app")),
    /unexpected/,
  );
  assert.throws(
    () => parseApkInfo(valid.replace("versionCode='11'", "versionCode='10'")),
    /stale/,
  );
  assert.throws(
    () => parseApkInfo(valid.replace("application-debuggable", "")),
    /debuggable/,
  );
});
