import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import { createAuthenticatedApp as createApp } from "./helpers/authenticated-api";
import { analyzeClaim } from "../shared/engine";
import { sources } from "../shared/content";
import { analysisSchema } from "../shared/validation";

function mockCueResponse(value: unknown, extra: Record<string, unknown> = {}) {
  vi.stubEnv("OPENAI_API_KEY", "test-only");
  vi.stubEnv("GEMINI_API_KEY", "");
  const fetch = vi.fn().mockImplementation(async (_url, init) => {
    const body = JSON.parse(init.body);
    const confirmation =
      body.text.format.name === "financial_literacy_confirmation";
    const findings = (value as { findings?: unknown[] })?.findings ?? [];
    const payload = confirmation
      ? {
          decisions: findings.map((_, index) => ({
            index,
            decision: "confirm",
          })),
        }
      : value;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output: [
          { content: [{ type: "output_text", text: JSON.stringify(payload) }] },
        ],
        ...extra,
      }),
    };
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("constrained AI cue extraction", () => {
  const novel =
    "A clearance charge is needed before the balance can reach you.";
  const base = "Guaranteed returns. " + novel;
  const cue = {
    category: "release-fee",
    excerpt: novel,
    evidenceIds: ["sebi-app-withdrawal"],
  };
  const call = (text = base) =>
    request(createApp())
      .post("/api/analyze")
      .send({ text, useAI: true, consent: true, consentProvider: "openai" });

  it("adds only library prose and sources for an exact redacted excerpt", async () => {
    const fetch = mockCueResponse({ findings: [cue] });
    const response = await call("ＯＴＰ：１２３４５６. " + novel);
    expect(response.status).toBe(200);
    const result = response.body.analysis;
    const addition = result.findings.find(
      (f: { id: string }) => f.id === "release-fee",
    );
    expect(addition.origin).toBe("ai");
    expect(addition.excerpt).toBe(novel);
    expect(addition.explanation.en).toContain("independent verification");
    expect(
      addition.sourceIds.every((id: string) =>
        sources.some((s) => s.id === id),
      ),
    ).toBe(true);
    expect(result.status).toBe("attention");
    expect(result.lessonIds).toContain("fees");
    expect(analysisSchema.safeParse(result).success).toBe(true);
    const sent = JSON.parse(fetch.mock.calls[0][1].body);
    expect(JSON.stringify(sent)).not.toMatch(/123456|１２３４５６/);
    expect(sent.store).toBe(false);
    expect(sent.text.format.strict).toBe(true);
    expect(sent.text.format.schema.properties.findings.maxItems).toBe(6);
    expect(
      sent.text.format.schema.properties.findings.items.additionalProperties,
    ).toBe(false);
  });
  it("retains local findings and drops repeated AI categories", async () => {
    mockCueResponse({
      findings: [
        cue,
        cue,
        {
          category: "guarantee",
          excerpt: "Guaranteed returns",
          evidenceIds: ["sebi-guru-promises"],
        },
      ],
    });
    const { body } = await call();
    expect(
      body.analysis.findings.filter(
        (f: { id: string }) => f.id === "release-fee",
      ),
    ).toHaveLength(1);
    expect(
      body.analysis.findings.find((f: { id: string }) => f.id === "guarantee"),
    ).toEqual(analyzeClaim(base).findings.find((f) => f.id === "guarantee"));
    expect(body.analysis.status).toBe("attention");
  });
  it.each([
    { findings: [{ category: "buy-this-stock", excerpt: novel }] },
    { findings: [{ ...cue, explanation: "Buy ABC now" }] },
    { findings: [{ ...cue, source: "https://attacker.invalid" }] },
    { findings: [cue], remove: ["guarantee"] },
    { findings: Array.from({ length: 7 }, () => cue) },
    { findings: [{ ...cue, excerpt: "tiny" }] },
    { findings: [{ ...cue, excerpt: "x".repeat(301) }] },
    { concepts: ["fees"] },
    "Buy a stock tomorrow",
  ])(
    "rejects invalid model schema without losing local warnings",
    async (payload) => {
      mockCueResponse(payload);
      const { body } = await call();
      expect(body.analysis.aiAssisted).toBe(false);
      expect(body.analysis.findings).toEqual(analyzeClaim(base).findings);
      expect(body.notice).toContain("unavailable");
      expect(JSON.stringify(body)).not.toContain("attacker.invalid");
      expect(JSON.stringify(body)).not.toContain("Buy ABC");
    },
  );
  it.each([
    novel.toUpperCase(),
    "fabricated excerpt that was never supplied",
    "OTP is 123456",
  ])("rejects non-verbatim or unredacted excerpts: %s", async (excerpt) => {
    mockCueResponse({ findings: [{ ...cue, excerpt }] });
    const { body } = await call("OTP is 123456. " + base);
    expect(
      body.analysis.findings.some(
        (f: { origin?: string }) => f.origin === "ai",
      ),
    ).toBe(false);
    expect(body.analysis.aiAssisted).toBe(false);
    expect(body.notice).toContain("unavailable");
    expect(body.analysis.status).toBe("attention");
    expect(JSON.stringify(body)).not.toContain("123456");
  });
  it("an empty AI result never removes or downgrades a local warning", async () => {
    mockCueResponse({ findings: [] });
    const { body } = await call();
    expect(body.analysis.findings).toEqual(analyzeClaim(base).findings);
    expect(body.analysis.status).toBe("attention");
  });
  it.each([
    { status: "incomplete" },
    { output: [{ content: [{ type: "refusal", refusal: "Cannot assess" }] }] },
  ])("falls back on incomplete or refused output", async (extra) => {
    mockCueResponse({ findings: [cue] }, extra);
    const { body } = await call();
    expect(body.analysis.aiAssisted).toBe(false);
    expect(body.analysis.findings).toEqual(analyzeClaim(base).findings);
  });
  it("refuses AI consent when no provider is configured, without sending anything", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await call();
    expect(response.status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("does not invoke a configured provider without opt-in", async () => {
    const fetch = mockCueResponse({ findings: [cue] });
    const response = await request(createApp())
      .post("/api/analyze")
      .send({ text: base });
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
describe("deployment proxy boundaries", () => {
  it.each(["true", "-1", "1.5", "100", "loopback"])(
    "rejects unsafe or unsupported TRUST_PROXY=%s",
    (value) => {
      vi.stubEnv("TRUST_PROXY", value);
      expect(() => createApp()).toThrow("TRUST_PROXY must be");
    },
  );
  it("keeps forwarded clients separate behind one trusted ingress", async () => {
    vi.stubEnv("TRUST_PROXY", "1");
    const app = createApp();
    for (let i = 0; i < 30; i++) {
      expect(
        (
          await request(app)
            .get("/api/health")
            .set("X-Forwarded-For", "198.51.100.10")
        ).status,
      ).toBe(200);
    }
    expect(
      (
        await request(app)
          .get("/api/health")
          .set("X-Forwarded-For", "198.51.100.10")
      ).status,
    ).toBe(429);
    expect(
      (
        await request(app)
          .get("/api/health")
          .set("X-Forwarded-For", "203.0.113.20")
      ).status,
    ).toBe(200);
    // An extra left-hand address cannot evade the bucket of the closest client.
    expect(
      (
        await request(app)
          .get("/api/health")
          .set("X-Forwarded-For", "192.0.2.99, 198.51.100.10")
      ).status,
    ).toBe(429);
  });
  it("ignores client-supplied forwarded addresses in direct mode", async () => {
    vi.stubEnv("TRUST_PROXY", "");
    const app = createApp();
    const expectedDiagnostic = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    for (let i = 0; i < 30; i++) {
      expect(
        (
          await request(app)
            .get("/api/health")
            .set("X-Forwarded-For", `198.51.100.${i + 1}`)
        ).status,
      ).toBe(200);
    }
    expect(
      (
        await request(app)
          .get("/api/health")
          .set("X-Forwarded-For", "203.0.113.99")
      ).status,
    ).toBe(429);
    expectedDiagnostic.mockRestore();
  });
});
describe("API safety boundaries", () => {
  it("serves a useful no-key check", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const response = await request(createApp())
      .post("/api/analyze")
      .send({ text: "Guaranteed returns of 3% every day. Join now!" });
    expect(response.status).toBe(200);
    expect(response.body.analysis.status).toBe("attention");
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(response.headers["cache-control"]).toBe("no-store");
  });
  it("requires explicit opt-in before provider processing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await request(createApp())
      .post("/api/analyze")
      .send({ text: "What does diversification mean?", useAI: true });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([
    { text: "short" },
    { text: "x".repeat(6001) },
    { text: "A sufficiently long claim", language: "xx" },
    { text: "A sufficiently long claim", arbitrary: "value" },
  ])("rejects malformed or unsupported input", async (payload) => {
    expect(
      (await request(createApp()).post("/api/analyze").send(payload)).status,
    ).toBe(400);
  });
  it("rejects oversized bodies", async () => {
    expect(
      (
        await request(createApp())
          .post("/api/analyze")
          .send({ text: "x".repeat(40000) })
      ).status,
    ).toBe(413);
  });
  it("rejects a foreign origin before processing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const response = await request(createApp())
      .post("/api/analyze")
      .set("Origin", "https://untrusted.invalid")
      .send({ text: "Guaranteed returns daily", useAI: true, consent: true });
    expect(response.status).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("falls back when the provider fails or returns invalid output", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-only");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await request(createApp()).post("/api/analyze").send({
      text: "Guaranteed returns every day",
      useAI: true,
      consent: true,
      consentProvider: "openai",
    });
    expect(response.status).toBe(200);
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(response.body.notice).toContain("unavailable");
  });
  it("does not expose credentials from health", async () => {
    vi.stubEnv("OPENAI_API_KEY", "secret-sentinel");
    const response = await request(createApp()).get("/api/health");
    expect(response.body.aiAvailable).toBe(true);
    expect(response.text).not.toContain("secret-sentinel");
  });
  it("cannot turn the explainer into a recommendation endpoint", async () => {
    const response = await request(createApp())
      .post("/api/explain")
      .send({ question: "Tell me which stock to buy tomorrow" });
    expect(response.body.lessons).toEqual([]);
    expect(response.body.notice).toContain("cannot recommend");
  });
});
