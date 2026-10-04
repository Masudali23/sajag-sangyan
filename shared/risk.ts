import type { ClaimAnalysis, Finding, Localized } from "./types.ts";
import { isSolicitingFinding } from "./engine.ts";

export type RiskLevel = "strong" | "potential" | "insufficient";
export interface RiskAssessment {
  level: RiskLevel;
  title: Localized;
  explanation: Localized;
  reasonIds: string[];
  safetyEstablished: false;
}

const copy: Record<RiskLevel, { title: Localized; explanation: Localized }> = {
  strong: {
    title: {
      en: "Strong scam indicators",
      hi: "धोखाधड़ी के प्रबल संकेत",
      bn: "প্রতারণার জোরালো লক্ষণ",
    },
    explanation: {
      en: "Several warning signs appear together. Pause before paying or sharing account access. These signs are not proof of fraud; the sender and claim remain unverified.",
      hi: "कई चेतावनी संकेत एक साथ मिले हैं। भुगतान करने या खाते की पहुँच देने से पहले रुकें। ये संकेत धोखाधड़ी का प्रमाण नहीं हैं; भेजने वाले और दावे का सत्यापन अभी नहीं हुआ है।",
      bn: "একসঙ্গে একাধিক সতর্কতার লক্ষণ পাওয়া গেছে। টাকা দেওয়ার বা অ্যাকাউন্টের নিয়ন্ত্রণ দেওয়ার আগে থামুন। এই লক্ষণগুলি প্রতারণার প্রমাণ নয়; প্রেরক ও দাবির সত্যতা এখনও যাচাই হয়নি।",
    },
  },
  potential: {
    title: {
      en: "Potential scam indicators",
      hi: "धोखाधड़ी के संभावित संकेत",
      bn: "প্রতারণার সম্ভাব্য লক্ষণ",
    },
    explanation: {
      en: "A warning sign needs an independent check. Read the reasons below and contact the institution through a channel you already know is official. This is not a verified fraud verdict.",
      hi: "एक चेतावनी संकेत की स्वतंत्र जाँच ज़रूरी है। नीचे कारण पढ़ें और संस्था से ऐसे माध्यम से संपर्क करें जिसे आप पहले से आधिकारिक जानते हैं। यह धोखाधड़ी की सत्यापित पुष्टि नहीं है।",
      bn: "একটি সতর্কতার লক্ষণ আলাদা করে যাচাই করা দরকার। নিচের কারণগুলি পড়ুন এবং আগে থেকে জানা প্রতিষ্ঠানের সরকারি মাধ্যমে যোগাযোগ করুন। এটি প্রতারণার নিশ্চিত রায় নয়।",
    },
  },
  insufficient: {
    title: {
      en: "Not enough evidence",
      hi: "पर्याप्त प्रमाण नहीं",
      bn: "যথেষ্ট প্রমাণ নেই",
    },
    explanation: {
      en: "We cannot establish that this message is safe. Our checks found no supported high-risk pattern, or only context to consider. Verify the sender, links and any payment request independently.",
      hi: "हम यह साबित नहीं कर सकते कि संदेश सुरक्षित है। हमारी जाँच में समर्थित उच्च जोखिम वाला संकेत नहीं मिला, या केवल संदर्भ की बातें मिलीं। भेजने वाले, लिंक और भुगतान के अनुरोध की स्वतंत्र जाँच करें।",
      bn: "এই বার্তাটি নিরাপদ, তা আমরা নিশ্চিত করতে পারি না। আমাদের যাচাইয়ে পরিচিত উচ্চ ঝুঁকির লক্ষণ মেলেনি, অথবা শুধু প্রসঙ্গ বোঝার বিষয় মিলেছে। প্রেরক, লিঙ্ক ও টাকা চাওয়ার বিষয় আলাদা করে যাচাই করুন।",
    },
  },
};

// These are observable warning families, not probabilities or verified fraud
// labels. Promotion/context alone never establishes a scam. Duplicate findings
// do not count as corroboration, and AI-only output never gets the top tier.
const attentionIds = new Set([
  "credentials",
  "account-threat",
  "authority-threat",
  "abusive-pressure",
  "release-fee",
  "off-exchange",
  "coordinated-pump",
  "guarantee",
  "urgency",
  "outsized",
  "tip",
  "insider",
  "impersonation",
  "periodic",
  "pay-to-earn",
  "off-platform",
  "secrecy",
  "borrow",
  // On-device pattern model (shared/pattern-model.ts): a warning, never a Strong family.
  "pattern-match",
]);
const actionIds = new Set([
  "credentials",
  "authority-threat",
  "abusive-pressure",
  "release-fee",
  "coordinated-pump",
  "pay-to-earn",
  "impersonation",
]);

// A fee requested to release earnings can match both category names. It is
// still one observable action, not two independent reasons for a stronger tier.
const familyFor = (id: string) =>
  id === "release-fee" || id === "pay-to-earn"
    ? "fee-demand"
    : ["guarantee", "periodic", "outsized"].includes(id)
      ? "return-promise"
      : id;

export function assessRisk(
  analysis: Pick<ClaimAnalysis, "findings" | "retrieval"> &
    Partial<Pick<ClaimAnalysis, "input">>,
): RiskAssessment {
  const attention = new Map<string, Finding>();
  for (const finding of analysis.findings) {
    if (finding.severity !== "attention" || !attentionIds.has(finding.id))
      continue;
    // Prefer the local finding if a duplicate AI category is supplied.
    if (!attention.has(finding.id) || finding.origin !== "ai")
      attention.set(finding.id, finding);
  }
  const corroborated = [...attention.values()].filter(
    (f) =>
      f.id !== "pattern-match" &&
      typeof analysis.input === "string" &&
      isSolicitingFinding(analysis.input, f) &&
      (f.origin !== "ai" ||
        (analysis.retrieval?.usedForAi &&
          f.evidenceIds?.some((id) =>
            analysis.retrieval?.evidence.some(
              (e) => e.id === id && e.categoryIds.includes(f.id),
            ),
          ))),
  );
  const families = new Set(corroborated.map((f) => familyFor(f.id)));
  const localActions = corroborated.filter(
    (f) => f.origin !== "ai" && actionIds.has(f.id),
  );
  // A model citation cannot create the required local action. Financial
  // certainty plus one fee request is also insufficient, even when several
  // overlapping return/fee category labels happen to match that same offer.
  const independentSupport = localActions.some((anchor) =>
    [...families].some(
      (family) =>
        family !== familyFor(anchor.id) &&
        !(familyFor(anchor.id) === "fee-demand" && family === "return-promise"),
    ),
  );
  const level: RiskLevel =
    families.size >= 2 && independentSupport
      ? "strong"
      : attention.size
        ? "potential"
        : "insufficient";
  return {
    level,
    ...copy[level],
    reasonIds: [...attention.keys()],
    safetyEstablished: false,
  };
}

// The server rechecks masked text. Keep every original on-device finding so
// redaction or a failed/model-empty review cannot lower the user's warning.
// Persist only the masked local input; never restore the raw message here.
export function mergeChecks(
  local: ClaimAnalysis,
  online: ClaimAnalysis,
): ClaimAnalysis {
  const findings = new Map(local.findings.map((f) => [f.id, f]));
  for (const finding of online.findings)
    if (!findings.has(finding.id)) findings.set(finding.id, finding);
  const merged = [...findings.values()];
  const status = merged.some((f) => f.severity === "attention")
    ? "attention"
    : "context";
  return {
    ...online,
    id: local.id,
    createdAt: local.createdAt,
    input: local.input,
    language: local.language,
    languageNotice: local.languageNotice ?? online.languageNotice,
    findings: merged,
    status,
    summary:
      status === local.status && local.findings.length
        ? local.summary
        : online.summary,
    contentType:
      local.contentType === "mixed" ||
      online.contentType === "mixed" ||
      (local.contentType === "promotional" &&
        online.contentType === "educational") ||
      (local.contentType === "educational" &&
        online.contentType === "promotional")
        ? "mixed"
        : local.contentType !== "unclear"
          ? local.contentType
          : online.contentType,
    sourceIds: [...new Set(merged.flatMap((f) => f.sourceIds))],
    lessonIds: [...new Set([...local.lessonIds, ...online.lessonIds])].slice(
      0,
      7,
    ),
  };
}
