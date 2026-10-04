import { describe, expect, it } from "vitest";
import { analyzeClaim, isSolicitingFinding } from "../shared/engine";
import { assessRisk } from "../shared/risk";
import type { Language } from "../shared/types";

const warnings = (text: string, language: Language = "en") =>
  analyzeClaim(text, language).findings.filter(
    (f) => f.severity === "attention",
  );

describe("cycle8 actor and action scope", () => {
  it("selects a separate investment deadline after an ordinary event deadline", () => {
    const text = "The library workshop: join now. Invest in our pool now.";
    const urgency = warnings(text).find((f) => f.id === "urgency");
    expect(urgency?.excerpt).toContain("Invest in our pool now");
  });
  it("does not label coordinated ordinary goods sales as securities pumping", () => {
    const text =
      "Our group buys apples together to push up the price and sells to new buyers.";
    expect(warnings(text).some((f) => f.id === "coordinated-pump")).toBe(false);
  });
  it.each([
    "The warrant lists the payment amount owed to the court.",
    "Please transfer the court fee to file a certified copy of the warrant.",
  ])("does not infer coercion from legal payment vocabulary: %s", (text) => {
    expect(warnings(text).some((f) => f.id === "authority-threat")).toBe(false);
  });
  it("links a callback placed immediately before an account restriction", () => {
    const text =
      "Please call us immediately. Your account will be deactivated within an hour.";
    expect(warnings(text).some((f) => f.id === "account-threat")).toBe(true);
  });
  it.each([
    "Today is the last day! Digital gadgets have a 15% discount.",
    "আজই last day! ৪০GB(bonus-সহ)৫০০টাকা ৩০দিন।",
    "Digital gadget-এ ১৫% discount! আজই shop করুন এবং bonus পান।",
  ])("keeps a separately stated retail deadline contextual: %s", (text) => {
    expect(warnings(text)).toEqual([]);
    expect(
      warnings(`${text} Send your login password to me.`).some(
        (f) => f.id === "credentials",
      ),
    ).toBe(true);
  });

  it.each([
    "Transfer the settlement amount to my private account or arrest proceedings begin.",
    "मेरे निजी खाते में समझौते की रकम जमा करो, नहीं तो गिरफ्तारी शुरू होगी।",
    "Mere personal payment address par settlement amount bhejo, warna arrest hoga.",
  ])("attaches legal pressure to the payment request: %s", (text) => {
    expect(warnings(text).some((f) => f.id === "authority-threat")).toBe(true);
  });

  it.each([
    ["Never hesitate to send your bank OTP to me", "credentials"],
    ["Do not hesitate, our fund guarantees investment profits", "guarantee"],
    [
      "I opened the official app independently; tell the caller your bank OTP",
      "credentials",
    ],
    [
      "Open the official app yourself and enter your password in this link: https://example.invalid/login",
      "credentials",
    ],
  ])("keeps a live request despite unrelated reassurance: %s", (text, id) => {
    expect(warnings(text).some((finding) => finding.id === id)).toBe(true);
  });

  it.each([
    [
      "en",
      "Your electricity bill is due today. Pay now to avoid a late charge.",
    ],
    ["hi", "आज ही बिजली के बिल का भुगतान करें, विलंब शुल्क अलग है।"],
    ["bn", "আজই বিদ্যুতের বিল মেটান, দেরি হলে বাড়তি চার্জ লাগবে।"],
    ["en", "Kiraya aaj hi pay karo, yeh mahine ka rent reminder hai."],
    ["bn", "Ajkei school er bill pay korun, tuition er kisti baki ache."],
  ] as const)(
    "keeps an ordinary deadline contextual in %s",
    (language, text) => {
      expect(warnings(text, language)).toEqual([]);
      expect(assessRisk(analyzeClaim(text, language)).level).toBe(
        "insufficient",
      );
      expect(
        warnings(`${text} Send your bank OTP to me now.`, language).some(
          (f) => f.id === "credentials",
        ),
      ).toBe(true);
    },
  );

  it.each([
    "Everyone is buying a new refrigerator together for our office.",
    "Our group invests in diversified stocks together for retirement.",
    "We buy shares together because the market price may go up or down.",
    "हम सब मिलकर लंबी अवधि के लिए अलग-अलग शेयर खरीदेंगे।",
    "আমরা সবাই দীর্ঘমেয়াদে বিভিন্ন শেয়ার কিনব।",
    "Hum sab milkar alag shares mein long term invest karenge.",
    "Amra sobai long term er jonno share kinbo.",
    "हम सब मिलकर दफ्तर के लिए एक फ्रिज खरीदेंगे।",
    "সবাই একসাথে অফিসের জন্য একটা ফ্রিজ কিনব।",
    "Hum sab milkar office ke liye naya refrigerator kharidenge.",
    "Sobai eksathe office er jonno ekta fridge kinbo.",
  ])("does not call an ordinary group purchase a pump: %s", (text) => {
    expect(warnings(text)).toEqual([]);
    expect(
      isSolicitingFinding(text, {
        id: "coordinated-pump",
        excerpt: text,
      }),
    ).toBe(false);
  });

  it.each([
    "Our group will buy this token together, raise its price and then sell.",
    "हम सब मिलकर इस टोकन की कीमत चढ़ाएँगे और फिर बेचेंगे।",
    "সবাই একসাথে এই টোকেন কিনব, দাম বাড়িয়ে বিক্রি করব।",
    "Hamare group ka plan hai: sab ek saath token buy karo, price upar karo, phir sell.",
    "Amra sobai ei token kinbo, dam barabo ar pore bechbo.",
  ])("requires a collective trading frame: %s", (text) => {
    const result = analyzeClaim(text);
    const finding = result.findings.find((f) => f.id === "coordinated-pump");
    expect(finding?.severity).toBe("attention");
    expect(isSolicitingFinding(result.input, finding!)).toBe(true);
  });

  it.each([
    [
      "en",
      "Pay 6000 rupees today",
      "Otherwise I will circulate your private photos to your family",
    ],
    [
      "hi",
      "अभी 6000 रुपये भेजें",
      "नहीं तो आपकी निजी तस्वीरें परिवार में फैला दूँगा",
    ],
    [
      "bn",
      "এখন ৬০০০ টাকা পাঠান",
      "না হলে আপনার ব্যক্তিগত ছবি পরিবারে ছড়িয়ে দেব",
    ],
    ["en", "Paisa bhejo", "Warna tumhe badnam karunga"],
    ["bn", "Taka pathao", "Nahole tomar chobi choriye debo"],
  ] as const)(
    "links an explicit adjacent threat in %s",
    (language, request, threat) => {
      const text = `${request}. ${threat}.`;
      const result = analyzeClaim(text, language);
      const finding = result.findings.find((f) => f.id === "abusive-pressure");
      expect(finding?.severity).toBe("attention");
      expect(isSolicitingFinding(result.input, finding!)).toBe(true);
      expect(
        warnings(`${request}. I dislike this game.`, language).some(
          (f) => f.id === "abusive-pressure",
        ),
      ).toBe(false);
    },
  );

  it.each([
    "Please repay the bank instalment. Otherwise a late fee will be charged.",
    "किस्त जमा करें। नहीं तो सामान्य विलंब शुल्क लगेगा।",
    "কিস্তি মেটান। না হলে নির্ধারিত বিলম্বের চার্জ লাগবে।",
    "EMI jama karo. Warna late fee lagegi.",
    "Kisti joma korun. Nahole late fee lagbe.",
  ])("does not mistake a stated cost for abusive extortion: %s", (text) => {
    expect(warnings(text)).toEqual([]);
  });
});
