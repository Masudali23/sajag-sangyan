// AI review of on-device warnings (consented AI mode only). A completed, validated AI review
// may withdraw an on-device warning when the message, read as a whole, makes no risky request
// and the quoted wording is a caution, refusal, report, lesson or ordinary service notice.
// Withdrawn warnings stay visible as context; nothing is ever marked "safe".
import { assessRisk, mergeChecks } from "./risk.ts";
import type { ClaimAnalysis } from "./types.ts";

export const WITHDRAW_REASONS = [
  "caution-or-warning",
  "negated-or-refused",
  "news-or-report",
  "lesson-or-quote",
  "ordinary-service-notice",
] as const;
export type WithdrawReason = (typeof WITHDRAW_REASONS)[number];

// Wording that addresses a reviewer/model or tries to change instructions disables withdrawal,
// so injected text can never remove a warning. False matches only keep warnings in place.
const INSTRUCTION_LIKE = [
  /\bignore\s+(all|any|the|previous|above|earlier|prior|these|those|your)\b/i,
  /\b(system|developer)\s*(prompt|message|instruction)/i,
  /\b(as an?|you are(?: an?| the)?)\s+(ai|assistant|language model|model|classifier|reviewer|moderator)\b/i,
  /\b(ai|assistant|model|classifier|reviewer|moderator|sajag)\s*[:,]/i,
  /\b(classify|label|mark|treat|rate|consider)\b[^.!?\n]{0,40}\b(safe|harmless|benign|legit(imate)?|genuine|not (a )?(scam|fraud))\b/i,
  /\b(withdraw|remove|delete|drop|suppress|hide)\b[^.!?\n]{0,30}\b(warnings?|findings?|flags?|alerts?|cues?)\b/i,
  /\bjson\b|\bschema\b|<\/?\s*(system|assistant|user)\s*>/i,
  /सिस्टम प्रॉम्प्ट|निर्देश(ों)? को (अनदेखा|नज़रअंदाज़)|সিস্টেম প্রম্পট|নির্দেশ(না)? (উপেক্ষা|অগ্রাহ্য)/u,
];
export function hasInstructionLikeText(text: string) {
  return INSTRUCTION_LIKE.some((pattern) => pattern.test(text));
}

/**
 * Merge an on-device result with the server's AI-reviewed result. Server withdrawals apply only
 * to warnings the server itself reviewed (same id), never when the on-device result is Strong,
 * and never without a completed AI review. Every other on-device warning is kept.
 */
export function reviewedMerge(
  local: ClaimAnalysis,
  online: ClaimAnalysis,
): ClaimAnalysis {
  const merged = mergeChecks(local, online);
  const withdrawn = new Map(
    online.findings
      .filter(
        (finding) =>
          finding.aiReview?.decision === "withdrawn" &&
          finding.severity === "context",
      )
      .map((finding) => [finding.id, finding]),
  );
  if (
    !withdrawn.size ||
    !online.aiAssisted ||
    online.retrieval?.usedForAi !== true ||
    assessRisk(local).level === "strong"
  )
    return merged;
  const findings = merged.findings.map((finding) =>
    finding.severity === "attention" &&
    finding.origin !== "ai" &&
    withdrawn.has(finding.id)
      ? withdrawn.get(finding.id)!
      : finding,
  );
  const status = findings.some((finding) => finding.severity === "attention")
    ? "attention"
    : "context";
  return {
    ...merged,
    findings,
    status,
    summary: status === online.status ? online.summary : merged.summary,
  };
}
