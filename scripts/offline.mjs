import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const groups = await Promise.all(
    entries
      .filter(
        (entry) =>
          !entry.name.startsWith(".") &&
          entry.name.toLowerCase() !== "downloads" &&
          !/\.apk$/i.test(entry.name),
      )
      .map(async (entry) =>
        entry.isDirectory()
          ? walk(path.join(directory, entry.name))
          : entry.isFile()
            ? [path.join(directory, entry.name)]
            : [],
      ),
  );
  return groups.flat();
}

// This function is serialized into the generated worker. Keep its state in
// memory: shared content must never enter CacheStorage or another durable store.
export function workerRuntime(CACHE, ASSETS) {
  const MAX_TEXT = 6000;
  const MAX_BODY_BYTES = 96 * 1024;
  const SHARE_TTL_MS = 30_000;
  const MAX_PENDING = 16;
  const pending = new Map();

  function release(id) {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    entry.finish();
  }

  function prune() {
    const now = Date.now();
    for (const [id, entry] of pending) {
      if (entry.expires <= now) release(id);
    }
  }

  function redirect(status) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/check?shared=${status}`,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  }

  async function boundedForm(request) {
    const contentType = request.headers.get("content-type") || "";
    if (!/^multipart\/form-data\s*;/i.test(contentType) || !request.body)
      return null;
    const declared = Number(request.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
    const reader = request.body.getReader();
    const chunks = [];
    let size = 0;
    // Also bound the read duration. A slow or malformed sender cannot hold the
    // worker indefinitely. Cancellation makes any pending read settle.
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      void reader.cancel().catch(() => {});
    }, 5_000);
    try {
      while (true) {
        const chunk = await reader.read();
        if (timedOut) return null;
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return null;
        }
        chunks.push(chunk.value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      return await new Response(bytes, {
        headers: { "Content-Type": contentType },
      }).formData();
    } finally {
      clearTimeout(timer);
      reader.releaseLock();
    }
  }

  function textFromForm(form) {
    // Ignore attachments completely, including files disguised as a text field.
    const parts = ["text", "url", "title"].map((key) => {
      const value = form.get(key);
      return typeof value === "string" ? value.replaceAll("\0", "").trim() : "";
    });
    const value = [...new Set(parts.filter(Boolean))].join("\n\n");
    if (!value) return null;
    let end = Math.min(value.length, MAX_TEXT);
    if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1])) end--;
    return { text: value.slice(0, end), truncated: value.length > end };
  }

  async function receiveShare(event) {
    const id = event.resultingClientId;
    if (event.request.mode !== "navigate" || !id) {
      return { response: redirect("unavailable"), done: Promise.resolve() };
    }
    let form;
    try {
      form = await boundedForm(event.request);
    } catch {
      return { response: redirect("unavailable"), done: Promise.resolve() };
    }
    if (!form)
      return { response: redirect("unavailable"), done: Promise.resolve() };
    const message = textFromForm(form);
    if (!message)
      return { response: redirect("empty"), done: Promise.resolve() };
    prune();
    release(id);
    while (pending.size >= MAX_PENDING) release(pending.keys().next().value);
    let finish;
    const done = new Promise((resolve) => {
      finish = resolve;
    });
    const entry = {
      message,
      expires: Date.now() + SHARE_TTL_MS,
      finish,
      timer: setTimeout(() => release(id), SHARE_TTL_MS),
    };
    pending.set(id, entry);
    // Same-origin redirects retain the navigation's resultingClientId. The
    // fixed marker carries no payload or reusable access token.
    return { response: redirect("1"), done };
  }

  async function shell() {
    const cache = await caches.open(CACHE);
    return (
      (await cache.match("/index.html")) ||
      fetch("/check", {
        cache: "no-store",
        referrerPolicy: "no-referrer",
      })
    );
  }

  self.addEventListener("install", (event) => {
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => cache.addAll(ASSETS))
        .then(() => self.skipWaiting()),
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key.startsWith("sajag-") && key !== CACHE)
              .map((key) => caches.delete(key)),
          ),
        )
        .then(() => self.clients.claim()),
    );
  });
  self.addEventListener("fetch", (event) => {
    const request = event.request;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/"))
      return;
    // Download URLs never enter the offline shell path or CacheStorage. Decode
    // conservatively so escaped names/slashes cannot turn an APK into HTML.
    let pathname = url.pathname;
    let ambiguous = false;
    try {
      for (let depth = 0; depth < 3 && pathname.includes("%"); depth++) {
        pathname = decodeURIComponent(pathname);
      }
      if (pathname.includes("%")) ambiguous = true;
    } catch {
      ambiguous = true;
    }
    pathname = pathname.replaceAll("\\", "/");
    if (
      ambiguous ||
      /(?:^|\/)downloads(?:\/|$)/i.test(pathname) ||
      /\.apk(?:\/|$)/i.test(pathname)
    ) {
      event.respondWith(
        fetch(request, { cache: "no-store" })
          .then((response) => {
            if (
              /text\/html|application\/xhtml\+xml/i.test(
                response.headers.get("content-type") || "",
              )
            ) {
              return new Response("Download unavailable.", {
                status: 404,
                headers: {
                  "Content-Type": "text/plain",
                  "Cache-Control": "no-store",
                },
              });
            }
            const headers = new Headers(response.headers);
            headers.set("Cache-Control", "no-store");
            return new Response(response.body, {
              status: response.status,
              statusText: response.statusText,
              headers,
            });
          })
          .catch(
            () =>
              new Response(
                "Download unavailable offline. Connect to the internet and retry.",
                {
                  status: 503,
                  headers: {
                    "Content-Type": "text/plain",
                    "Cache-Control": "no-store",
                  },
                },
              ),
          ),
      );
      return;
    }
    if (request.method === "POST" && url.pathname === "/share-target") {
      const handoff = receiveShare(event);
      event.respondWith(handoff.then((result) => result.response));
      // A timer alone does not keep a service worker alive. Hold this event for
      // at most the short handoff lease; worker termination still fails closed.
      event.waitUntil(handoff.then((result) => result.done));
      return;
    }
    if (request.method !== "GET") return;
    if (request.mode === "navigate") {
      if (
        ["/check", "/check/"].includes(url.pathname) &&
        ["shared", "text", "title", "url"].some((key) =>
          url.searchParams.has(key),
        )
      ) {
        // New POST shares use a fixed marker. Old GET shares get a clean shell
        // but are rejected by the web intake; never forward their query text.
        event.respondWith(shell());
        return;
      }
      event.respondWith(fetch(request).catch(shell));
      return;
    }
    if (ASSETS.includes(url.pathname)) {
      event.respondWith(
        caches
          .open(CACHE)
          .then(
            async (cache) => (await cache.match(request)) || fetch(request),
          ),
      );
    }
  });
  self.addEventListener("message", (event) => {
    if (
      event.data?.type !== "SAJAG_TAKE_SHARE" ||
      event.data?.version !== 1 ||
      event.ports.length !== 1
    )
      return;
    const source = event.source;
    const port = event.ports[0];
    let validClient = false;
    try {
      const url = new URL(source?.url);
      validClient =
        source?.type === "window" &&
        url.origin === self.location.origin &&
        /^\/check\/?$/.test(url.pathname);
    } catch {
      /* No window client: fail closed. */
    }
    prune();
    const entry = validClient ? pending.get(source.id) : undefined;
    // source.id is supplied by the browser. Never trust an ID from event.data,
    // broadcast content, or fall back to the newest pending share in another tab.
    if (entry) release(source.id);
    port.postMessage({
      type: "SAJAG_SHARE_RESULT",
      version: 1,
      status: entry ? "ready" : "unavailable",
      ...(entry ? { message: entry.message } : {}),
    });
    port.close();
  });
}

export async function generateOffline(directory = "dist") {
  const files = (await walk(directory))
    .filter((file) => !/\.(?:map|md|txt)$/.test(file) && !/sw\.js$/.test(file))
    .sort();
  const hash = createHash("sha256");
  hash.update(workerRuntime.toString());
  for (const file of files) {
    hash.update(path.relative(directory, file));
    hash.update(await readFile(file));
  }
  const cache = `sajag-${hash.digest("hex").slice(0, 12)}`;
  const urls = files.map(
    (file) => "/" + path.relative(directory, file).split(path.sep).join("/"),
  );
  await writeFile(
    path.join(directory, "sw.js"),
    `(${workerRuntime.toString()})(${JSON.stringify(cache)}, ${JSON.stringify(urls)});\n`,
  );
  console.log(
    `Offline shell ready: ${urls.length} static assets. Shared text uses a bounded, one-use memory handoff; user data, API responses, and APK downloads are never cached by the service worker.`,
  );
  return { cache, urls };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await generateOffline();
}
