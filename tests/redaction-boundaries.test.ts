import { describe, expect, it } from "vitest";
import { analyzeClaim, redactSensitive } from "../shared/engine";

// Synthetic identifiers only. These are development/privacy regressions, not holdouts.
describe("message formatting must not expose common secret values", () => {
  const cases = [
    ["wrapped OTP", "My OTP:\n123456", "123456"],
    ["wrapped Hindi OTP", "मेरा ओटीपी:\n१२३४५६", "१२३४५६"],
    ["wrapped Bengali OTP", "আমার ওটিপি:\n১২৩৪৫৬", "১২৩৪৫৬"],
    ["zero-width OTP label", "O\u200bT\u200bP: 123456", "123456"],
    [
      "zero-width OTP digits",
      "OTP: 1\u200b2\u200b3\u200b4\u200b5\u200b6",
      "123456",
    ],
    ["word-joined CVV", "CVV: 1\u20602\u20603", "123"],
    ["fullwidth OTP", "ＯＴＰ: １２３４５６", "123456"],
    ["spaced OTP label", "O T P: 123456", "123456"],
    ["lookalike PIN label", "ΡIN: 123456", "123456"],
    ["spaced CVV label", "C V V: 123", "123"],
    ["lookalike password label", "pаssword: syntheticSecret42", "syntheticSecret42"],
    ["keycap OTP digits", "OTP: 1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣", "123456"],
    ["emoji inside OTP digits", "OTP: 1🔥2🔥3🔥4🔥5🔥6", "123456"],
    [
      "wrapped labelled account",
      "Account number:\n12345678901234",
      "12345678901234",
    ],
    [
      "zero-width email",
      "Email me at learner\u200b@example.test",
      "learner@example.test",
    ],
  ];
  it.each(cases)("%s", (_name, text, secret) => {
    const normalizedSecret = secret.normalize("NFKC");
    for (const masked of [redactSensitive(text), analyzeClaim(text).input]) {
      const normalized = masked
        .normalize("NFKC")
        .replace(/[\p{Default_Ignorable_Code_Point}\p{Extended_Pictographic}\p{Emoji_Modifier}\u20e3\s]/gu, "");
      expect(normalized).not.toContain(normalizedSecret);
      expect(masked).toMatch(/removed/);
    }
  });
  it("preserves unlabelled financial percentages and amounts", () => {
    const text =
      "The illustration starts with 10000 tokens, loses 20%, then needs 25% to recover.";
    expect(redactSensitive(text)).toBe(text);
  });
  it("preserves a request cue when the supplied OTP value is removed", () => {
    const text = "Send your OTP 123456 to me to verify your account.";
    const analysis = analyzeClaim(text);
    expect(analysis.input).not.toContain("123456");
    expect(analysis.findings.some((f) => f.id === "credentials")).toBe(true);
  });
});
