import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

export function excludedFromNative(relative) {
  const parts = relative.split(/[\\/]/);
  return (
    parts.some(
      (part) => part.startsWith(".") || part.toLowerCase() === "downloads",
    ) || /\.apk$/i.test(relative)
  );
}

export async function copyForNative(source, destination) {
  await cp(source, destination, {
    recursive: true,
    filter: async (entry) => {
      const relative = path.relative(source, entry);
      if (relative && excludedFromNative(relative)) return false;
      if ((await lstat(entry)).isSymbolicLink())
        throw new Error("Native web assets must not contain symlinks.");
      return true;
    },
  });
  await assertNativeAssets(destination);
}

export async function assertNativeAssets(directory, relative = "") {
  for (const entry of await readdir(path.join(directory, relative), {
    withFileTypes: true,
  })) {
    const name = path.join(relative, entry.name);
    if (excludedFromNative(name) || entry.isSymbolicLink())
      throw new Error(`Excluded file reached native assets: ${name}`);
    if (entry.isDirectory()) await assertNativeAssets(directory, name);
  }
}

export async function assertCopiedAssets(staging, destination, relative = "") {
  for (const entry of await readdir(path.join(staging, relative), {
    withFileTypes: true,
  })) {
    const name = path.join(relative, entry.name);
    if (entry.isDirectory())
      await assertCopiedAssets(staging, destination, name);
    else if (entry.isFile()) {
      const expected = await readFile(path.join(staging, name));
      const actual = await readFile(path.join(destination, name));
      if (!expected.equals(actual))
        throw new Error(`Native sync copied stale or different bytes: ${name}`);
    }
  }
}

async function runCapSync(root, platform, staging) {
  const args = [
    path.join(root, "node_modules/@capacitor/cli/bin/capacitor"),
    "sync",
    ...platform,
  ];
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        SAJAG_NATIVE_WEB_DIR: path.relative(root, staging),
      },
    });
    child.on("error", reject);
    child.on("exit", (code, signal) =>
      code === 0
        ? resolve()
        : reject(new Error(`Capacitor sync failed (${signal || code}).`)),
    );
  });
}

export async function syncMobile(platform = [], root = projectRoot) {
  if (
    platform.length > 1 ||
    platform.some((value) => !["android", "ios"].includes(value))
  ) {
    throw new Error("Usage: node scripts/sync-mobile.mjs [android|ios]");
  }
  await readFile(path.join(root, "dist/index.html"));
  await mkdir(path.join(root, ".tools"), { recursive: true });
  const lock = path.join(root, ".tools/native-sync.lock");
  await mkdir(lock).catch((error) => {
    if (error.code === "EEXIST")
      throw new Error(
        "Another native sync is active. If it was interrupted, remove .tools/native-sync.lock before retrying.",
      );
    throw error;
  });
  let staging;
  const selected = platform.length ? platform : ["android", "ios"];
  const roots = selected.map((name) =>
    path.join(
      root,
      name === "android" ? "android/app/src/main/assets" : "ios/App/App",
    ),
  );
  try {
    staging = await mkdtemp(path.join(root, ".tools/native-web-"));
    await copyForNative(path.join(root, "dist"), staging);
    await runCapSync(root, platform, staging);
    for (const nativeRoot of roots) {
      await assertNativeAssets(path.join(nativeRoot, "public"));
      // Capacitor can log a copy error yet exit zero after its update task.
      // Validate all source bytes, not just index.html or the process exit code.
      await assertCopiedAssets(staging, path.join(nativeRoot, "public"));
      const config = JSON.parse(
        await readFile(path.join(nativeRoot, "capacitor.config.json"), "utf8"),
      );
      if (config.webDir !== path.relative(root, staging))
        throw new Error(
          "Capacitor did not write a fresh native configuration for this sync.",
        );
    }
  } finally {
    // Capacitor serializes webDir into the native config. Remove the temporary
    // path so identical web builds do not carry a random staging-directory name.
    try {
      for (const nativeRoot of roots) {
        const configPath = path.join(nativeRoot, "capacitor.config.json");
        try {
          const config = JSON.parse(await readFile(configPath, "utf8"));
          if (staging && config.webDir === path.relative(root, staging)) {
            config.webDir = "dist";
            await writeFile(
              configPath,
              JSON.stringify(config, null, "\t") + "\n",
            );
          }
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
    } finally {
      try {
        if (staging) await rm(staging, { recursive: true, force: true });
      } finally {
        await rm(lock, { recursive: true, force: true });
      }
    }
  }
  console.log(
    "Native assets synced without downloads, APKs, dotfiles, or symlinks. Web dist preserved.",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await syncMobile(process.argv.slice(2));
}
