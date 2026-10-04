import { afterEach, expect, it, vi } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import {
  retrieveEvidence,
  evidencePromptCards,
  retrievalTokens,
  RAG_PROMPT_VERSION,
} from "../server/retrieval";
import { createAuthenticatedApp as createApp, cueCacheIdentity } from "./helpers/authenticated-api";
import {
  reviewedMemory,
  selectReviewedMemory,
} from "../server/reviewed-memory";
import { evidenceCorpus } from "../server/evidence-corpus";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
const obfuscate = (text: string) => text.replace(/[\p{L}\p{M}]/gu, "$&\u00ad");
it.each([
  ["Send your OTP code to our agent", "rbi-kyc-secrets"],
  ["Guaranteed daily profits from our investment plan", "sebi-guru-promises"],
  ["Pay a clearance fee before withdrawal", "sebi-app-withdrawal"],
  ["मेरा खाता बंद होगा, OTP भेजें।", "rbi-kyc-secrets"],
  ["প্রতি মাসে নিশ্চিত লাভ পাবেন।", "sebi-guru-promises"],
])(
  "known invisible obfuscation retains guidance for%s",
  (message, expected) => {
    const changed = obfuscate(message);
    expect(retrievalTokens(changed)).toEqual(retrievalTokens(message));
    expect(retrieveEvidence(changed).evidence.map((card) => card.id)).toContain(
      expected,
    );
  },
);
it.each([
  "Send🔥OTP🔥password🔥now",
  "Send O T P to our agent",
  "Send ОТР to our agent",
])(
  "known separators or lookalikes still retrieve credential guidance: %s",
  (message) => {
    expect(retrieveEvidence(message).evidence.map((card) => card.id)).toContain(
      "rbi-kyc-secrets",
    );
  },
);
it("normalized retrieval keeps unrelated and URL-only input ungrounded", () => {
  for (const message of [
    "Please bring umbrellas to the library tomorrow",
    "https://attacker.invalid/guaranteed-profit-otp",
  ])
    expect(retrieveEvidence(message).evidence).toEqual([]);
  expect(
    retrieveEvidence(
      obfuscate("Please bring umbrellas to the library tomorrow"),
    ).evidence,
  ).toEqual([]);
});
it("normalization does not loosen guidance or reviewed-example context budgets", () => {
  const message = obfuscate(
    evidenceCorpus.map((card) => card.aliases).join(" "),
  );
  const evidence = retrieveEvidence(message).evidence;
  expect(evidence.length).toBeLessThanOrEqual(5);
  expect(
    JSON.stringify(evidencePromptCards(evidence)).length,
  ).toBeLessThanOrEqual(5000);
  const phrase = reviewedMemory.records.find(
    (record) => record.id === "memory-en-release-fee",
  )!.positive.text;
  const changed = obfuscate(phrase),
    cards = retrieveEvidence(changed).evidence;
  const memory = selectReviewedMemory(changed, "en", cards);
  expect(memory.pairs.some((pair) => pair.id === "memory-en-release-fee")).toBe(
    true,
  );
  expect(memory.pairs.length).toBeLessThanOrEqual(2);
  expect(JSON.stringify(memory.pairs).length).toBeLessThanOrEqual(1500);
  expect(
    JSON.parse(cueCacheIdentity(changed, "openai", cards)).promptVersion,
  ).toBe(RAG_PROMPT_VERSION);
  expect(RAG_PROMPT_VERSION).toBe("evidence-cues-v3-confirm-withdraw");
});
it("provider sees and must quote original masked text, never the normalized matching copy", async () => {
  const original = "Pay a clearance fee before withdrawal",
    masked = obfuscate(original);
  vi.stubEnv("AI_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "synthetic-only-key");
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      output: [
        {
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                findings: [
                  {
                    category: "release-fee",
                    excerpt: original,
                    evidenceIds: ["sebi-app-withdrawal"],
                  },
                ],
              }),
            },
          ],
        },
      ],
    }),
  });
  vi.stubGlobal("fetch", fetch);
  const result = await request(createApp()).post("/api/analyze").send({
    text: masked,
    useAI: true,
    consent: true,
    consentProvider: "openai",
  });
  expect(fetch).toHaveBeenCalledOnce();
  const body = JSON.parse(fetch.mock.calls[0][1].body);
  expect(JSON.parse(body.input[0].content).untrusted_message).toBe(masked);
  expect(result.body.analysis.aiAssisted).toBe(false);
  expect(result.body.analysis.input).toBe(masked);
});
