import express from "express";
import { createApp } from "./app.ts";

// Vercel serverless entry. Static files are served by Vercel's CDN (see
// scripts/vercel-output.mjs); this function handles /api/* and the share fallback.
const vercelOrigins = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_BRANCH_URL,
  process.env.VERCEL_URL,
]
  .filter(Boolean)
  .map((host) => `https://${host}`);
// Capacitor apps call this API from their bundled origins (Android, iOS).
const nativeOrigins = ["https://localhost", "capacitor://localhost"];
process.env.ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGINS,
  ...vercelOrigins,
  ...nativeOrigins,
]
  .filter(Boolean)
  .join(",");
process.env.TRUST_PROXY ??= "1";

const app = express();
app.disable("x-powered-by");
// Same contract as server/index.ts: without a controlling service worker, drop the
// shared body unread and redirect to a clean retry state.
app.post("/share-target", (_req, res) => {
  res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  res.redirect(303, "/check?shared=unavailable");
});
app.use(createApp());

export default app;
