import type { RetrievedEvidence, RetrievalMetadata } from "../shared/types.ts";
import { evidenceCorpus, EVIDENCE_CORPUS_VERSION } from "./evidence-corpus.ts";
import { detectionTextFor } from "../shared/engine.ts";

export const MAX_RETRIEVED_CARDS = 5;
export const MAX_EVIDENCE_CONTEXT_CHARS = 5000;
export const RAG_PROMPT_VERSION = "evidence-cues-v3-confirm-withdraw";
const stopWords = new Set(
  "a an the of to in on for is are was were be been with and or as at by from it this that these those i you your our we they their may can will would should do does not no only all any some about message claim input please en hi bn का की के को में है हैं हो और या यह वह से पर एक लिए करें कर अपने अपना ने कि तो भी न ना বাংলা এই সেই ও আর বা কে যে এর এ হয় হবে করুন করা করে জন্য একটি আমি আমরা আপনি সে প্রতি থেকে সঙ্গে কিছু শুধু নয় অনুযায়ী the same before after says said source evidence id excerpt category instruction instructions ignore previous now send tell say get need needed take reach want wants अभी अब बताओ भेजें दें दो देना तुम्हारा आपका मुझे আমার তোমার দিন পাঠান তখন এখন নিন বলুন".split(
    /\s+/,
  ),
);

/** Unicode words retain Indic vowel marks. Small explicit aliases handle romanized input. */
export function retrievalTokens(text: string): string[] {
  return (
    // Normalize only the matching copy; callers retain original masked text for exact excerpts.
    (
      detectionTextFor(text.replace(/https?:\/\/\S+/gi, " "))
        .toLowerCase()
        .replace(/\[(?:secret|number|id|email|phone) removed\]/g, " ")
        .match(/[\p{L}\p{M}\p{N}]+/gu) ?? []
    ).filter(
      (token) =>
        token.length > 1 && !/^\p{N}+$/u.test(token) && !stopWords.has(token),
    )
  );
}
const documents = evidenceCorpus.map((card) => {
  const tokens = retrievalTokens(
    [
      ...Object.values(card.title),
      ...Object.values(card.passage),
      card.aliases,
    ].join(" "),
  );
  const frequencies = new Map<string, number>();
  for (const token of tokens)
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  return { card, length: tokens.length, frequencies };
});
const averageLength =
  documents.reduce((sum, doc) => sum + doc.length, 0) / documents.length;
const documentFrequency = new Map<string, number>();
for (const doc of documents)
  for (const token of doc.frequencies.keys())
    documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);

// Deliberately excludes indexing aliases, translated duplicates and relevance scores.
// Only bounded, reviewed source content goes into model context.
export function evidencePromptCards(cards: RetrievedEvidence[]) {
  return cards.map((card) => ({
    id: card.id,
    sourceId: card.sourceId,
    title: card.title.en,
    passage: card.passage.en,
    url: card.url,
    reviewedAt: card.reviewedAt,
    categoryIds: card.categoryIds,
  }));
}
export function retrieveEvidence(text: string): RetrievalMetadata {
  const query = [...new Set(retrievalTokens(text.slice(0, 6000)))];
  const ranked = documents
    .map(({ card, length, frequencies }) => {
      let score = 0;
      for (const token of query) {
        const tf = frequencies.get(token) ?? 0;
        if (!tf) continue;
        const df = documentFrequency.get(token)!;
        const idf = Math.log(1 + (documents.length - df + 0.5) / (df + 0.5));
        score +=
          (idf * (tf * 2.2)) /
          (tf + 1.2 * (0.25 + (0.75 * length) / averageLength));
      }
      const { aliases: _aliases, ...entry } = card;
      return { ...entry, score: Math.round(score * 10000) / 10000 };
    })
    .filter((entry) => entry.score >= 1.2)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const evidence: RetrievedEvidence[] = [];
  for (const entry of ranked) {
    if (evidence.length === MAX_RETRIEVED_CARDS) break;
    if (
      JSON.stringify(evidencePromptCards([...evidence, entry])).length <=
      MAX_EVIDENCE_CONTEXT_CHARS
    )
      evidence.push(entry);
  }
  return {
    method: "bm25",
    corpusVersion: EVIDENCE_CORPUS_VERSION,
    evidence,
    usedForAi: false,
  };
}

export function validEvidenceForCategory(
  category: string,
  ids: string[],
  evidence: RetrievedEvidence[],
): boolean {
  return (
    ids.length >= 1 &&
    ids.length <= 3 &&
    new Set(ids).size === ids.length &&
    ids.every((id) =>
      evidence.some(
        (card) => card.id === id && card.categoryIds.includes(category),
      ),
    )
  );
}
