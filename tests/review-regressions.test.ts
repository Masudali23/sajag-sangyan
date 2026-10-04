import { describe, expect, it } from "vitest";
import roundTwo from "./fixtures/round-two.json";
import independent from "./fixtures/independent-review.json";
import { analyzeClaim, redactSensitive } from "../shared/engine";
import { sources } from "../shared/content";
import { analysisSchema } from "../shared/validation";

// These former holdouts are now regression data, not unseen accuracy evidence.
for (const [name, corpus] of [
  ["Round 2", roundTwo],
  ["Independent review", independent],
] as const) {
  describe(name, () => {
    it.each(corpus.filter((row) => row.scored))("$id: $text", (row) => {
      for (const language of ["en", "hi"] as const) {
        const result = analyzeClaim(row.text, language);
        if (row.group === "scam")
          expect(result.findings.some((f) => f.severity === "attention")).toBe(
            true,
          );
        if (row.group === "benign") expect(result.findings).toEqual([]);
        if (row.group === "mixed") expect(result.contentType).toBe("mixed");
        expect(analysisSchema.safeParse(result).success).toBe(true);
        expect(
          result.sourceIds.every((id) =>
            sources.some((source) => source.id === id),
          ),
        ).toBe(true);
        expect(
          analyzeClaim(redactSensitive(row.text), language).findings.map(
            (f) => f.id,
          ),
        ).toEqual(result.findings.map((f) => f.id));
      }
    });
  });
}
it.each(independent.filter((row) => !row.scored))(
  "explicit language scope: $id",
  (row) => {
    const result = analyzeClaim(row.text);
    if (/\p{Script=Bengali}/u.test(row.text)) {
      // Bengali was out of scope in the original review; it is now a supported beta.
      expect(result.languageNotice).toBeUndefined();
      expect(result.findings.length).toBeGreaterThan(0);
    } else {
      expect(result.languageNotice?.en).toContain("have not validated");
      expect(result.languageNotice?.hi).toContain("अधूरी");
    }
  },
);
