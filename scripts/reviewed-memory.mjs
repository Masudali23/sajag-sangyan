import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  reviewedRecordSchema,
  validateReviewedCorpus,
  createReviewedMemory,
} from "../server/reviewed-memory.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staging = path.join(root, "artifacts/reviewed-memory");
async function readJson(file) {
  if ((await stat(file)).size > 200000)
    throw new Error("Input exceeds the reviewed-memory file limit.");
  return JSON.parse(await readFile(file, "utf8"));
}
function validRecord(value) {
  const parsed = reviewedRecordSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(
      "Proposal rejected: invalid provenance, review, source, bounds or sanitized content. No proposal text is printed.",
    );
  return parsed.data;
}
async function writeNew(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}
async function main() {
  const [command, target, ...args] = process.argv.slice(2);
  if (command === "validate" && !args.length) {
    const corpus = validateReviewedCorpus(
      await readJson(
        target
          ? path.resolve(target)
          : path.join(root, "data/reviewed-corrections.v1.json"),
      ),
    );
    if (!corpus)
      throw new Error(
        "Active corpus rejected: only bounded, reviewed, sanitized synthetic development records with valid source/category references are accepted.",
      );
    const memory = createReviewedMemory(corpus);
    console.log(
      JSON.stringify({
        valid: true,
        version: memory.version,
        sha256: memory.hash,
        reviewedRecords: memory.records.length,
        providerContacted: false,
        userDataRead: false,
      }),
    );
    return;
  }
  if (command === "stage" && target && !args.length) {
    const record = validRecord(await readJson(path.resolve(target)));
    if (record.status !== "proposed" || record.review)
      throw new Error(
        "Staging requires a proposed synthetic record without a prior review.",
      );
    const file = path.join(staging, "proposals", `${record.id}.json`);
    await writeNew(file, record);
    console.log(
      JSON.stringify({
        status: "proposed",
        path: path.relative(root, file),
        activeCorpusChanged: false,
        providerContacted: false,
      }),
    );
    return;
  }
  if (command === "review" && /^memory-[a-z0-9-]{2,73}$/.test(target ?? "")) {
    if (
      args.length !== 4 ||
      args[0] !== "--reviewer" ||
      args[2] !== "--rationale"
    )
      throw new Error(
        "Review needs --reviewer NAME --rationale TEXT in that order.",
      );
    const record = validRecord(
      await readJson(path.join(staging, "proposals", `${target}.json`)),
    );
    if (record.id !== target || record.status !== "proposed")
      throw new Error("Proposal identity or status mismatch.");
    const reviewed = validRecord({
      ...record,
      status: "reviewed",
      review: {
        reviewer: args[1],
        rationale: args[3],
        reviewedAt: new Date().toISOString().slice(0, 10),
      },
    });
    const file = path.join(staging, "reviewed", `${reviewed.id}.json`);
    await writeNew(file, reviewed);
    console.log(
      JSON.stringify({
        status: "reviewed-staged",
        path: path.relative(root, file),
        activeCorpusChanged: false,
        nextStep:
          "Inspect the pair and source rationale. Explicitly add it to the tracked corpus in a reviewed change, increment its version, validate and rerun development checks before deployment.",
        providerContacted: false,
      }),
    );
    return;
  }
  throw new Error(
    "Usage: node scripts/reviewed-memory.mjs validate [corpus.json] | stage proposal.json | review memory-ID --reviewer NAME --rationale TEXT",
  );
}
try {
  await main();
} catch (error) {
  // No parser excerpts, raw proposal content, user text or secret-bearing exception detail.
  const safe =
    error instanceof Error &&
    (error.message.startsWith("Usage:") ||
      /^(Input exceeds|Proposal rejected|Active corpus rejected|Staging requires|Review needs|Proposal identity)/.test(
        error.message,
      ))
      ? error.message
      : "Reviewed-memory operation failed. Check JSON structure, safe paths and whether an immutable staged file already exists.";
  console.error(safe);
  process.exitCode = 1;
}
