import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import { createAuthenticatedApp as createApp } from "./helpers/authenticated-api";

// Consent binds the actual recipient of the text.
const text = "Guaranteed returns. A clearance charge is needed before the balance can reach you.";
const geminiReply = {
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text: '{"findings":[]}' }] } }],
  }),
};
function configure(provider: "gemini" | "openai" | null) {
  vi.stubEnv("GEMINI_API_KEY", provider === "gemini" ? "gemini-test" : "");
  vi.stubEnv("OPENAI_API_KEY", provider === "openai" ? "openai-test" : "");
  const fetch = vi.fn().mockResolvedValue(geminiReply);
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
const analyze = (body: Record<string, unknown>) =>
  request(createApp()).post("/api/analyze").send({ text, ...body });

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("provider-bound AI consent (contract v1)", () => {
  it("advertises the contract version and the configured provider", async () => {
    configure("gemini");
    const { body } = await request(createApp()).get("/api/health");
    expect(body).toMatchObject({ aiConsentVersion: 1, aiAvailable: true, aiProvider: "gemini" });
    configure(null);
    const none = await request(createApp()).get("/api/health");
    expect(none.body).toMatchObject({ aiConsentVersion: 1, aiAvailable: false, aiProvider: null });
  });

  it.each([
    ["generic consent without a named provider", { useAI: true, consent: true }],
    ["a named provider without consent", { useAI: true, consentProvider: "gemini" }],
  ])("returns 400 for %s and sends nothing", async (_label, body) => {
    const fetch = configure("gemini");
    const response = await analyze(body);
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("names every supported language in the validation error", async () => {
    configure(null);
    const response = await analyze({ language: "fr" });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain("en/hi/bn");
  });

  it("rejects an unknown provider value via the strict schema", async () => {
    const fetch = configure("gemini");
    const response = await analyze({ useAI: true, consent: true, consentProvider: "unlisted-provider" });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 409 when consent named a different provider than the server uses", async () => {
    const fetch = configure("gemini");
    const response = await analyze({ useAI: true, consent: true, consentProvider: "openai" });
    expect(response.status).toBe(409);
    expect(response.body.error).toContain("Review consent again");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 409 when no provider is configured", async () => {
    const fetch = configure(null);
    const response = await analyze({ useAI: true, consent: true, consentProvider: "gemini" });
    expect(response.status).toBe(409);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends redacted text only to the named, configured provider", async () => {
    const fetch = configure("gemini");
    const response = await analyze({ useAI: true, consent: true, consentProvider: "gemini" });
    expect(response.status).toBe(200);
    // Proposal, plus a confirmation pass when on-device warnings are reviewed: every call
    // goes to the named provider only.
    expect(fetch.mock.calls.length).toBeGreaterThanOrEqual(1);
    for (const [url] of fetch.mock.calls)
      expect(url).toContain("generativelanguage.googleapis.com");
  });

  it("never contacts a provider for local-only requests, even with consent fields", async () => {
    const fetch = configure("gemini");
    const response = await analyze({ consent: true, consentProvider: "gemini" });
    expect(response.status).toBe(200);
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("hosted API origins", () => {
  it("lets the Capacitor apps call the Vercel function and still blocks unknown sites", async () => {
    vi.stubEnv("ALLOWED_ORIGINS", "");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "sajag-ashen.vercel.app");
    const { default: app } = await import("../server/vercel.ts");
    for (const origin of ["https://localhost", "capacitor://localhost", "https://sajag-ashen.vercel.app"]) {
      const preflight = await request(app)
        .options("/api/analyze")
        .set("Origin", origin)
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "content-type");
      expect(preflight.status).toBe(204);
      expect(preflight.headers["access-control-allow-origin"]).toBe(origin);
      expect(preflight.headers["access-control-allow-methods"]).toBe("GET,POST");
    }
    const foreign = await request(app).get("/api/health").set("Origin", "https://untrusted.invalid");
    expect(foreign.status).toBe(403);
  });
});
