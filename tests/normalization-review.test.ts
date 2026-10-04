import { describe, expect, it } from "vitest";
import { analyzeClaim, detectionTextFor } from "../shared/engine";

// General representation properties with authored offer/caution contrasts.
// The independent reviewer supplied development perturbations, not holdout cases.
const greek: Record<string, string> = {
  o: "ο",
  u: "υ",
  A: "Α",
  B: "Β",
  E: "Ε",
  H: "Η",
  I: "Ι",
  K: "Κ",
  M: "Μ",
  N: "Ν",
  O: "Ο",
  P: "Ρ",
  T: "Τ",
  X: "Χ",
  Y: "Υ",
};
const cyrillic: Record<string, string> = {
  a: "а",
  e: "е",
  o: "о",
  p: "р",
  c: "с",
  x: "х",
  y: "у",
  A: "А",
  E: "Е",
  O: "О",
  P: "Р",
  C: "С",
  X: "Х",
  Y: "У",
  T: "Т",
};
const transforms: [string, (text: string) => string][] = [
  [
    "emoji within Latin words",
    (text) => text.replace(/\b([A-Za-z]{2})([A-Za-z]{3,})\b/g, "$1🔥$2"),
  ],
  ["Greek lookalikes", (text) => [...text].map((c) => greek[c] ?? c).join("")],
  [
    "Cyrillic lookalikes",
    (text) => [...text].map((c) => cyrillic[c] ?? c).join(""),
  ],
  [
    "keycap digits",
    (text) => text.replace(/[0-9]/g, (digit) => `${digit}\ufe0f\u20e3`),
  ],
  [
    "known spaced acronyms",
    (text) =>
      text.replace(/\b(?:OTP|PIN|CVV|UPI|KYC|NAV|GST|SEBI)\b/gi, (token) =>
        [...token].join(" "),
      ),
  ],
];
const contrasts = [
  [
    "credentials",
    "Send your OTP and UPI PIN to me to verify your account.",
    "Never share your OTP or UPI PIN with anyone.",
  ],
  [
    "guarantee",
    "Our investment guarantees 5% daily profit.",
    "Beware of offers promising guaranteed daily returns; never transfer money to them.",
  ],
  [
    "release-fee",
    "Pay a GST fee before we release your withdrawal.",
    "Never pay an extra GST fee to release your withdrawal; beware of such requests.",
  ],
  [
    "outsized",
    "Our investment pays 60% by tomorrow.",
    "A 60% return by tomorrow is not guaranteed; this is an illustration of uncertainty.",
  ],
];

describe("shared normalization handles formatting without changing meaning", () => {
  for (const [name, transform] of transforms) {
    for (const [category, offer, caution] of contrasts) {
      it(`${name}: ${category} offer and caution retain their interpretation`, () => {
        const rawOffer = analyzeClaim(offer);
        expect(rawOffer.findings.map((f) => f.id)).toContain(category);
        expect(
          analyzeClaim(transform(offer)).findings.map((f) => f.id),
        ).toContain(category);
        for (const text of [caution, transform(caution)])
          expect(
            analyzeClaim(text).findings.filter(
              (f) => f.severity === "attention",
            ),
          ).toEqual([]);
      });
    }
    it(`${name} preserves a separate actual solicitation after a lesson`, () => {
      const text =
        'A safety lesson quotes "never share your OTP". Our actual support requests "send your OTP to our agent".';
      expect(analyzeClaim(transform(text)).findings.map((f) => f.id)).toContain(
        "credentials",
      );
    });
  }
  it.each([
    ["gu🔥aranteed", "guaranteed"],
    ["12🔥34", "1234"],
    ["pay 🔥 now", "pay now"],
    ["6\ufe0f\u20e30\ufe0f\u20e3%", "60%"],
    ["S E B I K Y C N A V G S T", "SEBI KYC NAV GST"],
    ["Νever share ΟΤΡ or ΡΙΝ", "Never share OTP or PIN"],
    ["РАУ", "PAY"],
  ])("%s has a bounded matching representation", (input, expected) => {
    expect(detectionTextFor(input)).toBe(expected);
  });
  it("preserves public text and the original excerpt", () => {
    const text = "Send your O🔥TP to our agent.";
    const result = analyzeClaim(text);
    expect(result.input).toBe(text);
    expect(result.findings.find((f) => f.id === "credentials")?.excerpt).toBe(
      text.slice(0, -1),
    );
  });
  it("does not transliterate unrelated scripts or invent adjoining words", () => {
    expect(detectionTextFor("जोखिम ঝুঁকি κίνδυνος")).toBe(
      "जोखिम ঝুঁকি κίνδυνος",
    );
    expect(detectionTextFor("return 🔥 promise")).toBe("return promise");
  });
});

describe("emoji without spaces can also separate complete words", () => {
  it("retains a request separated by emoji", () => {
    const text = "Send🔥your🔥OTP🔥to🔥our🔥support🔥agent.";
    expect(analyzeClaim(text).findings.map((f) => f.id)).toContain(
      "credentials",
    );
  });
  it("retains a caution separated by emoji", () => {
    const text = "Never🔥share🔥your🔥OTP🔥with🔥anyone.";
    expect(
      analyzeClaim(text).findings.filter((f) => f.severity === "attention"),
    ).toEqual([]);
  });
});
