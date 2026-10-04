import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { createApp } from "./app.ts";
dotenv.config({ path: [".env.local", ".env"], quiet: true });
const app = express();
// A missing service worker cannot perform a private local share handoff. Drop
// the body without a parser/logger and redirect to a clean, useful retry state.
app.post("/share-target", (_req, res) => {
  res.set({ "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" });
  res.redirect(303, "/check?shared=unavailable");
});
app.use(createApp());
const dist = path.resolve("dist");
app.use(
  express.static(dist, {
    setHeaders: (res, file) => {
      if (file.endsWith(".html")) res.setHeader("Cache-Control", "no-store");
      if (file.endsWith(".apk")) {
        res.setHeader("Content-Type", "application/vnd.android.package-archive");
        res.setHeader("Content-Disposition", "attachment");
        res.setHeader("Cache-Control", "no-store");
      }
      if (file.endsWith(path.join("downloads", "latest.json")))
        res.setHeader("Cache-Control", "no-store");
    },
  }),
);
// A missing download must not fall through to the app shell (HTTP 200 HTML).
app.use("/downloads", (_req, res) => {
  res.status(404).set("Cache-Control", "no-store").type("text/plain").send("Not found");
});
app.get("/{*path}", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(dist, "index.html"));
});
const port = Number(process.env.PORT || 8787);
app.listen(port, "0.0.0.0", () =>
  console.log(`Sajag API listening on http://localhost:${port}`),
);
