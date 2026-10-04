import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const fileName = "Sajag-Android-Debug.apk";
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function parseApkInfo(badging) {
  const app =
    /^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m.exec(
      badging,
    );
  const sdk = /^sdkVersion:'(\d+)'/m.exec(badging);
  if (!app || !sdk || !/^application-debuggable\s*$/m.test(badging))
    throw new Error(
      "Expected a debuggable Android APK with a compiled package/version/min SDK.",
    );
  const info = {
    packageId: app[1],
    versionCode: Number(app[2]),
    versionName: app[3],
    minSdk: Number(sdk[1]),
    buildType: "debug",
  };
  if (
    info.packageId !== "org.sajag.app" ||
    info.versionCode !== 11 ||
    info.versionName !== "2.0"
  )
    throw new Error(
      "Refusing to publish an unexpected or stale APK; expected Sajag 2.0 / code 11.",
    );
  return info;
}

async function toolchain(root) {
  const sdk = process.env.ANDROID_HOME || path.join(root, ".tools/android-sdk");
  const builds = (await readdir(path.join(sdk, "build-tools"))).sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );
  if (!builds.length)
    throw new Error(
      "Android build-tools are required to verify a published APK.",
    );
  let java = process.env.JAVA_HOME;
  if (!java) {
    const jdks = await readdir(path.join(root, ".tools/jdk"));
    const portable = jdks.find((name) => name.endsWith(".jdk"));
    if (portable)
      java = path.join(root, ".tools/jdk", portable, "Contents/Home");
  }
  const env = {
    ...process.env,
    ...(java
      ? {
          JAVA_HOME: java,
          PATH: path.join(java, "bin") + path.delimiter + process.env.PATH,
        }
      : {}),
  };
  return { bin: path.join(sdk, "build-tools", builds[0]), env };
}

export async function verifyAndroidApk(snapshot, root = projectRoot) {
  const { bin, env } = await toolchain(root);
  const options = { env, maxBuffer: 4 * 1024 * 1024 };
  await exec(path.join(bin, "apksigner"), ["verify", snapshot], options);
  const { stdout: badging } = await exec(
    path.join(bin, "aapt"),
    ["dump", "badging", snapshot],
    options,
  );
  const { stdout: entries } = await exec(
    path.join(bin, "aapt"),
    ["list", snapshot],
    options,
  );
  if (
    entries
      .split(/\r?\n/)
      .some((name) => /(?:^|\/)downloads(?:\/|$)|\.apk$/i.test(name))
  ) {
    throw new Error(
      "Refusing to publish an APK containing downloads or another APK.",
    );
  }
  return parseApkInfo(badging);
}

async function atomicWrite(directory, name, bytes) {
  await mkdir(directory, { recursive: true });
  const temporary = path.join(directory, `.${name}.${process.pid}.tmp`);
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    await rename(temporary, path.join(directory, name));
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function publishApk({
  root = projectRoot,
  verify = verifyAndroidApk,
} = {}) {
  // Freeze bytes once. Verification and metadata derive from this same snapshot,
  // even if another process later replaces the source build artifact.
  const bytes = await readFile(path.join(root, "artifacts/sajag-debug.apk"));
  const digest = sha256(bytes);
  const deliverable = await readFile(path.join(root, "deliverables", fileName));
  if (sha256(deliverable) !== digest)
    throw new Error(
      "Artifact and verified deliverable differ. Run the APK verification/copy step first.",
    );
  await readFile(path.join(root, "dist/index.html"));
  const directory = await mkdtemp(path.join(os.tmpdir(), "sajag-apk-publish-"));
  try {
    const snapshot = path.join(directory, fileName);
    await writeFile(snapshot, bytes);
    const info = await verify(snapshot, root);
    const metadata = {
      schemaVersion: 1,
      ...info,
      fileName,
      url: `/downloads/${fileName}`,
      bytes: bytes.length,
      sha256: digest,
      publishedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(metadata, null, 2) + "\n";
    for (const base of ["public", "dist"]) {
      const destination = path.join(root, base, "downloads");
      await atomicWrite(destination, fileName, bytes);
      // Publish metadata last, after the corresponding APK bytes are in place.
      await atomicWrite(destination, "latest.json", json);
      if (
        sha256(await readFile(path.join(destination, fileName))) !== digest ||
        (await readFile(path.join(destination, "latest.json"), "utf8")) !== json
      ) {
        throw new Error(
          `Published APK/metadata verification failed in ${base}/downloads.`,
        );
      }
    }
    console.log(
      `Published local APK download: ${bytes.length} bytes; SHA256 ${digest}. Deploy both files in the same atomic site snapshot.`,
    );
    return metadata;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.length > 2)
    throw new Error("Usage: node scripts/publish-apk.mjs");
  await publishApk();
}
