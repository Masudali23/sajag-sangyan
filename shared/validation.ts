import { z } from "zod";
import { LANGUAGES } from "./types.ts";
import { bengaliEngineCopy } from "./bengali-engine-copy.ts";
import { sources } from "./content.ts";
// Keep this beside schema construction: lazy-chunk imports may evaluate before
// the browser entry module and strict CSP forbids even a caught eval probe.
z.config({ jitless: true });

// Older saved checks predate Bengali. Rehydrate only existing reviewed copy;
// never discard a person's notebook just because its translation was added later.
const text = z
  .object({
    en: z.string().max(5000),
    hi: z.string().max(5000),
    bn: z.string().max(5000).optional(),
  })
  .transform((value) => ({
    ...value,
    bn:
      value.bn ??
      bengaliEngineCopy[value.en] ??
      "এই পুরোনো লেখার বাংলা অনুবাদ নেই। মূল ভাষায় পড়তে English বেছে নিন।",
  }));
export const analysisSchema = z
  .object({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    input: z.string().max(6000),
    language: z.enum(LANGUAGES),
    status: z.enum(["attention", "context"]),
    contentType: z.enum(["promotional", "educational", "mixed", "unclear"]),
    summary: text,
    findings: z
      .array(
        z.object({
          id: z.string().max(100),
          severity: z.enum(["attention", "context"]),
          title: text,
          explanation: text,
          excerpt: z.string().max(500),
          sourceIds: z.array(z.string().max(100)).max(10),
          origin: z.enum(["local", "ai"]).optional(),
          evidenceIds: z.array(z.string().max(100)).max(3).optional(),
          aiReview: z
            .object({
              decision: z.literal("withdrawn"),
              reason: z.enum([
                "caution-or-warning",
                "negated-or-refused",
                "news-or-report",
                "lesson-or-quote",
                "ordinary-service-notice",
              ]),
            })
            .strict()
            .optional(),
        }),
      )
      .max(32),
    sourceIds: z.array(z.string().max(100)).max(20),
    lessonIds: z
      .array(
        z.enum([
          "risk",
          "diversification",
          "volatility",
          "compounding",
          "fees",
          "nav",
          "nomination",
        ]),
      )
      .max(7),
    limitations: text,
    mode: z.enum(["local", "server"]),
    aiAssisted: z.boolean(),
    languageNotice: text.optional(),
    retrieval: z
      .object({
        method: z.literal("bm25"),
        corpusVersion: z.string().min(1).max(100),
        usedForAi: z.boolean(),
        evidence: z.array(
          z
            .object({
              id: z.string().min(1).max(100),
              sourceId: z.string().max(100),
              title: text,
              passage: text,
              url: z.string().url().max(2000),
              reviewedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              score: z.number().finite().nonnegative(),
              categoryIds: z.array(z.string().max(100)).min(1).max(21),
            })
            .refine(
              (e) =>
                sources.some((s) => s.id === e.sourceId && s.url === e.url),
              "Retrieved guidance must use a curated source URL",
            ),
        ),
      })
      .refine(
        (r) =>
          r.evidence.length <= 5 &&
          (!r.usedForAi || r.evidence.length > 0) &&
          new Set(r.evidence.map((e) => e.id)).size === r.evidence.length,
        "Retrieved evidence must be bounded and unique",
      )
      .optional(),
  })
  .superRefine((analysis, ctx) => {
    if (!analysis.retrieval?.usedForAi) return; // Preserve legacy pre-RAG notebooks.
    for (const [index, finding] of analysis.findings.entries()) {
      if (finding.origin !== "ai") continue;
      const ids = finding.evidenceIds;
      if (
        !ids?.length ||
        new Set(ids).size !== ids.length ||
        !ids.every((id) =>
          analysis.retrieval!.evidence.some(
            (e) => e.id === id && e.categoryIds.includes(finding.id),
          ),
        ) ||
        !finding.excerpt.trim() ||
        !analysis.input.includes(finding.excerpt)
      )
        ctx.addIssue({
          code: "custom",
          path: ["findings", index],
          message:
            "AI cues must quote the message and cite compatible retrieved guidance",
        });
    }
  });
