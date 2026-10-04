import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { analyzeClaim, RULE_IDS } from "../shared/engine";
import { assessRisk } from "../shared/risk";
import type { Language } from "../shared/types";

type DevelopmentCase = {
  id: string;
  partition: string;
  language: Language;
  text: string;
  expectAttention: boolean;
  tags: string[];
};
// These source files also contain a separate holdout. Filter immediately: only
// development cases are selected, printed on failure or passed to the engine.
const cases = ["en", "hi", "bn"].flatMap((language) =>
  (
    JSON.parse(
      readFileSync(
        new URL(
          `./fixtures/message-review-${language}.json`,
          import.meta.url,
        ),
        "utf8",
      ),
    ) as DevelopmentCase[]
  ).filter((item) => item.partition === "development"),
);
const selected = (language: string, ids: number[]) =>
  ids.map((number) => {
    const id = `syn-${language}-dev-${String(number).padStart(3, "0")}`;
    const item = cases.find((item) => item.id === id);
    if (!item) throw Error(`Missing development regression ${id}`);
    return item;
  });
const cautions = [
  ...selected(
    "en",
    [41, 42, 43, 46, 50, 51, 57, 60, 61, 63, 74, 75, 77, 78, 80],
  ),
  ...selected("hi", [42, 59, 75, 76, 77, 80]),
  ...selected("bn", [41, 42, 45, 48, 66, 70, 76, 78, 80]),
];
const offers = [
  ...selected("en", [1, 3, 8, 10, 12, 17, 19, 26, 30, 36]),
  ...selected("hi", [4, 6, 7, 9, 11, 12, 13, 15, 18, 28, 30, 32, 37]),
  ...selected("bn", [2, 5, 6, 10, 12, 17, 19, 26, 29, 30, 33, 39]),
];

describe("external visible development corrections", () => {
  it("uses only the declared 240 development cases", () => {
    expect(cases).toHaveLength(240);
    expect(cases.every((item) => item.partition === "development")).toBe(true);
    for (const language of ["en", "hi", "bn"])
      expect(cases.filter((item) => item.language === language)).toHaveLength(
        80,
      );
  });
  it.each(cautions)("$id remains below attention", (item) => {
    expect(item.expectAttention).toBe(false);
    const result = analyzeClaim(item.text, item.language);
    expect(result.findings.filter((f) => f.severity === "attention")).toEqual(
      [],
    );
    expect(assessRisk(result).level).not.toBe("strong");
  });
  it.each(offers)(
    "$id retains an observable request or financial cue",
    (item) => {
      expect(item.expectAttention).toBe(true);
      const result = analyzeClaim(item.text, item.language);
      expect(result.findings.some((f) => f.severity === "attention")).toBe(
        true,
      );
      expect(
        result.findings.every((f) =>
          RULE_IDS.includes(f.id as (typeof RULE_IDS)[number]),
        ),
      ).toBe(true);
      expect(assessRisk(result).safetyEstablished).toBe(false);
    },
  );
  it("matches obfuscated wording without rewriting the public quotation", () => {
    const text = "Send your O\u00adTP to our agent.";
    const result = analyzeClaim(text);
    expect(result.input).toBe(text);
    expect(result.findings.find((f) => f.id === "credentials")?.excerpt).toBe(
      text.slice(0, -1),
    );
  });
});
