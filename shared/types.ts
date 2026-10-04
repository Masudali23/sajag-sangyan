export const LANGUAGES = ["en", "hi", "bn"] as const;
export type Language = (typeof LANGUAGES)[number];
export type Localized = Record<Language, string>;
export type ConceptId =
  | "risk"
  | "diversification"
  | "volatility"
  | "compounding"
  | "fees"
  | "nav"
  | "nomination"
  | "digital-arrest"
  | "kyc-update"
  | "upi-pin"
  | "task-jobs"
  | "trading-apps"
  | "advance-fees"
  | "online-friend"
  | "after-fraud";
export interface EvidenceSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
  scope: string;
  reviewedAt: string;
}
export interface Lesson {
  id: ConceptId;
  title: Localized;
  subtitle: Localized;
  category: Localized;
  minutes: number;
  color: string;
  analogy: Localized;
  explanation: Localized;
  takeaway: Localized;
  question: Localized;
  options: Localized[];
  answer: number;
  feedback: Localized;
  sourceIds: string[];
}
// A fictional, step-by-step scam conversation for the learning simulator.
export interface ScamStoryStep {
  channel: "call" | "video" | "sms" | "chat" | "app";
  speaker: Localized;
  message: Localized;
  tactic: Localized;
  reveal: Localized;
  safe: Localized;
  risky: Localized;
  // Which of the two replies is shown first, so the safe one is not always on top.
  safeFirst: boolean;
}
export interface ScamStory {
  id: string;
  lessonId: ConceptId;
  emoji: string;
  title: Localized;
  subtitle: Localized;
  steps: ScamStoryStep[];
  summary: Localized;
  actions: Localized[];
  sourceIds: string[];
}
export interface Finding {
  id: string;
  severity: "attention" | "context";
  title: Localized;
  explanation: Localized;
  excerpt: string;
  sourceIds: string[];
  origin?: "local" | "ai";
  evidenceIds?: string[];
  // Set only when a completed AI review withdrew an on-device warning (it stays as context).
  aiReview?: {
    decision: "withdrawn";
    reason:
      | "caution-or-warning"
      | "negated-or-refused"
      | "news-or-report"
      | "lesson-or-quote"
      | "ordinary-service-notice";
  };
}
export interface RetrievedEvidence {
  id: string;
  sourceId: string;
  title: Localized;
  passage: Localized;
  url: string;
  reviewedAt: string;
  score: number;
  categoryIds: string[];
}
export interface RetrievalMetadata {
  method: "bm25";
  corpusVersion: string;
  evidence: RetrievedEvidence[];
  usedForAi: boolean;
}
export interface ClaimAnalysis {
  id: string;
  createdAt: string;
  input: string;
  language: Language;
  status: "attention" | "context";
  contentType: "promotional" | "educational" | "mixed" | "unclear";
  summary: Localized;
  findings: Finding[];
  sourceIds: string[];
  lessonIds: ConceptId[];
  limitations: Localized;
  mode: "local" | "server";
  aiAssisted: boolean;
  languageNotice?: Localized;
  retrieval?: RetrievalMetadata;
}
export interface SavedCheck {
  id: string;
  savedAt: string;
  analysis: ClaimAnalysis;
}
