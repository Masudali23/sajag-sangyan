import { describe, expect, it } from "vitest";
import { analyzeClaim } from "../shared/engine";
import { assessRisk } from "../shared/risk";
import type { Finding } from "../shared/types";

const cue = (id: string, excerpt: string): Finding => ({
  id,
  excerpt,
  severity: "attention",
  origin: "local",
  sourceIds: [],
  title: { en: "Warning", hi: "चेतावनी", bn: "সতর্কতা" },
  explanation: { en: "Check this", hi: "जाँचें", bn: "যাচাই করুন" },
});

describe("cycle7 strong-tier precision", () => {
  it.each([
    "Pay a release fee to unlock your task earnings.",
    "Pay a release fee to unlock your guaranteed profits. You get guaranteed daily returns.",
  ])("overlapping fee and return cues cannot inflate %s", (input) => {
    const findings = [
      "release-fee",
      "pay-to-earn",
      "guarantee",
      "periodic",
    ].map((id) => cue(id, input));
    expect(assessRisk({ input, findings }).level).toBe("potential");
  });
  it.each([
    "Never share your OTP. An awareness poster quotes 'Pay a release fee to unlock your profits' as a warning.",
    "किसी को अपना OTP बताइए नहीं। गारंटी पर भरोसा न करें।",
    "OTP কাউকে বলবেন না। কেউ লাভের গ্যারান্টি দিতে পারে না।",
    "Kisi ko OTP mat batao. Koi profit guarantee nahi de sakta.",
    "OTP kauke bolben na. Keu profit guarantee dite pare na.",
  ])(
    "even mislabelled cues cannot make a protective message Strong: %s",
    (input) => {
      const findings = [
        "credentials",
        "release-fee",
        "guarantee",
        "urgency",
      ].map((id) => cue(id, input));
      expect(assessRisk({ input, findings }).level).toBe("potential");
      expect(assessRisk(analyzeClaim(input)).level).not.toBe("strong");
    },
  );
  it("a stale or fabricated excerpt does not count as action evidence", () => {
    const excerpt = "Send your OTP. Pay a release fee to unlock your funds.";
    const findings = [cue("credentials", excerpt), cue("release-fee", excerpt)];
    expect(
      assessRisk({ input: "My bank statement is ready.", findings }).level,
    ).toBe("potential");
    expect(assessRisk({ findings }).level).toBe("potential");
  });
  it("independent active credential and release-fee demands remain Strong", () => {
    const analysis = analyzeClaim(
      "Send your OTP. Pay a release fee to unlock your funds.",
    );
    expect(assessRisk(analysis).level).toBe("strong");
    expect(assessRisk(analysis).safetyEstablished).toBe(false);
  });
  it("a protective introduction does not cancel an independent later request", () => {
    const analysis = analyzeClaim(
      "Never share your OTP with strangers. But send your password to our agent, act now.",
    );
    expect(
      analysis.findings.some(
        (f) => f.id === "credentials" && f.severity === "attention",
      ),
    ).toBe(true);
    expect(assessRisk(analysis).level).toBe("strong");
  });
  it("the same demand quoted in a lesson does not elevate a separate ordinary sentence", () => {
    const input =
      "The lesson quotes 'Send your OTP. Pay a release fee to unlock your funds' to teach people about fraud. Your course fee is due on Monday.";
    expect(
      assessRisk({
        input,
        findings: [
          cue("credentials", "Send your OTP"),
          cue("release-fee", "Pay a release fee to unlock your funds"),
        ],
      }).level,
    ).toBe("potential");
  });
});
