import { describe, expect, it } from "vitest";
import { analyzeClaim } from "../shared/engine";
import type { Language } from "../shared/types";

// External reviewer §10.6's eight newly authored DEVELOPMENT probes, followed
// by explicit contrasts. This small near-transfer review is not a holdout.
const pairs: {
  name: string;
  language: Language;
  offer: string;
  category: string;
  caution: string;
}[] = [
  {
    name: "trailing guarantee",
    language: "en",
    category: "guarantee",
    offer: "You get 4% every day, guaranteed.",
    caution:
      "A 4% daily return is not guaranteed; this illustration can also lose money.",
  },
  {
    name: "Hindi word amounts",
    language: "hi",
    category: "outsized",
    offer:
      "चार हज़ार रुपये का खेती पैकेज लेकर नब्बे दिन बाद चालीस हज़ार रुपये पाना तय है।",
    caution:
      "चार हज़ार रुपये का खेती पैकेज लेकर नब्बे दिन बाद चालीस हज़ार रुपये पाना तय है, ऐसे दावों से सावधान रहें।",
  },
  {
    name: "Hindi digit amounts",
    language: "hi",
    category: "outsized",
    offer: "₹4,000 का खेती पैकेज लेकर 90 दिन बाद ₹40,000 पाना तय है।",
    caution:
      "सावधान: ₹4,000 का खेती पैकेज लेकर 90 दिन बाद ₹40,000 मिलने का वादा प्रमाण नहीं है।",
  },
  {
    name: "approval fee to sender",
    language: "hi",
    category: "release-fee",
    offer:
      "मंजूरी पक्की करने के लिए ₹१,७५० का सत्यापन शुल्क मेरे भुगतान पते पर भेजिए।",
    caution:
      "मंजूरी के नाम पर सत्यापन शुल्क किसी निजी भुगतान पते पर न भेजें; यह सुरक्षा संदेश है।",
  },
  {
    name: "paid upgrade to withdraw",
    language: "bn",
    category: "release-fee",
    offer:
      "Free trial e tomar balance 500 theke 9,500 kore diyechi. Eta tulte account upgrade e 2,000 real money lagbe.",
    caution:
      "Taka tulte upgrade er jonno extra money lagbe na. Age fee dite bola hole sabdhan thakun.",
  },
];
const quotedExamples = [
  [
    "en",
    "The awareness poster reproduces 'gυaranteed pr0fit of 1O% per week' to show how advertisements replace letters with look-alike characters.",
  ],
  [
    "en",
    "The awareness poster reproduces 'guaranteed profit of 10% per week' to show how advertisements make promises.",
  ],
  [
    "hi",
    "आज की कक्षा में यह काल्पनिक संदेश पढ़ेंगे: “रोज़ दस प्रतिशत पक्का लाभ।”",
  ],
] as const;

describe("separately reviewed near-transfer development wording", () => {
  for (const pair of pairs) {
    it(`${pair.name} recognizes its claimed mechanism`, () => {
      expect(
        analyzeClaim(pair.offer, pair.language)
          .findings.filter((f) => f.severity === "attention")
          .map((f) => f.id),
      ).toContain(pair.category);
    });
    it(`${pair.name} keeps the protective opposite below attention`, () => {
      expect(
        analyzeClaim(pair.caution, pair.language).findings.filter(
          (f) => f.severity === "attention",
        ),
      ).toEqual([]);
    });
  }
  it.each(quotedExamples)(
    "%s explicit teaching attribution scopes only the example",
    (language, text) => {
      expect(
        analyzeClaim(text, language).findings.filter(
          (f) => f.severity === "attention",
        ),
      ).toEqual([]);
    },
  );
  it.each(quotedExamples)(
    "%s a separate real offer after the attributed example remains visible",
    (language, text) => {
      const result = analyzeClaim(
        `${text} Our actual investment plan offers "guaranteed 3% daily returns". Send your OTP to me.`,
        language,
      );
      expect(result.findings.map((f) => f.id)).toContain("guarantee");
      expect(result.findings.map((f) => f.id)).toContain("credentials");
    },
  );
});

describe("a rejection must belong to its quoted example", () => {
  it.each([
    [
      "credentials",
      "Do not share passwords. ",
      'This message says "Send OTP to our support agent".',
    ],
    [
      "release-fee",
      "Never follow strange links. ",
      'The invitation reads "Pay a tax fee to release your withdrawal".',
    ],
    [
      "guarantee",
      "Do not share your OTP. ",
      'This message says "Guaranteed 3% daily returns".',
    ],
  ])(
    "%s is not hidden by an unrelated earlier caution",
    (category, unrelatedCaution, quote) => {
      for (const text of [quote, unrelatedCaution + quote])
        expect(
          analyzeClaim(text)
            .findings.filter((f) => f.severity === "attention")
            .map((f) => f.id),
        ).toContain(category);
    },
  );
  it("keeps rejection attached after its own quoted request", () => {
    const text =
      'This message says "Send OTP to our support agent". Never follow that instruction.';
    expect(
      analyzeClaim(text).findings.filter((f) => f.severity === "attention"),
    ).toEqual([]);
  });
});
