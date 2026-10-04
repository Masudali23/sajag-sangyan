import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import { createAuthenticatedApp as createApp, providerReviewLimits } from "./helpers/authenticated-api";
import * as engine from "../shared/engine";

const text = "A clearance charge is needed before the balance can reach you.";
const cue = {
  category: "release-fee",
  excerpt: text,
  evidenceIds: ["sebi-app-withdrawal"],
};
const confirmed = { decisions: [{ index: 0, decision: "confirm" }] };
const withdrawn = { decisions: [{ index: 0, decision: "withdraw" }] };
const models = Array.from(
  { length: 12 },
  (_, i) => `gemini-3-capacity-${i + 1}`,
);
const key = "synthetic-capacity-key-not-real";
function reply(value: unknown) {
  return new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: JSON.stringify(value) }] },
        },
      ],
    }),
  );
}
function error(
  status: number,
  headers: Record<string, string> = {},
  details: unknown[] = [],
) {
  return new Response(JSON.stringify({ error: { details } }), {
    status,
    headers,
  });
}
function mock(...values: unknown[]) {
  const fetch = vi.fn();
  for (const value of values)
    fetch.mockResolvedValueOnce(
      value instanceof Response ? value : reply(value),
    );
  vi.stubGlobal("fetch", fetch);
  return fetch;
}
function send(app = createApp(), message = text, useAI = true) {
  return request(app).post("/api/analyze").send({
    text: message,
    language: "en",
    consent: true,
    consentProvider: "gemini",
    useAI,
  });
}
beforeEach(() => {
  for (let n = 1; n <= 10; n++) {
    vi.stubEnv(`GEMINI_API_KEY_${n}`, "");
    vi.stubEnv(`GEMINI_PROJECT_ID_${n}`, "");
  }
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("OPENAI_API_KEY", "");
  vi.stubEnv("GEMINI_API_KEY", key);
  vi.stubEnv("AI_PROVIDER", "gemini");
  vi.stubEnv("GEMINI_MODELS", models.join(","));
  vi.stubEnv("GEMINI_MODEL", "");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("bounded fast overload recovery", () => {
  it.each(["UNAUTHENTICATED", "PERMISSION_DENIED", "RESOURCE_EXHAUSTED"])(
    "does not award overload credits when a 503 body reports %s",
    async (status) => {
      for (let n = 1; n <= 5; n++) {
        vi.stubEnv(`GEMINI_API_KEY_${n}`, `synthetic-project-key-${n}`);
        vi.stubEnv(`GEMINI_PROJECT_ID_${n}`, `synthetic-project-${n}`);
      }
      const fetch = vi.fn().mockImplementation(
        async () =>
          new Response(JSON.stringify({ error: { status } }), {
            status: 503,
          }),
      );
      vi.stubGlobal("fetch", fetch);
      expect((await send()).body.analysis.aiAssisted).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(4);
    },
  );
  it("does not award overload credits to 503 responses with quota details", async () => {
    const details = [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: [],
      },
    ];
    const fetch = vi
      .fn()
      .mockImplementation(async () => error(503, {}, details));
    vi.stubGlobal("fetch", fetch);
    expect((await send()).body.analysis.aiAssisted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it("allows four fast 503s followed by both grounded review passes", async () => {
    const fetch = mock(
      ...Array.from({ length: 4 }, () => error(503)),
      { findings: [cue] },
      confirmed,
    );
    const app = createApp();
    const response = await send(app);
    expect(response.body.analysis.aiAssisted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(6);
    expect(app.locals.aiCache.size).toBe(1);
    expect(app.locals.providerOutcomes.snapshot()).toMatchObject({
      physicalAttempts: { total: 6, statuses: { "503": 4, "200": 2 } },
      reviews: {
        gemini: { total: 1, outcomes: { completed: 1, fallback: 0, cache: 0 } },
      },
    });
  });
  it("shares credits across proposal and confirmation rather than resetting them", async () => {
    const fetch = mock(
      error(503),
      error(503),
      { findings: [cue] },
      error(503),
      error(503),
      confirmed,
    );
    expect((await send()).body.analysis.aiAssisted).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(6);
  });
  it("stops at eight physical calls even if every candidate is immediately overloaded", async () => {
    const fetch = vi.fn().mockImplementation(async () => error(503));
    vi.stubGlobal("fetch", fetch);
    const app = createApp();
    expect((await send(app)).body.analysis.aiAssisted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(8);
    expect(app.locals.aiCache.size).toBe(0);
    expect(
      app.locals.providerOutcomes.snapshot().reviews.gemini.outcomes,
    ).toEqual({ completed: 0, fallback: 1, cache: 0 });
  });
  it.each([500, 502, 504])(
    "does not award credits for HTTP %s",
    async (status) => {
      const fetch = vi.fn().mockImplementation(async () => error(status));
      vi.stubGlobal("fetch", fetch);
      expect((await send()).body.analysis.aiAssisted).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(4);
    },
  );
  it("rests the project after an ambiguous 429 without spending extra credits", async () => {
    const fetch = vi.fn().mockImplementation(async () => error(429));
    vi.stubGlobal("fetch", fetch);
    expect((await send()).body.analysis.aiAssisted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each(["TypeError", "AbortError", "TimeoutError"])(
    "does not award credits for %s transport failures",
    async (name) => {
      const fetch = vi.fn().mockImplementation(async () => {
        const err = new Error("synthetic private provider body");
        err.name = name;
        throw err;
      });
      vi.stubGlobal("fetch", fetch);
      expect((await send()).body.analysis.aiAssisted).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(4);
    },
  );
  it.each([
    [1000, 8],
    [1001, 4],
  ])(
    "includes error-body reading in the fast threshold (%s ms)",
    async (elapsed, count) => {
      let now = 1000000;
      vi.spyOn(Date, "now").mockImplementation(() => now);
      const fetch = vi.fn().mockImplementation(async () => {
        const response = error(503);
        const json = response.json.bind(response);
        response.json = async () => {
          now += elapsed;
          return json();
        };
        return response;
      });
      vi.stubGlobal("fetch", fetch);
      expect((await send()).body.analysis.aiAssisted).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(count);
    },
  );
  it("rejects an empty proposal that arrives after the absolute deadline", async () => {
    let now = 1000000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetch = vi.fn().mockImplementation(async () => {
      now += 14000;
      return reply({ findings: [] });
    });
    vi.stubGlobal("fetch", fetch);
    const app = createApp();
    expect((await send(app)).body.analysis.aiAssisted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(app.locals.aiCache.size).toBe(0);
  });
  it("rejects a late confirmation and never caches its unconfirmed proposal", async () => {
    let now = 1000000,
      count = 0;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetch = vi.fn().mockImplementation(async () => {
      now += ++count === 1 ? 6000 : 8000;
      return reply(count === 1 ? { findings: [cue] } : confirmed);
    });
    vi.stubGlobal("fetch", fetch);
    const app = createApp();
    expect((await send(app)).body.analysis.aiAssisted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(app.locals.aiCache.size).toBe(0);
  });
  it("starts no more calls after a late overload exhausts the deadline", async () => {
    let now = 1000000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetch = vi.fn().mockImplementation(async () => {
      now += 14001;
      return error(503);
    });
    vi.stubGlobal("fetch", fetch);
    expect((await send()).body.analysis.aiAssisted).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("honours Retry-After instead of retrying the same overloaded model immediately", async () => {
    vi.stubEnv("GEMINI_MODELS", models.slice(0, 2).join(","));
    const fetch = mock(error(503, { "Retry-After": "120" }), { findings: [] });
    const app = createApp();
    expect((await send(app)).body.analysis.aiAssisted).toBe(true);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual(
      models
        .slice(0, 2)
        .map(
          (model) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        ),
    );
    expect(
      app.locals.providerOutcomes.snapshot().physicalAttempts.retryDelays[
        "up-to-1h"
      ],
    ).toBe(1);
  });
  it.each(["header", "retry-info"])(
    "does not grant extra overload credits when %s asks for backoff",
    async (kind) => {
      const fetch = vi.fn().mockImplementation(async () =>
        error(
          503,
          kind === "header" ? { "Retry-After": "120" } : {},
          kind === "retry-info"
            ? [
                {
                  "@type": "type.googleapis.com/google.rpc.RetryInfo",
                  retryDelay: "120s",
                },
              ]
            : [],
        ),
      );
      vi.stubGlobal("fetch", fetch);
      expect((await send()).body.analysis.aiAssisted).toBe(false);
      expect(fetch).toHaveBeenCalledTimes(4);
    },
  );
  it("preserves daily project cooldown even after several fast overloads", async () => {
    let now = Date.parse("2026-10-04T01:00:00Z");
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const daily = {
      "@type": "type.googleapis.com/google.rpc.QuotaFailure",
      violations: [
        {
          quotaId: "GenerateRequestsPerDayPerProject-FreeTier",
          quotaMetric:
            "generativelanguage.googleapis.com/generate_content_free_tier_requests",
        },
      ],
    };
    const fetch = mock(
      error(503),
      error(429, { "Retry-After": "120" }, [daily]),
    );
    const app = createApp();
    expect((await send(app)).body.analysis.aiAssisted).toBe(false);
    now += 121000;
    expect(
      (await send(app, text + " Another example.")).body.analysis.aiAssisted,
    ).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect((await request(app).get("/api/health")).body.aiStatus).toBe(
      "resting",
    );
    expect(
      app.locals.providerOutcomes.snapshot().physicalAttempts.quotaScopes[
        "per-day"
      ],
    ).toBe(1);
  });
  it("exposes immutable, finite shared limits", () => {
    expect(providerReviewLimits()).toEqual({
      deadlineMs: 14000,
      maxAttempts: 8,
      maxStandardAttempts: 4,
      maxFast503Credits: 4,
      fast503ThresholdMs: 1000,
    });
    expect(Object.isFrozen(providerReviewLimits())).toBe(true);
  });
});

describe("model fairness and explicit Lite eligibility", () => {
  it("tries a fallback model before exhausting ordinary calls on the primary in local pool mode", async () => {
    vi.stubEnv("GEMINI_MODELS", models.slice(0, 2).join(","));
    for (let n = 1; n <= 5; n++) {
      vi.stubEnv(`GEMINI_API_KEY_${n}`, `synthetic-project-key-${n}`);
      vi.stubEnv(`GEMINI_PROJECT_ID_${n}`, `synthetic-project-${n}`);
    }
    const fetch = mock(error(429), { findings: [] });
    expect((await send()).body.analysis.aiAssisted).toBe(true);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual(
      models
        .slice(0, 2)
        .map(
          (model) =>
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        ),
    );
  });
  it.each(["VERCEL", "NODE_ENV"])(
    "keeps production on one legacy credential when %s marks deployment",
    async (flag) => {
      vi.stubEnv(flag, flag === "NODE_ENV" ? "production" : "1");
      vi.stubEnv("GEMINI_API_KEY_1", "synthetic-ignored-extra-key");
      vi.stubEnv("GEMINI_PROJECT_ID_1", "synthetic-extra-project");
      const fetch = mock(error(503), { findings: [cue] }, confirmed);
      expect((await send()).body.analysis.aiAssisted).toBe(true);
      expect(
        fetch.mock.calls.every(
          ([, init]) => init.headers["x-goog-api-key"] === key,
        ),
      ).toBe(true);
    },
  );
  it("defaults to the measured fixed Lite model, never a moving alias", async () => {
    vi.stubEnv("GEMINI_MODELS", "");
    const fetch = vi.fn().mockImplementation(async () => error(503));
    vi.stubGlobal("fetch", fetch);
    await send();
    expect(fetch.mock.calls.length).toBeGreaterThan(0);
    for (const [url] of fetch.mock.calls) {
      expect(String(url)).toContain("/models/gemini-3.5-flash-lite:");
      expect(String(url)).not.toMatch(/latest/);
    }
  });
  it("can exercise an explicitly configured last Lite fallback through confirmation", async () => {
    const lite = "gemini-3.5-flash-lite";
    vi.stubEnv("GEMINI_MODELS", [models[0], models[1], lite].join(","));
    const fetch = mock(error(503), error(503), { findings: [cue] }, confirmed);
    expect((await send()).body.analysis.aiAssisted).toBe(true);
    expect(
      fetch.mock.calls
        .map(([url]) => String(url))
        .slice(2)
        .every((url) => url.includes(lite)),
    ).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it("withdraws a Lite proposal on a protective lesson rather than trusting a successful response", async () => {
    vi.stubEnv("GEMINI_MODELS", `${models[0]},gemini-3.5-flash-lite`);
    const message =
      "The lesson warns: a clearance charge is needed before the balance can reach you. Never pay such fees.";
    const lessonCue = {
      ...cue,
      excerpt: "a clearance charge is needed before the balance can reach you.",
    };
    const fetch = mock(error(503), { findings: [lessonCue] }, withdrawn);
    const response = await send(createApp(), message);
    expect(response.body.analysis.aiAssisted).toBe(true);
    expect(
      response.body.analysis.findings.some(
        (f: { origin: string }) => f.origin === "ai",
      ),
    ).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("rejects a Lite result with invented guidance and does not cache it", async () => {
    vi.stubEnv("GEMINI_MODELS", "gemini-3.5-flash-lite");
    mock({ findings: [{ ...cue, evidenceIds: ["invented-guidance"] }] });
    const app = createApp();
    expect((await send(app)).body.analysis.aiAssisted).toBe(false);
    expect(app.locals.aiCache.size).toBe(0);
  });
});

describe("private aggregate outcome integration", () => {
  it("counts a downstream merge failure exactly once, after either live or cached review", async () => {
    mock({ findings: [cue] }, confirmed);
    const app = createApp();
    vi.spyOn(engine, "addAiFindings").mockImplementationOnce(() => {
      throw new Error("synthetic private merge failure");
    });
    expect((await send(app)).body.analysis.aiAssisted).toBe(false);
    expect(app.locals.providerOutcomes.snapshot().reviews.gemini).toEqual({
      total: 1,
      outcomes: { completed: 0, fallback: 1, cache: 0 },
    });
    vi.spyOn(engine, "addAiFindings").mockImplementationOnce(() => {
      throw new Error("synthetic private cached merge failure");
    });
    expect((await send(app)).body.analysis.aiAssisted).toBe(false);
    expect(app.locals.providerOutcomes.snapshot().reviews.gemini).toEqual({
      total: 2,
      outcomes: { completed: 0, fallback: 2, cache: 0 },
    });
  });
  it("counts cache reuse separately from physical success and live completion", async () => {
    const fetch = mock({ findings: [cue] }, confirmed);
    const app = createApp();
    await send(app);
    await send(app);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(app.locals.providerOutcomes.snapshot()).toMatchObject({
      physicalAttempts: { total: 2, passes: { proposal: 1, confirmation: 1 } },
      reviews: {
        gemini: { total: 2, outcomes: { completed: 1, cache: 1, fallback: 0 } },
      },
    });
  });
  it("counts an invalid HTTP-200 response as validation and fallback, never completion", async () => {
    mock({ findings: [{ ...cue, evidenceIds: ["untrusted-id"] }] });
    const app = createApp();
    const response = await send(app);
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(app.locals.providerOutcomes.snapshot()).toMatchObject({
      physicalAttempts: { total: 1, statuses: { "200": 1 } },
      diagnostics: { events: { validation: 1 } },
      reviews: { gemini: { outcomes: { completed: 0, fallback: 1 } } },
    });
  });
  it("runs counters without an optional observer and isolates each app instance", async () => {
    mock({ findings: [] });
    const app = createApp(),
      other = createApp();
    await send(app);
    expect(app.locals.providerOutcomes.snapshot().reviews.gemini.total).toBe(1);
    expect(other.locals.providerOutcomes.snapshot().reviews.gemini.total).toBe(
      0,
    );
  });
  it("does not offer a public metrics endpoint or expose counters in API responses", async () => {
    mock({ findings: [] });
    const app = createApp();
    const response = await send(app);
    const health = await request(app).get("/api/health");
    expect(response.text + health.text).not.toMatch(
      /providerOutcomes|physicalAttempts|schemaVersion|maxCount/,
    );
    const state = JSON.stringify(app.locals.providerOutcomes.snapshot());
    expect(state).not.toContain(text);
    expect(state).not.toContain(key);
    expect(state).not.toMatch(
      /apiKey|projectId|modelId|account|quote|excerpt|message/,
    );
    expect((await request(app).get("/api/provider-outcomes")).status).toBe(404);
  });
  it("records no logical AI review for offline checks or rejected consent", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const app = createApp();
    await send(app, text, false);
    await request(app).post("/api/analyze").send({ text, useAI: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(app.locals.providerOutcomes.snapshot().reviews.gemini.total).toBe(0);
  });
});
