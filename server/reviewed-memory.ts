import { createHash } from "node:crypto";
import { z } from "zod";
import rawCorpus from "../data/reviewed-corrections.v1.json" with { type: "json" };
import { RULE_IDS, redactSensitive } from "../shared/engine.ts";
import type { Language, RetrievedEvidence } from "../shared/types.ts";
import { evidenceCorpus } from "./evidence-corpus.ts";
import { retrievalTokens } from "./retrieval.ts";

export const REVIEWED_MEMORY_PROMPT_VERSION = "contrast-demonstrations-v1";
export const MAX_REVIEWED_PAIRS = 2;
export const MAX_REVIEWED_CONTEXT_CHARS = 1500;
const id = z.string().regex(/^[a-z][a-z0-9-]{2,79}$/);
const unsafeInstruction =
  /(?:ignore|override|disregard)\s+(?:all\s+|the\s+|previous\s+|prior\s+|system\s+)*(?:instructions?|rules?|prompt)|system\s*(?:prompt|message)|(?:return|output)\s+(?:only\s+)?(?:json|findings)|(?:tool_calls|evidenceIds|untrusted_message)|(?:पिछले|सभी)\s+निर्देश.*(?:भूल|अनदेखा)|(?:আগের|সব)\s+নির্দেশ.*(?:ভুলে|উপেক্ষা)/iu;
const text = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .refine(
      (value) =>
        !/[\p{Cc}\p{Cf}]/u.test(value) &&
        !/https?:\/\/|www\.|[<>`]/iu.test(value) &&
        redactSensitive(value) === value &&
        !unsafeInstruction.test(value),
      "Only sanitized synthetic demonstration text is permitted",
    );
const pair = z
  .object({ text: text(12, 400), explanation: text(15, 140) })
  .strict();
export const reviewedRecordSchema = z
  .object({
    id: id.refine(
      (value) => value.startsWith("memory-"),
      "Memory IDs need their own namespace",
    ),
    status: z.enum(["proposed", "reviewed"]),
    language: z.enum(["en", "hi", "bn", "hi-Latn", "bn-Latn"]),
    categoryIds: z.array(z.enum(RULE_IDS)).min(1).max(3),
    sourceIds: z.array(id).min(1).max(3),
    provenance: z
      .object({
        kind: z.literal("synthetic-development"),
        dataset: z.enum([
          "development-360",
          "external-development-240",
          "reviewed-memory-seed",
        ]),
        caseIds: z
          .array(
            z
              .string()
              .regex(
                /^(?:dev2?-[a-zA-Z0-9-]{2,100}|syn-(?:en|hi|bn)-dev-\d{3})$/,
              ),
          )
          .length(2),
      })
      .strict(),
    review: z
      .object({
        reviewer: text(3, 100),
        reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        rationale: text(25, 360),
      })
      .strict()
      .optional(),
    terms: z.array(text(2, 40)).min(2).max(12),
    positive: pair,
    caution: pair,
  })
  .strict()
  .superRefine((record, ctx) => {
    const reject = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    if (record.status === "reviewed" && !record.review)
      reject("Reviewed records require an explicit review");
    if (record.positive.text === record.caution.text)
      reject("Contrasts must differ");
    const external = record.provenance.dataset === "external-development-240";
    if (
      record.provenance.caseIds.some(
        (caseId) => external !== caseId.startsWith("syn-"),
      )
    )
      reject("Development case namespace must match its declared dataset");
    for (const items of [
      record.categoryIds,
      record.sourceIds,
      record.terms,
      record.provenance.caseIds,
    ])
      if (new Set(items).size !== items.length)
        reject("Duplicate record metadata");
    // Link rationale to relevant official guidance without treating the example as evidence.
    for (const sourceId of record.sourceIds)
      if (
        !evidenceCorpus.some(
          (card) =>
            card.sourceId === sourceId &&
            card.categoryIds.some((category) =>
              record.categoryIds.includes(category),
            ),
        )
      )
        reject("Unknown or unrelated authoritative source");
    for (const category of record.categoryIds)
      if (
        !evidenceCorpus.some(
          (card) =>
            record.sourceIds.includes(card.sourceId) &&
            card.categoryIds.includes(category),
        )
      )
        reject(
          "Every demonstration category requires relevant official guidance",
        );
  });
const corpusSchema = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().regex(/^reviewed-corrections-[a-z0-9-]{3,64}$/),
    scope: z.literal("synthetic-development-only"),
    records: z.array(reviewedRecordSchema).min(1).max(60),
  })
  .strict()
  .superRefine((corpus, ctx) => {
    const ids = new Set<string>(),
      cases = new Set<string>(),
      examples = new Set<string>();
    for (const record of corpus.records) {
      if (ids.has(record.id))
        ctx.addIssue({ code: "custom", message: "Duplicate memory ID" });
      ids.add(record.id);
      for (const caseId of record.provenance.caseIds) {
        if (cases.has(caseId))
          ctx.addIssue({
            code: "custom",
            message: "Duplicate development case ID",
          });
        cases.add(caseId);
      }
      for (const example of [record.positive.text, record.caution.text]) {
        if (examples.has(example))
          ctx.addIssue({
            code: "custom",
            message: "Duplicate demonstration text",
          });
        examples.add(example);
      }
    }
  });
export type ReviewedCorpus = z.infer<typeof corpusSchema>;
export function validateReviewedCorpus(value: unknown, allowProposed = false) {
  const parsed = corpusSchema.safeParse(value);
  if (
    !parsed.success ||
    (!allowProposed &&
      parsed.data.records.some((record) => record.status !== "reviewed"))
  )
    return null;
  return parsed.data;
}
export type ReviewedMemory = {
  enabled: boolean;
  version: string;
  hash: string;
  records: ReviewedCorpus["records"];
};
function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const item of Object.values(value)) freezeDeep(item);
  }
  return value;
}
export function createReviewedMemory(value: unknown): ReviewedMemory {
  const parsed = validateReviewedCorpus(value);
  // Invalid or proposed data is never partially admitted to the model context.
  const serialized = parsed
    ? JSON.stringify(parsed)
    : "disabled-invalid-reviewed-memory";
  return freezeDeep({
    enabled: Boolean(parsed),
    version: parsed?.version ?? "disabled",
    hash: createHash("sha256").update(serialized).digest("hex"),
    records: parsed?.records ?? [],
  });
}
export const reviewedMemory = createReviewedMemory(rawCorpus);
export type ReviewedContrast = {
  id: string;
  language: string;
  categoryIds: string[];
  possibleCue: { text: string; explanation: string };
  cautionOrEducation: { text: string; explanation: string };
};
export type ReviewedSelection = {
  version: string;
  hash: string;
  promptVersion: string;
  pairs: ReviewedContrast[];
};
export function selectReviewedMemory(
  message: string,
  language: Language,
  evidence: RetrievedEvidence[],
  memory = reviewedMemory,
): ReviewedSelection {
  const result: ReviewedSelection = {
    version: memory.version,
    hash: memory.hash,
    promptVersion: REVIEWED_MEMORY_PROMPT_VERSION,
    pairs: [],
  };
  if (!memory.enabled || !evidence.length) return result;
  const query = new Set(retrievalTokens(message.slice(0, 6000)));
  const scriptLanguage = /\p{Script=Devanagari}/u.test(message)
    ? "hi"
    : /\p{Script=Bengali}/u.test(message)
      ? "bn"
      : null;
  const ranked = memory.records
    .map((record) => {
      const compatible = record.categoryIds.every((category) =>
        evidence.some(
          (card) =>
            card.categoryIds.includes(category) &&
            record.sourceIds.includes(card.sourceId),
        ),
      );
      if (
        !compatible ||
        (scriptLanguage
          ? record.language !== scriptLanguage
          : record.language === "hi" || record.language === "bn")
      )
        return { record, score: 0 };
      const terms = new Set(retrievalTokens(record.terms.join(" ")));
      const overlaps = [...terms].filter((token) => query.has(token)).length;
      if (!overlaps) return { record, score: 0 };
      const preferred =
        scriptLanguage ?? (language === "en" ? "en" : `${language}-Latn`);
      return {
        record,
        score: overlaps * 3 + (record.language === preferred ? 1 : 0),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id),
    );
  for (const { record } of ranked) {
    // One best-language contrast per family avoids filling the small budget with translations of the same pair.
    if (
      result.pairs.some((pair) =>
        pair.categoryIds.some((category) =>
          record.categoryIds.includes(
            category as (typeof record.categoryIds)[number],
          ),
        ),
      )
    )
      continue;
    const pair: ReviewedContrast = {
      id: record.id,
      language: record.language,
      categoryIds: [...record.categoryIds],
      possibleCue: { ...record.positive },
      cautionOrEducation: { ...record.caution },
    };
    if (
      JSON.stringify([...result.pairs, pair]).length <=
      MAX_REVIEWED_CONTEXT_CHARS
    )
      result.pairs.push(pair);
    if (result.pairs.length === MAX_REVIEWED_PAIRS) break;
  }
  return result;
}
