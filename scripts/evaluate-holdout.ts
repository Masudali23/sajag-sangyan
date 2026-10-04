// Totals-only scorer, using the app's own contract:
//   offline = on-device rules + pattern model (no network);
//   ai      = on-device result merged with the server's consented AI review.
// Held-out evaluation (150 messages, scored once per mode):
//   SEALED_HOLDOUT=datasets/evaluation/holdout-150.json node scripts/evaluate-holdout.ts --sealed --offline
//   SEALED_HOLDOUT=datasets/evaluation/holdout-150.json node scripts/evaluate-holdout.ts --sealed --ai --server http://127.0.0.1:8787
// Development fixtures:
//   node scripts/evaluate-holdout.ts --dev tests/fixtures/dev-cycle7-en.json --offline
// AI mode needs a signed-in session token in SAJAG_EVAL_ACCESS_TOKEN.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { assessRisk } from "../shared/risk.ts";
import { reviewedMerge } from "../shared/ai-review.ts";
import { analyzeMessage } from "../shared/pattern-model.ts";
import { analysisSchema } from "../shared/validation.ts";
import type { Language } from "../shared/types.ts";
import {
  evaluationAuthHeaders,
  EvaluationAuthError,
  rejectEvaluationAuthFailure,
} from "./evaluation-auth.ts";

const SEALED_ITEMS_SHA256 =
  "dbdaf486b3d53c4d54256aef7d7e76d499538dcc196893c2854926175977e150";
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const CHECK_ITEMS_SHA256 =
  "26339156befb24a5ed62f9e3905c521eed6717352e587dc30833e01c7cbd9cd1";
const check = process.argv.includes("--check");
const sealed = process.argv.includes("--sealed") || check;
const ai = process.argv.includes("--ai");
const server = arg("--server");
const paceMs = Number(arg("--pace-ms") ?? 4000);
if (ai && !server)
  throw new Error("--ai needs --server URL of a running Sajag API.");
const authHeaders = evaluationAuthHeaders(ai);
// Python's json.dumps(items, ensure_ascii=False, sort_keys=True, separators=(",", ":")).
const canonical = (v: unknown): string =>
  Array.isArray(v)
    ? `[${v.map(canonical).join(",")}]`
    : v && typeof v === "object"
      ? `{${Object.keys(v)
          .sort()
          .map(
            (k) =>
              `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`,
          )
          .join(",")}}`
      : JSON.stringify(v);

type Row = { id?: string; language: string; expected: boolean; text: string };
let rows: Row[];
if (sealed) {
  const { items } = JSON.parse(
    readFileSync(
      (check ? process.env.CHECK_SET : process.env.SEALED_HOLDOUT) ?? "",
      "utf8",
    ),
  );
  if (
    createHash("sha256").update(canonical(items)).digest("hex") !==
    (check ? CHECK_ITEMS_SHA256 : SEALED_ITEMS_SHA256)
  )
    throw new Error("Private set changed or is not the pinned cycle-8 set.");
  rows = items.map(
    (i: { language: string; expectedAttention: boolean; text: string }) => ({
      language: i.language,
      expected: i.expectedAttention,
      text: i.text,
    }),
  );
} else {
  rows = (arg("--dev") ?? "")
    .split(",")
    .filter(Boolean)
    .flatMap((file) => {
      const d = JSON.parse(readFileSync(file, "utf8"));
      const list = Array.isArray(d)
        ? d
        : (d.items ?? d.cases ?? Object.values(d).find(Array.isArray));
      return list
        .filter(
          (r: Record<string, unknown>) =>
            typeof (r.expectAttention ?? r.expectedAttention) === "boolean",
        )
        .map((r: Record<string, unknown>) => ({
          id: String(r.id ?? ""),
          language: String(r.language ?? "en"),
          expected: (r.expectAttention ?? r.expectedAttention) as boolean,
          text: String(r.text),
        }));
    });
}
if (!rows.length) throw new Error("No labelled messages.");

type Tally = {
  risky: number;
  riskyFlagged: number;
  harmless: number;
  harmlessFlagged: number;
  harmlessStrong: number;
  completed: number;
  total: number;
};
const tally = new Map<string, Tally>();
const statuses: Record<string, number> = {};
for (const [index, row] of rows.entries()) {
  const language = row.language.split("-")[0].toLowerCase() as Language;
  const local = analyzeMessage(
    row.text,
    ["en", "hi", "bn"].includes(language) ? language : "en",
  );
  let result = local;
  let completed = false;
  if (ai) {
    if (index) await new Promise((r) => setTimeout(r, paceMs));
    // A provider at rest (quota or overload) is a capacity failure, not a quality result:
    // stop before printing anything, so a private set is not spent on fallbacks.
    const health = await fetch(`${server}/api/health`, {
      signal: AbortSignal.timeout(5000),
    })
      .then((r) => r.json())
      .catch(() => null);
    if (!health?.aiAvailable || health.aiStatus !== "ready") {
      console.log(
        `ABORTED before message ${index + 1}/${rows.length}: AI provider ${health?.aiStatus ?? "unreachable"}. No totals printed.`,
      );
      process.exit(2);
    }
    try {
      const response = await fetch(`${server}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          text: local.input,
          language: local.language,
          useAI: true,
          consent: true,
          consentProvider: "gemini",
        }),
        signal: AbortSignal.timeout(24000),
      });
      statuses[response.status] = (statuses[response.status] ?? 0) + 1;
      const body: unknown = await response.json().catch(() => null);
      rejectEvaluationAuthFailure(response.status, body);
      const parsed = response.ok
        ? analysisSchema.safeParse(
            (body as { analysis?: unknown } | null)?.analysis,
          )
        : null;
      if (parsed?.success) {
        result = reviewedMerge(local, parsed.data);
        completed = Boolean(
          parsed.data.aiAssisted && parsed.data.retrieval?.usedForAi === true,
        );
      }
    } catch (error) {
      if (error instanceof EvaluationAuthError) throw error;
      statuses.requestFailed = (statuses.requestFailed ?? 0) + 1;
    }
  }
  const flagged = result.findings.some((f) => f.severity === "attention");
  // Development only: per-message outcome (no text) to diagnose errors.
  if (!sealed && process.argv.includes("--details"))
    console.log(
      `${flagged === row.expected ? "ok " : "ERR"} ${(row.id ?? "").padEnd(24)} expected ${row.expected ? "risky   " : "harmless"} | on-device ${local.findings.some((f) => f.severity === "attention") ? "warn" : "none"} | final ${flagged ? "warn" : "none"} | AI ${ai ? (completed ? "completed" : "FALLBACK") : "-"} | AI-added ${result.findings.filter((f) => f.origin === "ai" && f.severity === "attention").length} | withdrawn ${result.findings.filter((f) => f.aiReview).length}`,
    );
  const tier = assessRisk(result);
  if (tier.safetyEstablished !== false)
    throw new Error("Unsafe verdict contract.");
  for (const key of [row.language, "ALL"]) {
    const t = tally.get(key) ?? {
      risky: 0,
      riskyFlagged: 0,
      harmless: 0,
      harmlessFlagged: 0,
      harmlessStrong: 0,
      completed: 0,
      total: 0,
    };
    t.total++;
    if (completed) t.completed++;
    if (row.expected) {
      t.risky++;
      if (flagged) t.riskyFlagged++;
    } else {
      t.harmless++;
      if (flagged) t.harmlessFlagged++;
      if (tier.level === "strong") t.harmlessStrong++;
    }
    tally.set(key, t);
  }
}
console.log(
  `${check ? "CHECK SET" : sealed ? "HELD-OUT holdout-150" : "DEVELOPMENT"} ${ai ? "AI (rules + pattern model + consented AI review)" : "OFFLINE (rules + pattern model)"}: ${rows.length} messages${ai ? `, pace ${paceMs} ms, HTTP ${JSON.stringify(statuses)}` : ""}`,
);
for (const [key, t] of [...tally].sort(([a], [b]) =>
  a === "ALL" ? 1 : b === "ALL" ? -1 : a.localeCompare(b),
)) {
  const accuracy =
    ((t.riskyFlagged + t.harmless - t.harmlessFlagged) / t.total) * 100;
  console.log(
    `${key.padEnd(8)} accuracy ${accuracy.toFixed(1)}% | risky flagged ${t.riskyFlagged}/${t.risky} | harmless flagged ${t.harmlessFlagged}/${t.harmless} (${((t.harmlessFlagged / Math.max(1, t.harmless)) * 100).toFixed(1)}%) | harmless Strong ${t.harmlessStrong}${ai ? ` | AI completed ${t.completed}/${t.total}` : ""}`,
  );
}
