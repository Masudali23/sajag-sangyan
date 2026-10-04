import { describe, expect, it } from "vitest";
import { analyzeClaim, redactSensitive, RULE_IDS } from "../shared/engine";
import { sources } from "../shared/content";
import type { Language } from "../shared/types";
import development from "./fixtures/expanded-development-v2.json";

// This corpus is visible development material with correlated translations and
// transformations. Passing it is regression coverage, never independent accuracy.
const languageFor = (language: string): Language =>
  language === "hi-Latn"
    ? "hi"
    : language === "bn-Latn"
      ? "bn"
      : (language as Language);

describe("reviewed expanded development wording", () => {
  it("keeps the frozen development composition explicit", () => {
    expect(development.items).toHaveLength(360);
    expect(new Set(development.items.map((item) => item.id)).size).toBe(360);
    for (const language of ["en", "hi", "bn", "hi-Latn", "bn-Latn"])
      expect(
        development.items.filter((item) => item.language === language),
      ).toHaveLength(72);
    expect(
      development.items.filter((item) => item.expectedAttention),
    ).toHaveLength(170);
    expect(development.attentionCategories).toHaveLength(17);
    expect(development.contextCategories).toHaveLength(4);
    expect(
      new Set([
        ...development.attentionCategories,
        ...development.contextCategories,
      ]),
    ).toEqual(new Set(RULE_IDS.filter((id) => id !== "abusive-pressure")));
    // New family is tested separately; preserve the original frozen 21-family corpus.
    expect(RULE_IDS).toContain("abusive-pressure");
  });
  it.each(development.items)(
    "$id preserves its reviewed wording expectation",
    (item) => {
      const result = analyzeClaim(item.text, languageFor(item.language));
      expect(
        result.findings.some((finding) => finding.severity === "attention"),
      ).toBe(item.expectedAttention);
      for (const id of item.expectedCategories) {
        const found = result.findings.find((finding) => finding.id === id);
        expect(found).toBeDefined();
        const categorySeverities = (
          item as { categorySeverities?: Record<string, string> }
        ).categorySeverities;
        expect(found?.severity).toBe(categorySeverities?.[id]);
        for (const sourceId of found?.sourceIds ?? [])
          expect(sources.some((source) => source.id === sourceId)).toBe(true);
      }
    },
  );
  it("keeps a separate password request after an unrelated caution", () => {
    const result = analyzeClaim(
      "Beware of financial fraud, but send your banking password to our agent.",
    );
    expect(result.findings.some((f) => f.id === "credentials")).toBe(true);
  });
  it("does not edit public warning words when matching invisible formatting", () => {
    const text = "Please send your O\u200bTP to our agent.";
    const result = analyzeClaim(text);
    expect(result.findings.some((f) => f.id === "credentials")).toBe(true);
    expect(result.input).toBe(text);
    expect(result.findings.find((f) => f.id === "credentials")?.excerpt).toBe(
      text.slice(0, -1), // Existing sentence extraction omits its final period.
    );
  });
  it("preserves wrapped caution and does not invent a secret value", () => {
    const text = "Never\nshare your OTP\nwith anyone.";
    expect(redactSensitive(text)).toBe(text);
    expect(
      analyzeClaim(text).findings.some((f) => f.severity === "attention"),
    ).toBe(false);
  });
});
