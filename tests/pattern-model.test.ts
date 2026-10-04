import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import model from "../data/pattern-model.v1.json" with { type: "json" };
import { analyzeClaim, redactSensitive } from "../shared/engine.ts";
import { assessRisk } from "../shared/risk.ts";
import {
  PATTERN_FINDING_ID,
  PATTERN_THRESHOLD,
  analyzeMessage,
  asksReaderToAct,
  patternFinding,
  patternScore,
  patternTokens,
  soundKey,
} from "../shared/pattern-model.ts";

type ParityCase = { fixture: string; id: string; probability: number };
const parity = JSON.parse(
  readFileSync("tests/fixtures/pattern-model-parity.json", "utf8"),
) as { cases: ParityCase[] };

function fixtureText(fixture: string, id: string) {
  const data = JSON.parse(readFileSync(`tests/fixtures/${fixture}`, "utf8"));
  const items: { id?: string; text: string }[] = Array.isArray(data)
    ? data
    : (data.items ??
      data.cases ??
      Object.values(data).find((value) => Array.isArray(value)));
  const item = items.find((entry, index) => String(entry.id ?? index) === id);
  if (!item) throw new Error(`Missing parity case ${fixture}#${id}`);
  // The model scores the masked text devices analyse.
  return redactSensitive(item.text);
}

describe("on-device pattern model", () => {
  it("matches the Python trainer's probabilities exactly", () => {
    expect(parity.cases.length).toBeGreaterThanOrEqual(60);
    for (const entry of parity.cases)
      expect(
        Math.abs(
          patternScore(fixtureText(entry.fixture, entry.id)) -
            entry.probability,
        ),
      ).toBeLessThan(1e-9);
  });

  it("ships the validated, pruned model configuration", () => {
    expect(model.weights).toHaveLength(20000);
    expect(model.indexDeltas).toHaveLength(20000);
    expect(PATTERN_THRESHOLD).toBe(0.7);
    expect(model.training.scope).toMatch(/no sealed set/);
    expect(Object.keys(model.training.fixtures)).not.toContain(
      "dataset-development-v1.json",
    );
  });

  it("tokenizes scripts, digits and currency like the trainer", () => {
    expect(patternTokens("Pay ₹4,999 TODAY!! ৳ ৩০%")).toEqual([
      "pay",
      "₹",
      "0",
      "000",
      "today",
      "00",
      "%",
    ]);
    expect(soundKey("पैसा")).toBe(soundKey("paisa"));
    expect(soundKey("টাকা")).toBe(soundKey("taka"));
    expect(soundKey("जमा")).toBe(soundKey("jama"));
  });

  it("warns with an exact excerpt only above the threshold, never as a safety verdict", () => {
    const scam =
      "Join our VIP stock tips group, 30% monthly profit guaranteed. Pay the ₹4,999 joining fee today on WhatsApp.";
    const finding = patternFinding(scam);
    expect(finding).toMatchObject({
      id: PATTERN_FINDING_ID,
      severity: "attention",
      origin: "local",
    });
    expect(scam.includes(finding!.excerpt)).toBe(true);
    expect(finding!.excerpt.length).toBeGreaterThanOrEqual(6);
    expect(finding!.excerpt.length).toBeLessThanOrEqual(300);
    expect(
      patternFinding("See you at the temple at six, bring the prasad box."),
    ).toBeNull();
  });

  it("never warns on genuine notices that ask the reader to do nothing, however topical", () => {
    for (const notice of [
      "Your income tax refund of ₹4,870 for AY 2026-27 has been processed and credited to your registered bank account.",
      "A dividend of ₹1,850 has been credited to your account ending 7712. Refund of ₹640 also processed.",
    ]) {
      expect(patternScore(notice)).toBeGreaterThanOrEqual(PATTERN_THRESHOLD);
      expect(asksReaderToAct(notice)).toBe(false);
      expect(patternFinding(notice)).toBeNull();
    }
    for (const ask of [
      "Pay ₹500 now",
      "OTP हमें बताइए",
      "এই লিংকে ক্লিক করুন",
      "QR scan karo aur PIN daalo",
      "taka pathan",
    ])
      expect(asksReaderToAct(ask)).toBe(true);
  });

  it("adds its warning only when no rule fired, at the Potential level and never Strong", () => {
    const text =
      "Your parcel is on hold. Click the link and pay ₹49 redelivery charge today.";
    const rules = analyzeClaim(text, "en");
    const message = analyzeMessage(text, "en");
    if (rules.findings.some((f) => f.severity === "attention"))
      expect(message.findings).toEqual(rules.findings);
    else {
      expect(message.findings.at(-1)).toMatchObject({
        id: PATTERN_FINDING_ID,
        severity: "attention",
      });
      expect(message.status).toBe("attention");
      expect(message.aiAssisted).toBe(false);
      expect(assessRisk(message).level).toBe("potential");
    }
    // A pattern warning is never an independent family for the Strong tier.
    const action = analyzeClaim(
      "Share the OTP sent to your phone with our officer now.",
      "en",
    );
    const level = assessRisk(action).level;
    const withPattern = {
      ...action,
      findings: [
        ...action.findings,
        { ...patternFinding(text)!, id: PATTERN_FINDING_ID },
      ],
    };
    expect(assessRisk(withPattern).level).toBe(
      level === "insufficient" ? "potential" : level,
    );
    // Genuine credit notices stay without a pattern warning.
    const notice = analyzeMessage(
      "Your income tax refund of ₹4,870 for AY 2026-27 has been processed and credited to your registered bank account.",
      "en",
    );
    expect(notice.findings.some((f) => f.id === PATTERN_FINDING_ID)).toBe(
      false,
    );
  });

  it("is deterministic and bounded for empty, long and unusual input", () => {
    for (const text of ["", " ", "🙂🙂🙂", "्््", "a".repeat(6000)]) {
      const score = patternScore(text);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
      expect(patternScore(text)).toBe(score);
    }
  });
});
