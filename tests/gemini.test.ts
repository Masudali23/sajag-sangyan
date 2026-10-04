import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import { createAuthenticatedApp as createApp } from "./helpers/authenticated-api";
import { RULE_IDS, analyzeClaim } from "../shared/engine";
import { analysisSchema } from "../shared/validation";

const KEY = "gemini-test-key-sentinel";
const novel = "A clearance charge is needed before the balance can reach you.";
const cue = {
  category: "release-fee",
  excerpt: novel,
  evidenceIds: ["sebi-app-withdrawal"],
};

function reply(value: unknown, candidate: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(value) }] },
          ...candidate,
        },
      ],
    }),
  };
}
const confirmReply = () =>
  reply({ decisions: [{ index: 0, decision: "confirm" }] });
function mockGemini(...responses: unknown[]) {
  vi.stubEnv("GEMINI_API_KEY", KEY);
  // Fallback mechanics need several models; the default chain is tested elsewhere.
  vi.stubEnv(
    "GEMINI_MODELS",
    "gemini-3.6-flash,gemini-3.7-flash,gemini-3.8-flash,gemini-3.5-flash",
  );
  // Provider mechanics only; on-device warning review is tested in tests/ai-review.test.ts.
  vi.stubEnv("AI_LOCAL_REVIEW", "off");
  const fetch = vi.fn();
  for (const r of responses) fetch.mockResolvedValueOnce(r);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const analyze = (text = "Guaranteed returns. " + novel) =>
  request(createApp())
    .post("/api/analyze")
    .send({ text, useAI: true, consent: true, consentProvider: "gemini" });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Gemini cue provider", () => {
  it("reports Gemini in health without exposing the key", async () => {
    vi.stubEnv("GEMINI_API_KEY", KEY);
    const response = await request(createApp()).get("/api/health");
    expect(response.body).toMatchObject({
      aiAvailable: true,
      aiProvider: "gemini",
    });
    expect(response.text).not.toContain(KEY);
  });

  it("sends redacted text with a constrained schema and the key only in a header", async () => {
    const fetch = mockGemini(reply({ findings: [cue] }), confirmReply());
    const response = await analyze("OTP: 482913. " + novel);
    expect(response.status).toBe(200);
    const result = response.body.analysis;
    expect(result.aiAssisted).toBe(true);
    const addition = result.findings.find(
      (f: { id: string }) => f.id === "release-fee",
    );
    const local = analyzeClaim("OTP: 482913. " + novel).findings.find(
      (f) => f.id === cue.category,
    );
    if (local) expect(addition).toEqual(local);
    else
      expect(addition).toMatchObject({
        origin: "ai",
        excerpt: novel,
        evidenceIds: cue.evidenceIds,
      });
    expect(analysisSchema.safeParse(result).success).toBe(true);

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    );
    expect(url).not.toContain(KEY);
    expect(init.headers["x-goog-api-key"]).toBe(KEY);
    const sent = JSON.parse(init.body);
    expect(JSON.stringify(sent)).not.toContain("482913");
    expect(sent.generationConfig.responseMimeType).toBe("application/json");
    const schema = sent.generationConfig.responseJsonSchema;
    expect(schema.properties.findings.maxItems).toBe(6);
    expect(schema.properties.findings.items.properties.category.enum).toEqual([
      ...RULE_IDS,
    ]);
    expect(sent.generationConfig.thinkingConfig).toEqual({
      thinkingLevel: "low",
    });
    expect(JSON.parse(sent.contents[0].parts[0].text)).toHaveProperty(
      "untrusted_message",
    );
  });

  it.each([
    [
      "an ungrounded excerpt",
      reply({
        findings: [
          { category: "release-fee", excerpt: "Pay a release fee today" },
        ],
      }),
    ],
    [
      "an unknown category",
      reply({ findings: [{ category: "buy-now", excerpt: novel }] }),
    ],
    [
      "a truncated answer",
      reply({ findings: [cue] }, { finishReason: "MAX_TOKENS" }),
    ],
    [
      "a blocked prompt",
      {
        ok: true,
        status: 200,
        json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }),
      },
    ],
    ["a provider error", { ok: false, status: 429, json: async () => ({}) }],
  ])("falls back to local checks on %s", async (_label, providerResponse) => {
    mockGemini(providerResponse);
    const response = await analyze();
    expect(response.status).toBe(200);
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(response.body.notice).toContain("unavailable");
    expect(
      response.body.analysis.findings.every(
        (f: { origin?: string }) => f.origin !== "ai",
      ),
    ).toBe(true);
  });

  it("retries once without the thinking level if the model rejects it", async () => {
    const fetch = mockGemini(
      { ok: false, status: 400, json: async () => ({}) },
      reply({ findings: [cue] }),
      confirmReply(),
    );
    const response = await analyze();
    expect(response.body.analysis.aiAssisted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(
      JSON.parse(fetch.mock.calls[1][1].body).generationConfig.thinkingConfig,
    ).toBeUndefined();
  });

  it("retries a busy primary model once with the same-provider fallback model", async () => {
    const fetch = mockGemini(
      { ok: false, status: 503, json: async () => ({}) },
      reply({ findings: [cue] }),
      confirmReply(),
    );
    const response = await analyze();
    expect(response.body.analysis.aiAssisted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[0][0]).toContain("/models/gemini-3.6-flash:");
    expect(fetch.mock.calls[1][0]).toContain("/models/gemini-3.7-flash:");
    expect(
      fetch.mock.calls.every((c) =>
        String(c[0]).includes("generativelanguage.googleapis.com"),
      ),
    ).toBe(true);
  });

  it("rests the project on ambiguous quota errors without another vendor", async () => {
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    const busy = { ok: false, status: 429, json: async () => ({}) };
    const fetch = mockGemini(busy, busy, busy, busy);
    const response = await analyze();
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(response.body.notice).toContain("unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(
      fetch.mock.calls.map((c) => String(c[0]).match(/models\/([^:]+)/)?.[1]),
    ).toEqual(["gemini-3.6-flash"]);
    expect(
      fetch.mock.calls.some((c) => String(c[0]).includes("openai.com")),
    ).toBe(false);
  });

  it("skips the fallback model when the shared deadline would be exceeded", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetch = mockGemini();
    fetch.mockImplementationOnce(async () => {
      now += 13_000; // the busy primary used most of the 14 s budget
      return { ok: false, status: 503, json: async () => ({}) };
    });
    const response = await analyze();
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(response.body.notice).toContain("unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("reuses a validated result for identical text without spending quota again", async () => {
    const fetch = mockGemini(
      reply({ findings: [cue] }),
      confirmReply(),
      reply({ findings: [] }),
    );
    const app = createApp();
    const send = (text: string) =>
      request(app)
        .post("/api/analyze")
        .send({ text, useAI: true, consent: true, consentProvider: "gemini" });
    const first = await send("Guaranteed returns. " + novel);
    const second = await send("Guaranteed returns. " + novel);
    expect(first.body.analysis.aiAssisted).toBe(true);
    expect(second.body.analysis.findings).toEqual(first.body.analysis.findings);
    expect(fetch).toHaveBeenCalledTimes(2);
    await send("A different message about guaranteed returns.");
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("caches warning types and positions, never message text", async () => {
    const fetch = mockGemini(reply({ findings: [cue] }), confirmReply());
    const app = createApp();
    const text = "Guaranteed returns. " + novel;
    const send = () =>
      request(app)
        .post("/api/analyze")
        .send({ text, useAI: true, consent: true, consentProvider: "gemini" });
    const first = await send();
    const stored = JSON.stringify([...app.locals.aiCache.entries()]);
    expect(stored).not.toContain("clearance charge");
    expect(stored).not.toContain("Guaranteed");
    expect([...app.locals.aiCache.keys()][0]).toMatch(/^[0-9a-f]{64}$/);
    const second = await send();
    expect(fetch).toHaveBeenCalledTimes(2);
    const cached = [...app.locals.aiCache.values()][0].cues[0];
    expect(text.slice(cached.start, cached.end)).toBe(novel);
    expect(cached.evidenceIds).toEqual(cue.evidenceIds);
    expect(second.body.analysis.findings).toEqual(first.body.analysis.findings);
  });

  it("removes expired entries before lookups and failed provider calls", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const busy = { ok: false, status: 503, json: async () => ({}) };
    mockGemini(
      reply({ findings: [cue] }),
      confirmReply(),
      busy,
      busy,
      busy,
      busy,
    );
    const app = createApp();
    const send = (text: string) =>
      request(app)
        .post("/api/analyze")
        .send({ text, useAI: true, consent: true, consentProvider: "gemini" });
    await send("Guaranteed returns. " + novel);
    expect(app.locals.aiCache.size).toBe(1);
    now += 6 * 60 * 60 * 1000 + 1;
    const failed = await send("Another message promising guaranteed returns.");
    expect(failed.body.analysis.aiAssisted).toBe(false);
    expect(app.locals.aiCache.size).toBe(0);
  });

  it("reports a resting provider in health once every model is cooling down", async () => {
    const quota = { ok: false, status: 429, json: async () => ({}) };
    mockGemini(quota, quota, quota, quota);
    const app = createApp();
    const before = await request(app).get("/api/health");
    expect(before.body).toMatchObject({ aiAvailable: true, aiStatus: "ready" });
    await request(app)
      .post("/api/analyze")
      .send({
        text: "Guaranteed returns. " + novel,
        useAI: true,
        consent: true,
        consentProvider: "gemini",
      });
    const after = await request(app).get("/api/health");
    expect(after.body).toMatchObject({
      aiAvailable: false,
      aiProvider: "gemini",
      aiStatus: "resting",
      aiConsentVersion: 1,
    });
  });

  it("does not cache a failed review", async () => {
    let now = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const busy = { ok: false, status: 503, json: async () => ({}) };
    const fetch = mockGemini(
      busy,
      busy,
      busy,
      busy,
      reply({ findings: [cue] }),
      confirmReply(),
    );
    const app = createApp();
    const send = () =>
      request(app)
        .post("/api/analyze")
        .send({
          text: "Guaranteed returns. " + novel,
          useAI: true,
          consent: true,
          consentProvider: "gemini",
        });
    expect((await send()).body.analysis.aiAssisted).toBe(false);
    now += 61_000; // busy models rest for one minute
    expect((await send()).body.analysis.aiAssisted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(6);
  });

  it("skips a model whose quota is exhausted on later requests", async () => {
    const quota = {
      ok: false,
      status: 429,
      json: async () => ({
        error: {
          details: [
            {
              "@type": "type.googleapis.com/google.rpc.QuotaFailure",
              violations: [
                {
                  quotaMetric:
                    "generativelanguage.googleapis.com/generate_content_free_tier_requests",
                  quotaId: "GenerateRequestsPerDayPerProjectPerModel-FreeTier",
                  quotaDimensions: { model: "gemini-3.6-flash" },
                },
              ],
            },
          ],
        },
      }),
    };
    const fetch = mockGemini(
      quota,
      reply({ findings: [] }),
      reply({ findings: [] }),
    );
    const app = createApp();
    const send = (text: string) =>
      request(app)
        .post("/api/analyze")
        .send({ text, useAI: true, consent: true, consentProvider: "gemini" });
    expect(
      (await send("Guaranteed returns. " + novel)).body.analysis.aiAssisted,
    ).toBe(true);
    expect(
      (await send("Another message promising guaranteed returns.")).body
        .analysis.aiAssisted,
    ).toBe(true);
    const models = fetch.mock.calls.map(
      (c) => String(c[0]).match(/models\/([^:]+)/)?.[1],
    );
    expect(models).toEqual([
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.7-flash",
    ]);
  });

  it("answers immediately once every model is resting", async () => {
    const quota = { ok: false, status: 429, json: async () => ({}) };
    const fetch = mockGemini(quota, quota, quota, quota);
    const app = createApp();
    const send = (text: string) =>
      request(app)
        .post("/api/analyze")
        .send({ text, useAI: true, consent: true, consentProvider: "gemini" });
    await send("Guaranteed returns. " + novel);
    const second = await send("Another message promising guaranteed returns.");
    expect(second.body.analysis.aiAssisted).toBe(false);
    expect(second.body.notice).toContain("unavailable");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("prefers Gemini when both keys exist, and AI_PROVIDER can force OpenAI", async () => {
    vi.stubEnv("OPENAI_API_KEY", "openai-test");
    const fetch = mockGemini(reply({ findings: [] }));
    await analyze();
    expect(fetch.mock.calls[0][0]).toContain(
      "generativelanguage.googleapis.com",
    );
    vi.stubEnv("AI_PROVIDER", "openai");
    const health = await request(createApp()).get("/api/health");
    expect(health.body.aiProvider).toBe("openai");
  });

  it("rejects an unsafe model name without calling the provider", async () => {
    const fetch = mockGemini(reply({ findings: [cue] }), confirmReply());
    vi.stubEnv("GEMINI_MODEL", "../../other?x=");
    const response = await analyze();
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
