import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { analyzeClaim } from "../shared/engine";
import { assessRisk } from "../shared/risk";
import type { Language } from "../shared/types";

const fixturePath = new URL(
  "./fixtures/cycle7-development.json",
  import.meta.url,
);
const bytes = readFileSync(fixturePath);
const fixture = JSON.parse(bytes.toString());
type Case = {
  id: string;
  pairId: string;
  language: string;
  text: string;
  expectedAttention: boolean;
  expectedCategories: string[];
  expectedNoStrong: boolean;
  theme: string;
};
const cases = fixture.items as Case[];

describe("Cycle7 development contrast inventory", () => {
  it("preserves the authored100-case snapshot and its development-only provenance", () => {
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "88a58003a43b6a857988a6510aa9ad9e00b47a6015f6e5838932ee4719afc601",
    );
    expect(cases).toHaveLength(100);
    expect(fixture.provenance.sealedDataUsed).toBe(false);
    expect(fixture.provenance.independentAccuracyEvidence).toBe(false);
    expect(new Set(cases.map((r) => r.id)).size).toBe(100);
    expect(new Set(cases.map((r) => r.text)).size).toBe(100);
  });
  it.each(["en", "hi", "bn", "hi-Latn", "bn-Latn"])(
    "contains10 risky/10 benign cases in %s",
    (language) => {
      const selected = cases.filter((r) => r.language === language);
      expect(selected.filter((r) => r.expectedAttention)).toHaveLength(10);
      expect(selected.filter((r) => !r.expectedAttention)).toHaveLength(10);
      for (const pairId of new Set(selected.map((r) => r.pairId))) {
        const pair = selected.filter((r) => r.pairId === pairId);
        expect(pair.map((r) => r.expectedAttention).sort()).toEqual([
          false,
          true,
        ]);
        expect(pair[0].theme).toBe(pair[1].theme);
      }
    },
  );
});

describe("Cycle7 solicitation and context development regressions", () => {
  it.each(cases)("$id — $theme", (row) => {
    const result = analyzeClaim(
      row.text,
      row.language.split("-")[0] as Language,
    );
    const attention = result.findings.filter((f) => f.severity === "attention");
    expect(
      attention.length > 0,
      `${row.id}: ${attention.map((f) => f.id).join(", ")}`,
    ).toBe(row.expectedAttention);
    if (row.expectedAttention)
      expect(
        attention.some((f) => row.expectedCategories.includes(f.id)),
        `${row.id}: expected ${row.expectedCategories.join(", ")}; got ${attention.map((f) => f.id).join(", ")}`,
      ).toBe(true);
    const risk = assessRisk(result);
    expect(risk.safetyEstablished).toBe(false);
    if (row.expectedNoStrong) expect(risk.level).not.toBe("strong");
  });
});
