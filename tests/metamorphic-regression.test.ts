import { describe, expect, it } from "vitest";
import fixture from "./fixtures/metamorphic-development-v2.json";
import { analyzeClaim } from "../shared/engine";
import { assessRisk } from "../shared/risk";
import type { Language } from "../shared/types";

// Known development cases: related perturbations are regression coverage,
// never counted as independent messages or a real-world accuracy estimate.
describe("reviewed meaning survives message formatting", () => {
  it.each(fixture.items)("$id", (item) => {
    const analysis = analyzeClaim(
      item.text,
      item.language.split("-")[0] as Language,
    );
    const attention = analysis.findings
      .filter((f) => f.severity === "attention")
      .map((f) => f.id);
    if (item.group === "attention") expect(attention).toContain(item.category);
    else expect(attention).toEqual([]);
    expect(assessRisk(analysis).safetyEstablished).toBe(false);
    expect(analysis.input.length).toBeLessThanOrEqual(6000);
  });
});
