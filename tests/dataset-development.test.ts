import { describe, expect, it } from "vitest";
import { analyzeClaim, redactSensitive, RULE_IDS } from "../shared/engine";
import { sources } from "../shared/content";
import development from "./fixtures/dataset-development-v1.json";

// Authored from development themes, not copied from any held-out evaluation.
const risks: [string, string][] = [
  [
    "credentials",
    "Submit your banking password to complete this verification.",
  ],
  ["credentials", "Click this link to upload your PAN card number."],
  ["credentials", "इस लिंक पर अपना पासवर्ड दर्ज करें।"],
  ["credentials", "OTP submit karo phir account chalu hoga."],
  ["credentials", "এই লিংকে পাসওয়ার্ড লিখুন।"],
  ["credentials", "Apnar password submit korun ekhane."],
  [
    "account-threat",
    "Your debit card has been restricted. Call us to reactivate it.",
  ],
  [
    "account-threat",
    "To avoid account suspension, follow the link in this message.",
  ],
  ["account-threat", "आपका सिम बंद हो जाएगा, इसे चालू करने के लिए कॉल करें।"],
  ["account-threat", "Apka card band hoga, abhi call karo."],
  [
    "account-threat",
    "সতর্কবার্তা: আপনার কার্ড বন্ধ হবে। চালু করতে এই লিংকে যান।",
  ],
  ["account-threat", "Apnar sim bondho hobe, call korun activation er jonno."],
  ["release-fee", "You won a prize. Pay a registration fee before we send it."],
  ["release-fee", "लॉटरी का इनाम पाने के लिए पहले शुल्क जमा करें।"],
  ["release-fee", "Lottery ka inaam milega, pehle fees jama karo."],
  ["release-fee", "পুরস্কার নিতে আগে ফি জমা দিন।"],
  ["release-fee", "Puroskar pete age fee joma korun."],
];
const safe = [
  "Never submit your banking password to a message sender.",
  "Do not click a link to upload your PAN card number.",
  "किसी लिंक पर पासवर्ड दर्ज करें ऐसे संदेशों से सावधान रहें।",
  "OTP submit karo wale message par bharosa mat karo.",
  "এই লিংকে পাসওয়ার্ড লিখবেন না।",
  "Password submit korun bola message bishwas korben na.",
  "The card was blocked after I reported it stolen. No further action is needed.",
  "Your bank may restrict an account when checks are pending. Ask its branch for information.",
  "আপনার কার্ড ব্লক করা হয়েছে। কোনো কাজ করতে হবে না।",
  "Beware of lottery winnings that require an advance registration fee.",
  "लॉटरी का इनाम पाने के लिए पहले शुल्क जमा करें, ऐसे संदेशों से सावधान रहें।",
  "পুরস্কারের ফি জমা দিতে বলা হলে সাবধান থাকুন।",
  "The university registration fee is due next term.",
  "I enter my OTP in the official app I opened myself.",
  "নিজে খোলা অফিসিয়াল অ্যাপে পিন লিখুন।",
];

describe("multilingual development themes and caution contrasts", () => {
  it.each(risks)("%s is supported by the wording: %s", (category, message) => {
    const found = analyzeClaim(message).findings.find((f) => f.id === category);
    expect(found).toBeDefined();
    expect(found?.severity).toBe("attention");
    expect(found?.sourceIds.length).toBeGreaterThan(0);
    for (const id of found?.sourceIds ?? [])
      expect(sources.some((s) => s.id === id)).toBe(true);
    expect(found?.title.bn).not.toBe(found?.title.en);
  });
  it.each(safe)(
    "does not turn safety advice or ordinary notices into attention: %s",
    (message) => {
      expect(
        analyzeClaim(message).findings.filter(
          (f) => f.severity === "attention",
        ),
      ).toEqual([]);
    },
  );
  it.each([
    "Today only: 30GB mobile data at a discount, join now.",
    "আজই শেষ সুযোগ, ৪০GB ডাটা কিনুন।",
    "आज ही कपड़े खरीदें, विशेष छूट।",
  ])("keeps retail deadlines as persuasion context: %s", (message) => {
    const result = analyzeClaim(message);
    expect(
      result.findings.some(
        (f) => f.id === "urgency" && f.severity === "context",
      ),
    ).toBe(true);
    expect(result.findings.some((f) => f.severity === "attention")).toBe(false);
    expect(result.contentType).toBe("promotional");
  });
  it("retail wording cannot suppress an independent financial risk cue", () => {
    const r = analyzeClaim(
      "Get a shopping discount, but join our investment plan now for guaranteed daily returns.",
    );
    expect(
      r.findings.some(
        (f) => f.id === "guarantee" && f.severity === "attention",
      ),
    ).toBe(true);
  });
  it("a protective prefix cannot erase an independent request", () => {
    const r = analyzeClaim(
      "Never share your OTP, but our agent needs you to submit your password.",
    );
    expect(r.findings.some((f) => f.id === "credentials")).toBe(true);
  });
  it("redacts explicit three-digit CVV values while keeping safety instructions intact", () => {
    expect(redactSensitive("CVV: 123, সিভিভি ১২৩, सीवीवी १२३")).not.toMatch(
      /123|১২৩|१२३/,
    );
    expect(redactSensitive("Never share your CVV with anyone")).toBe(
      "Never share your CVV with anyone",
    );
  });
  it("keeps development publisher labels separate from risk annotations", () => {
    expect(development.items).toHaveLength(72);
    expect(
      development.items.filter(
        (i) => i.annotation.group === "not-assessable-from-text",
      ),
    ).toHaveLength(26);
    for (const item of development.items) {
      expect(item.sourceLabel).toBeTypeOf("string");
      expect(item.originalTextSha256).toMatch(/^[a-f\d]{64}$/);
      for (const id of item.annotation.expectedCategories)
        expect(RULE_IDS).toContain(id);
    }
  });
});
