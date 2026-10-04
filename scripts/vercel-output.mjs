// Assembles Vercel Build Output API v3 (.vercel/output) from the regular production
// build: dist/ is served by the CDN, server/vercel.ts becomes one bundled function.
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { build, loadEnv } from "vite";

const out = ".vercel/output";
const fn = `${out}/functions/api.func`;
await rm(out, { recursive: true, force: true });
await mkdir(`${out}/static`, { recursive: true });
await cp("dist", `${out}/static`, { recursive: true });

// The public Supabase project URL and anon key come from the committed
// .env.production (they already ship in the web bundle). Bake them into the
// function too, so server-side session checks work without a runtime copy in
// the Vercel project; SUPABASE_URL/SUPABASE_ANON_KEY set there still win.
const publicSupabase = loadEnv("production", process.cwd(), "VITE_SUPABASE_");
const define = Object.fromEntries(
  ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"]
    .filter((key) => publicSupabase[key])
    .map((key) => [`process.env.${key}`, JSON.stringify(publicSupabase[key])]),
);

await build({
  configFile: false,
  publicDir: false,
  logLevel: "warn",
  define,
  ssr: { noExternal: true, target: "node" },
  build: {
    ssr: "server/vercel.ts",
    outDir: fn,
    emptyOutDir: true,
    target: "node22",
    minify: false,
    rollupOptions: {
      output: {
        format: "esm",
        entryFileNames: "index.mjs",
        // Bundled CommonJS dependencies (Express) still call require() for Node builtins.
        banner:
          'import { createRequire as __sajagRequire } from "node:module"; const require = __sajagRequire(import.meta.url);',
      },
    },
  },
});
await writeFile(
  `${fn}/.vc-config.json`,
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      maxDuration: 30,
      regions: ["bom1"],
    },
    null,
    2,
  ),
);

// Mirrors the Helmet headers that server/app.ts sends from the Node server.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob:",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "upgrade-insecure-requests",
].join(";");
const security = {
  "Content-Security-Policy": csp,
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Origin-Agent-Cluster": "?1",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-DNS-Prefetch-Control": "off",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Permitted-Cross-Domain-Policies": "none",
};
const routes = [
  { src: "^/(.*)$", headers: security, continue: true },
  { src: "^/(?:index\\.html)?$", headers: { "Cache-Control": "no-store" }, continue: true },
  { src: "^/sw\\.js$", headers: { "Cache-Control": "no-cache" }, continue: true },
  {
    src: "^/assets/(.*)$",
    headers: { "Cache-Control": "public, max-age=31536000, immutable" },
    continue: true,
  },
  {
    src: "^/downloads/[^/]+\\.apk$",
    headers: {
      "Content-Type": "application/vnd.android.package-archive",
      "Content-Disposition": "attachment",
      "Cache-Control": "no-store",
    },
    continue: true,
  },
  { src: "^/downloads/latest\\.json$", headers: { "Cache-Control": "no-store" }, continue: true },
  { src: "^/api(?:/.*)?$", dest: "/api" },
  { src: "^/share-target/?$", methods: ["POST"], dest: "/api" },
  { handle: "filesystem" },
  // A missing download must not fall through to the app shell (HTTP 200 HTML).
  { src: "^/downloads(?:/.*)?$", status: 404, headers: { "Cache-Control": "no-store" } },
  { src: "^/.*$", dest: "/index.html", headers: { "Cache-Control": "no-store" } },
];
await writeFile(`${out}/config.json`, JSON.stringify({ version: 3, routes }, null, 2));
console.log(`Vercel output ready: ${out}`);
