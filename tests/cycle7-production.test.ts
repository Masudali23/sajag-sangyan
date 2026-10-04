import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import { createAuthenticatedApp as createApp } from "./helpers/authenticated-api";
import {
  createGeminiPool,
  geminiConfiguration,
  hasGeminiConfiguration,
} from "../server/gemini-pool";

const LEGACY = "synthetic.single.project.key";
const LOCAL = "synthetic.local.evaluation.key";
const slots = { GEMINI_PROJECT_ID_1: "123456789001", GEMINI_API_KEY_1: LOCAL };
const modes = [
  { NODE_ENV: "production" },
  { VERCEL: "1", NODE_ENV: "test" },
] as const;
beforeEach(() => {
  for (const name of [
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "GEMINI_MODELS",
    "AI_PROVIDER",
    "OPENAI_API_KEY",
    "VERCEL",
  ])
    vi.stubEnv(name, "");
  for (let i = 0; i <= 12; i++)
    for (const name of ["API_KEY", "PROJECT_ID"])
      vi.stubEnv(`GEMINI_${name}_${i}`, "");
  vi.stubEnv("NODE_ENV", "test");
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw Error("Unexpected provider request");
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.each(modes)("production Gemini configuration %j", (mode) => {
  it("uses only the legacy key even when numbered projects are also configured", () => {
    expect(
      geminiConfiguration({ ...mode, ...slots, GEMINI_API_KEY: LEGACY }),
    ).toEqual({ projects: [{ projectId: ":legacy", key: LEGACY }] });
  });
  it("ignores malformed, partial and excess numbered local slots when legacy is valid", () => {
    expect(
      geminiConfiguration({
        ...mode,
        GEMINI_API_KEY: LEGACY,
        GEMINI_API_KEY_1: "bad\r\nheader",
        GEMINI_PROJECT_ID_2: "INVALID/PROJECT",
        GEMINI_API_KEY_12: LOCAL,
      }),
    ).toEqual({ projects: [{ projectId: ":legacy", key: LEGACY }] });
  });
  it.each([
    "bad\r\nheader",
    " padded-key",
    "bad\tkey",
    "bad\u0000key",
    "é-key",
    "x".repeat(513),
  ])(
    "fails closed on malformed legacy key %j without local-pool fallback",
    (key) => {
      const result = geminiConfiguration({
        ...mode,
        ...slots,
        GEMINI_API_KEY: key,
      });
      expect(result.projects).toEqual([]);
      expect(result.error).toMatch(/printable ASCII/);
      expect(JSON.stringify(result)).not.toContain(key);
      expect(JSON.stringify(result)).not.toContain(LOCAL);
    },
  );
  it("rejects numbered-only production configuration with a generic local diagnostic", () => {
    const result = geminiConfiguration({ ...mode, ...slots });
    expect(result.projects).toEqual([]);
    expect(result.error).toMatch(/Production Gemini requires GEMINI_API_KEY/);
    expect(hasGeminiConfiguration({ ...mode, ...slots })).toBe(true);
    expect(JSON.stringify(result)).not.toContain(LOCAL);
    expect(JSON.stringify(result)).not.toContain(slots.GEMINI_PROJECT_ID_1);
  });
  it("stays unconfigured when every key is absent", () => {
    expect(geminiConfiguration(mode)).toEqual({ projects: [] });
    expect(hasGeminiConfiguration(mode)).toBe(false);
  });
});

it.each([{}, { NODE_ENV: "development" }, { NODE_ENV: "test", VERCEL: "0" }])(
  "preserves numbered local evaluation behavior in %j",
  (mode) => {
    expect(
      geminiConfiguration({ ...mode, ...slots, GEMINI_API_KEY: LEGACY }),
    ).toEqual({
      projects: [{ projectId: slots.GEMINI_PROJECT_ID_1, key: LOCAL }],
    });
  },
);
it("does not reuse previously selected local projects after entering production", () => {
  for (const [name, value] of Object.entries({
    ...slots,
    GEMINI_API_KEY: LEGACY,
  }))
    vi.stubEnv(name, value);
  const pool = createGeminiPool();
  expect(pool.configuration().projects[0].key).toBe(LOCAL);
  vi.stubEnv("NODE_ENV", "production");
  const projects = pool.configuration().projects;
  expect(projects).toHaveLength(1);
  expect(projects[0].key).toBe(LEGACY);
  for (let i = 0; i < 12; i++)
    expect(pool.rotate(projects).map((project) => project.key)).toEqual([
      LEGACY,
    ]);
});

const success = () =>
  new Response(
    JSON.stringify({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: '{"findings":[]}' }] },
        },
      ],
    }),
  );
function apiSetup() {
  for (const [name, value] of Object.entries({
    ...slots,
    GEMINI_API_KEY: LEGACY,
    NODE_ENV: "production",
    GEMINI_MODELS: "gemini-3.6-flash,gemini-3.7-flash",
    // Retry mechanics only; on-device warning review is tested in tests/ai-review.test.ts.
    AI_LOCAL_REVIEW: "off",
  }))
    vi.stubEnv(name, value);
  const fetch = vi.fn().mockImplementation(async () => success());
  vi.stubGlobal("fetch", fetch);
  const app = createApp();
  let serial = 0;
  return {
    app,
    fetch,
    health: () => request(app).get("/api/health"),
    send: () =>
      request(app)
        .post("/api/analyze")
        .send({
          text: `Guaranteed daily returns with no risk. Offer ${++serial}.`,
          useAI: true,
          consent: true,
          consentProvider: "gemini",
        }),
  };
}
it("keeps production retries within the same legacy project and provider", async () => {
  const c = apiSetup();
  c.fetch.mockResolvedValueOnce(new Response("{}", { status: 503 }));
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  expect(c.fetch).toHaveBeenCalledTimes(2);
  expect(
    c.fetch.mock.calls.every(
      ([url, init]) =>
        url.includes("generativelanguage.googleapis.com") &&
        init.headers["x-goog-api-key"] === LEGACY,
    ),
  ).toBe(true);
});
it.each([401, 429])(
  "production HTTP%s never rotates into a numbered project",
  async (status) => {
    const c = apiSetup();
    c.fetch.mockImplementation(async () => new Response("{}", { status }));
    expect((await c.send()).body.analysis.aiAssisted).toBe(false);
    expect((await c.send()).body.analysis.aiAssisted).toBe(false);
    expect(c.fetch).toHaveBeenCalledTimes(1);
    expect((await c.health()).body).toMatchObject({
      aiProvider: "gemini",
      aiAvailable: false,
      aiStatus: "resting",
    });
  },
);
it("numbered-only production fails closed without automatic OpenAI fallback or public config leakage", async () => {
  const c = apiSetup();
  vi.stubEnv("GEMINI_API_KEY", "");
  vi.stubEnv("OPENAI_API_KEY", "synthetic.other.provider");
  const health = await c.health();
  const result = await c.send();
  expect(health.body).toMatchObject({
    aiProvider: "gemini",
    aiAvailable: false,
    aiStatus: "resting",
  });
  expect(result.body.analysis.aiAssisted).toBe(false);
  expect(c.fetch).not.toHaveBeenCalled();
  expect(c.app.locals.geminiConfigurationError).toMatch(
    /Production Gemini requires GEMINI_API_KEY/,
  );
  expect(health.text + result.text).not.toMatch(
    /synthetic\.|123456789001|GEMINI_API_KEY|numbered/,
  );
});
it("malformed production legacy key cannot borrow a valid evaluation slot", async () => {
  const c = apiSetup();
  vi.stubEnv("GEMINI_API_KEY", "bad\r\nheader");
  expect((await c.health()).body.aiAvailable).toBe(false);
  expect((await c.send()).body.analysis.aiAssisted).toBe(false);
  expect(c.fetch).not.toHaveBeenCalled();
});
