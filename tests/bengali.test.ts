import { describe, expect, it } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import ts from "typescript";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { analyzeClaim, RULE_IDS, redactSensitive } from "../shared/engine";
import { numericClaim } from "../shared/numeric-claims";
import { lessons, sources } from "../shared/content";
import { bengaliSources } from "../shared/bengali-sources";
import { hindiSourceScopes } from "../shared/hindi-sources";
import { bengaliUi } from "../src/lib/bengali-ui";
import { analysisSchema } from "../shared/validation";
import { createAuthenticatedApp as createApp } from "./helpers/authenticated-api";

// Development regressions, deliberately separate from any unseen evaluation.
const offers: [string, string][] = [
  ["guarantee", "বিনিয়োগে নিশ্চিত লাভ, ঝুঁকি নেই।"],
  ["urgency", "এখনই যোগ দিন, শেষ সুযোগ।"],
  ["registration", "আমাদের অ্যাপ সেবি অনুমোদিত।"],
  ["outsized", "₹৫,০০০ জমা দিন, ৩০ দিনে ₹৫০,০০০ পাবেন।"],
  ["promotion", "আমাদের VIP গ্রুপে যোগ দিন।"],
  ["nav", "কম NAV মানে বেশি লাভ।"],
  ["tip", "এই শেয়ার কিনে নিন, টার্গেট ₹৫০০।"],
  ["insider", "ভিতরের খবর পেয়েছি, কাল শেয়ার কিনুন।"],
  [
    "impersonation",
    "অর্থমন্ত্রী এই ট্রেডিং অ্যাপ চালু করেছেন, প্রতিদিন লাভ পাবেন।",
  ],
  ["periodic", "প্রতি মাসে নিশ্চিত ৮% লাভ পাবেন।"],
  ["pay-to-earn", "রেজিস্ট্রেশন ফি দিন, টাস্ক করে আয় করুন।"],
  ["off-platform", "এই APK ইনস্টল করুন, প্লে স্টোরে নেই।"],
  ["social-proof", "আমাদের হাজার সদস্য লাভ করছেন, লাভের স্ক্রিনশট দেখুন।"],
  ["secrecy", "গোপন কৌশলে টাকা দ্বিগুণ, কাউকে বলবেন না।"],
  ["borrow", "ঋণ নিয়ে বিনিয়োগ করুন।"],
  ["credentials", "আপনার OTP আমাদের পাঠান।"],
  ["account-threat", "অ্যাকাউন্ট বন্ধ হবে, এই লিংকে KYC আপডেট করুন।"],
  ["authority-threat", "পুলিশ বলছি, ডিজিটাল অ্যারেস্ট হবে, টাকা পাঠান।"],
  ["release-fee", "টাকা তুলতে আগে GST ফি জমা দিন।"],
  ["off-exchange", "ডাব্বা ট্রেডিং করে লাভ করুন।"],
  ["coordinated-pump", "সবাই একসাথে কিনব, দাম বাড়িয়ে বিক্রি করব।"],
  [
    "abusive-pressure",
    "এখন টাকা পাঠান, না হলে আপনার ব্যক্তিগত ছবি ছড়িয়ে দেব।",
  ],
  ["outsized", "প্রতিদিন ৩% লাভ করুন।"],
  ["outsized", "১০ হাজার টাকা দিয়ে ১ মাসে ২০ হাজার টাকা পাবেন।"],
  ["outsized", "সাবধানে এখনই বিনিয়োগ করুন, ৩০ দিনে টাকা দ্বিগুণ।"],
  ["guarantee", "guarantee return paben, ekhuni join korun"],
  ["outsized", "Taka double hobe 30 dine."],
  ["registration", "Amader app SEBI onumodito."],
  ["tip", "Ei stock kinun, target 500."],
  ["impersonation", "Orthomontri app chalu korechen, taka labh hobe."],
  ["insider", "Bhitorer khobor ache, share kinun."],
  ["credentials", "Apnar password pathan."],
  ["release-fee", "Taka tulte age GST fee din."],
  ["social-proof", "Labher screenshot dekhun, taka double."],
  ["secrecy", "Gopon strategy te taka double, kauke bolben na."],
  ["borrow", "Dhar niye invest korun."],
];
const benign = [
  "সেবি নিশ্চিত লাভের প্রতিশ্রুতি থেকে সাবধান থাকতে বলেছে।",
  "OTP কাউকে পাঠাবেন না।",
  "কম NAV মানে বেশি লাভ হয় না।",
  "গ্যারান্টি রিটার্নে বিশ্বাস করবেন না।",
  "ব্যাংকের FD-তে বছরে ৭% সুদ পাওয়া যায়।",
  "ক্রেডিট কার্ডের সুদ মাসে ৩.৫%।",
  "আমার বেতন মাসে ₹৩০,০০০।",
  "Guaranteed return e bishwas korben na.",
  "সেবি কখনও নিশ্চিত লাভের গ্যারান্টি দেয় না।",
  "টাকা তোলার জন্য কোনো ফি দিতে হয় না।",
  "প্লে স্টোরে নেই এমন অ্যাপ ইনস্টল করবেন না।",
  "ঋণ নিয়ে বিনিয়োগ করবেন না।",
  "আমাদের বই পড়ার গ্রুপে হাজার সদস্য আছেন।",
  "ফ্রিজে পাঁচ বছরের গ্যারান্টি আছে।",
  "proti mas 1% return paben",
  "Dhar niye invest korben na.",
  "এই পাঠে চক্রবৃদ্ধি বলতে কী বোঝায় তা বুঝুন।",
  "কোম্পানির বিক্রি এই মাসে ৩০% বেড়েছে।",
  "গতকাল স্টকে আপার সার্কিট লেগেছে।",
];
describe("Bengali and Banglish development coverage", () => {
  it.each(offers)("%s: %s", (id, text) => {
    const result = analyzeClaim(text, "bn");
    expect(result.findings.map((f) => f.id)).toContain(id);
    expect(result.languageNotice).toBeUndefined();
    expect(analysisSchema.safeParse(result).success).toBe(true);
    for (const finding of result.findings) {
      expect(finding.title.bn).toMatch(/\p{Script=Bengali}/u);
      expect(finding.explanation.bn).toMatch(/\p{Script=Bengali}/u);
      expect(
        finding.sourceIds.every((id) => sources.some((s) => s.id === id)),
      ).toBe(true);
    }
  });
  it.each(benign)("leaves protective or ordinary text alone: %s", (text) => {
    expect(analyzeClaim(text, "bn").findings.map((f) => f.id)).toEqual([]);
  });
  it("covers all warning categories without introducing new advice", () => {
    expect(new Set(offers.map(([id]) => id))).toEqual(new Set(RULE_IDS));
  });
  it("does not let an advisory cancel a separate offer", () => {
    const result = analyzeClaim(
      "সেবি গ্যারান্টি রিটার্ন থেকে সাবধান করেছে, কিন্তু আমাদের গ্রুপে যোগ দিন, নিশ্চিত লাভ পাবেন।",
      "bn",
    );
    expect(result.findings.map((f) => f.id)).toContain("guarantee");
    expect(result.findings.map((f) => f.id)).toContain("promotion");
  });
  it("normalizes Bengali digits and scaled money but distinguishes a month from a day", () => {
    expect(
      numericClaim("১০ হাজার টাকা দিয়ে ১ মাসে ২০ হাজার টাকা পাবেন।")?.kind,
    ).toBe("amount-ratio");
    expect(numericClaim("proti mas 1% return paben")).toBeNull();
    expect(numericClaim("proti din 1% return paben")?.kind).toBe("percentage");
  });
  it("redacts Bengali-labelled actual values, preserving safety grammar", () => {
    expect(redactSensitive("ওটিপি: ১২৩৪৫৬ পাঠান")).not.toContain("১২৩৪৫৬");
    expect(redactSensitive("পাসওয়ার্ড: Gopon123! পাঠান")).not.toContain(
      "Gopon123",
    );
    expect(redactSensitive("OTP কাউকে পাঠাবেন না।")).toBe(
      "OTP কাউকে পাঠাবেন না।",
    );
  });
  it("preserves an old two-language saved check with translated library copy", () => {
    const current = analyzeClaim("Guaranteed 3% returns daily", "en");
    const old = JSON.parse(
      JSON.stringify(current, (key, value) =>
        key === "bn" ? undefined : value,
      ),
    );
    const restored = analysisSchema.parse(old);
    expect(restored.summary.bn).toEqual(current.summary.bn);
    expect(restored.findings[0].explanation.bn).toEqual(
      current.findings[0].explanation.bn,
    );
  });
  it("keeps Tamil out-of-scope disclosure but accepts Bengali", () => {
    expect(analyzeClaim("உத்தரவாதம் முதலீடு").languageNotice).toBeDefined();
    expect(
      analyzeClaim("বিনিয়োগ বুঝতে শিখুন", "bn").languageNotice,
    ).toBeUndefined();
  });
  it("restores the legacy language notice with current Bengali support wording", () => {
    const current = analyzeClaim("உத்தரவாதம் முதலீடு", "en");
    const old = JSON.parse(
      JSON.stringify(current, (key, value) =>
        key === "bn" ? undefined : value,
      ),
    );
    old.languageNotice.en =
      "This message appears to include a language we have not validated yet. Sajag currently supports English, Hindi and Hinglish; warning signs may be missed. Any findings below are partial, not a safety verdict.";
    const restored = analysisSchema.parse(old);
    expect(restored.languageNotice?.bn).toEqual(current.languageNotice?.bn);
    expect(restored.languageNotice?.bn).toContain("বাংলা (বেটা)");
  });
  it("has a Hindi display scope for every linked source", () => {
    expect(Object.keys(hindiSourceScopes).sort()).toEqual(
      sources.map((s) => s.id).sort(),
    );
    for (const source of sources)
      expect(hindiSourceScopes[source.id]).toMatch(/\p{Script=Devanagari}/u);
  });
  it("has Bengali throughout lesson questions and source explanations", () => {
    for (const lesson of lessons) {
      for (const key of [
        "title",
        "subtitle",
        "category",
        "analogy",
        "explanation",
        "takeaway",
        "question",
        "feedback",
      ] as const)
        expect(lesson[key].bn).toMatch(/\p{Script=Bengali}/u);
      expect(lesson.options.every((o) => o.bn.length > 0)).toBe(true);
    }
    for (const source of sources)
      expect(bengaliSources[source.id].scope).toMatch(/\p{Script=Bengali}/u);
  });
  it("requires every static UI call to have Bengali and every dynamic call to supply it", () => {
    const missing: string[] = [];
    function scan(dir: string) {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, item.name);
        if (item.isDirectory()) {
          scan(file);
          continue;
        }
        if (!/\.tsx?$/.test(file)) continue;
        const ast = ts.createSourceFile(
          file,
          readFileSync(file, "utf8"),
          ts.ScriptTarget.Latest,
          true,
        );
        function visit(node: ts.Node) {
          if (
            ts.isCallExpression(node) &&
            node.expression.getText(ast) === "t" &&
            node.arguments.length >= 2
          ) {
            const key = node.arguments[0];
            if (
              node.arguments.length < 3 &&
              (!(
                ts.isStringLiteral(key) ||
                ts.isNoSubstitutionTemplateLiteral(key)
              ) ||
                !bengaliUi[key.text])
            )
              missing.push(file + ":" + node.getText(ast).slice(0, 90));
          }
          ts.forEachChild(node, visit);
        }
        visit(ast);
      }
    }
    scan("src");
    expect(missing).toEqual([]);
  });
  it("accepts Bengali on both API routes without AI consent or a key", async () => {
    const app = createApp();
    const result = await request(app)
      .post("/api/analyze")
      .send({ text: offers[0][1], language: "bn", useAI: false });
    expect(result.status).toBe(200);
    expect(result.body.analysis.language).toBe("bn");
    expect(result.body.analysis.summary.bn).toMatch(/\p{Script=Bengali}/u);
    const explanation = await request(app)
      .post("/api/explain")
      .send({ question: "এনএভি কী বোঝায়?", language: "bn" });
    expect(explanation.status).toBe(200);
  });
});

it("keeps a very large multilingual notebook on device instead of failing a cloud batch", async () => {
  const { fitsCloudNotebook } = await import("../src/lib/notebook-size");
  const normal = analyzeClaim("নিশ্চিত লাভ পাবেন।", "bn");
  expect(fitsCloudNotebook(normal)).toBe(true);
  const large = {
    ...normal,
    input: "অ".repeat(6000),
    findings: Array.from({ length: 21 }, (_, index) => ({
      ...normal.findings[0],
      id: String(index),
      excerpt: "অ".repeat(400),
    })),
  };
  expect(fitsCloudNotebook(large)).toBe(false);
});
