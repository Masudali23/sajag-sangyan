import { afterEach, expect, it, vi } from "vitest";
import { authenticatedRequest as request } from "./helpers/authenticated-api";
import { createAuthenticatedApp as createApp } from "./helpers/authenticated-api";
import { geminiConfiguration } from "../server/gemini-pool";

const MODEL = "gemini-3.6-flash";
const OTHER = "gemini-3.7-flash";
const KEY = "mock-quota-key-never-real";
const detail = (type: string, fields: object) => ({
  "@type": `type.googleapis.com/google.rpc.${type}`,
  ...fields,
});
const error = (
  status: number,
  details: unknown[] = [],
  headers: Record<string, string> = {},
) => new Response(JSON.stringify({ error: { details } }), { status, headers });
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
const daily = (project = false) =>
  detail("QuotaFailure", {
    violations: [
      {
        quotaMetric:
          "generativelanguage.googleapis.com/generate_content_free_tier_requests",
        quotaId: `GenerateRequestsPerDayPerProject${project ? "" : "PerModel"}-FreeTier`,
        quotaDimensions: project ? {} : { model: MODEL },
      },
    ],
  });
function setup(start = "2026-10-03T12:00:00Z", models = MODEL) {
  for (let i = 1; i <= 10; i++) {
    vi.stubEnv(`GEMINI_API_KEY_${i}`, "");
    vi.stubEnv(`GEMINI_PROJECT_ID_${i}`, "");
  }
  vi.stubEnv("AI_PROVIDER", "gemini");
  vi.stubEnv("GEMINI_API_KEY", KEY);
  vi.stubEnv("GEMINI_MODEL", "");
  vi.stubEnv("GEMINI_MODELS", models);
  // Quota mechanics only; on-device warning review is tested in tests/ai-review.test.ts.
  vi.stubEnv("AI_LOCAL_REVIEW", "off");
  let now = Date.parse(start),
    serial = 0;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const fetch = vi.fn().mockImplementation(async () => success());
  vi.stubGlobal("fetch", fetch);
  const app = createApp();
  return {
    fetch,
    app,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
    at: (iso: string) => {
      now = Date.parse(iso);
    },
    send: () =>
      request(app)
        .post("/api/analyze")
        .send({
          text: `Guaranteed returns with no risk. Example number ${++serial}.`,
          useAI: true,
          consent: true,
          consentProvider: "gemini",
        }),
    health: () => request(app).get("/api/health"),
  };
}
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function poolSlots(count: number) {
  for (let i = 1; i <= count; i++) {
    vi.stubEnv(`GEMINI_PROJECT_ID_${i}`, `mock-project-${i}`);
    vi.stubEnv(`GEMINI_API_KEY_${i}`, `mock-pool-key-${i}`);
  }
}
it("all numbered slots blank preserves the legacy key", async () => {
  const c = setup();
  await c.send();
  expect(c.fetch.mock.calls[0][1].headers["x-goog-api-key"]).toBe(KEY);
});
it("all nine authorized slot positions receive a turn", async () => {
  const c = setup();
  poolSlots(9);
  for (let i = 0; i < 9; i++)
    expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  expect(
    c.fetch.mock.calls.map(([, init]) => init.headers["x-goog-api-key"]),
  ).toEqual(Array.from({ length: 9 }, (_, i) => `mock-pool-key-${i + 1}`));
});
it("nine exhausted projects still use only four outbound calls per check", async () => {
  const c = setup();
  poolSlots(9);
  c.fetch.mockImplementation(async () => error(429));
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(4);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(8);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(9);
  expect((await c.health()).body.aiAvailable).toBe(false);
});
it.each(["legacy", "pool"])(
  "accepts dotted printable opaque keys in %s mode",
  async (mode) => {
    const c = setup();
    const opaque = "fake.auth.key-v2_test:~+/=";
    if (mode === "pool") {
      poolSlots(1);
      vi.stubEnv("GEMINI_API_KEY_1", opaque);
    } else vi.stubEnv("GEMINI_API_KEY", opaque);
    expect((await c.send()).body.analysis.aiAssisted).toBe(true);
    expect(c.fetch.mock.calls[0][1].headers["x-goog-api-key"]).toBe(opaque);
    expect((await c.health()).text).not.toContain(opaque);
  },
);
for (const mode of ["legacy", "pool"])
  it.each([
    "fake\r\nX-Injected: value",
    " fake-key",
    "fake-key ",
    "fake\tkey",
    "fake\u0000key",
    "fake\u007fkey",
    "faké-key",
    "x".repeat(513),
  ])(
    "rejects unsafe %s credential bytes in " + mode + " mode",
    async (unsafe) => {
      const c = setup();
      // Node/OS environment assignment truncates at NUL before application code.
      // Exercise that byte directly at the pure parser boundary instead.
      if (unsafe.includes("\u0000")) {
        const parsed = geminiConfiguration(
          mode === "pool"
            ? {
                GEMINI_PROJECT_ID_1: "mock-project-one",
                GEMINI_API_KEY_1: unsafe,
              }
            : { GEMINI_API_KEY: unsafe },
        );
        expect(parsed.error).toBeTruthy();
        expect(parsed.projects).toEqual([]);
        expect(c.fetch).not.toHaveBeenCalled();
        return;
      }
      if (mode === "pool") {
        poolSlots(1);
        vi.stubEnv("GEMINI_API_KEY_1", unsafe);
      } else vi.stubEnv("GEMINI_API_KEY", unsafe);
      const health = await c.health();
      const response = await c.send();
      expect(health.body.aiAvailable).toBe(false);
      expect(response.body.analysis.aiAssisted).toBe(false);
      expect(c.fetch).not.toHaveBeenCalled();
      expect(JSON.stringify(geminiConfiguration())).not.toContain(unsafe);
    },
  );
it.each([
  "partial",
  "invalid-project",
  "duplicate-project",
  "duplicate-key",
  "tenth-slot",
])(
  "fails closed on %s pool config without using legacy or OpenAI",
  async (problem) => {
    const c = setup();
    vi.stubEnv("OPENAI_API_KEY", "mock-other-vendor");
    poolSlots(2);
    if (problem === "partial") vi.stubEnv("GEMINI_PROJECT_ID_2", "");
    if (problem === "invalid-project")
      vi.stubEnv("GEMINI_PROJECT_ID_2", "INVALID/PROJECT");
    if (problem === "duplicate-project")
      vi.stubEnv("GEMINI_PROJECT_ID_2", "mock-project-1");
    if (problem === "duplicate-key")
      vi.stubEnv("GEMINI_API_KEY_2", "mock-pool-key-1");
    if (problem === "tenth-slot")
      vi.stubEnv("GEMINI_API_KEY_10", "mock-excess-key");
    const h = await c.health();
    const r = await c.send();
    expect(h.body).toMatchObject({
      aiAvailable: false,
      aiProvider: "gemini",
      aiStatus: "resting",
    });
    expect(r.body.analysis.aiAssisted).toBe(false);
    expect(c.fetch).not.toHaveBeenCalled();
    expect(geminiConfiguration().error).toBeTruthy();
    expect(JSON.stringify(geminiConfiguration()) + h.text + r.text).not.toMatch(
      /mock-pool-key|mock-project-|INVALID\/PROJECT|mock-excess-key/,
    );
  },
);
it("rotates eligible project starts so all five slots can be used", async () => {
  const c = setup();
  poolSlots(5);
  for (let i = 0; i < 5; i++)
    expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  expect(
    c.fetch.mock.calls.map(([, init]) => init.headers["x-goog-api-key"]),
  ).toEqual([1, 2, 3, 4, 5].map((i) => `mock-pool-key-${i}`));
  expect((await c.health()).text).not.toMatch(
    /mock-pool-key|mock-project-|fingerprint|quotaPercent/,
  );
});
it("caps four outbound calls across five projects and many models", async () => {
  const c = setup(
    undefined,
    `${MODEL},${OTHER},gemini-3.8-flash,gemini-3.5-flash`,
  );
  poolSlots(5);
  c.fetch.mockImplementation(async () => error(429));
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(4);
  expect((await c.health()).body.aiAvailable).toBe(true);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(5);
  expect(c.fetch.mock.calls[4][1].headers["x-goog-api-key"]).toBe(
    "mock-pool-key-5",
  );
  expect((await c.health()).body.aiAvailable).toBe(false);
});
it("thinking retries consume ordinary attempts while only fast 503s earn bounded credits", async () => {
  const c = setup();
  poolSlots(5);
  let calls = 0;
  c.fetch.mockImplementation(async () => error(++calls % 2 ? 400 : 503));
  await c.send();
  // The fourth ordinary 400 exhausts the shared budget before its default-
  // thinking retry; the three preceding fast 503s add only three credits.
  expect(c.fetch).toHaveBeenCalledTimes(7);
  expect(
    c.fetch.mock.calls.map(([, init]) => init.headers["x-goog-api-key"]),
  ).toEqual([
    "mock-pool-key-1",
    "mock-pool-key-1",
    "mock-pool-key-2",
    "mock-pool-key-2",
    "mock-pool-key-3",
    "mock-pool-key-3",
    "mock-pool-key-4",
  ]);
});
it("project quota survives credential and model-list replacement", async () => {
  const c = setup();
  poolSlots(1);
  c.fetch.mockImplementationOnce(async () => error(429));
  await c.send();
  vi.stubEnv("GEMINI_API_KEY_1", "mock-replaced-project-key");
  vi.stubEnv("GEMINI_MODELS", OTHER);
  expect((await c.health()).body.aiAvailable).toBe(false);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
});
it("auth failure rests only the affected credential while another project remains eligible", async () => {
  const c = setup();
  poolSlots(2);
  c.fetch.mockImplementationOnce(async () => error(403));
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  expect(c.fetch).toHaveBeenCalledTimes(2);
  expect((await c.health()).body.aiAvailable).toBe(true);
  vi.stubEnv("GEMINI_API_KEY_1", "mock-repaired-credential");
  await c.send();
  await c.send();
  expect(
    c.fetch.mock.calls.some(
      ([, init]) =>
        init.headers["x-goog-api-key"] === "mock-repaired-credential",
    ),
  ).toBe(true);
});
it("bounded model configuration fails closed instead of multiplying retries", async () => {
  const c = setup(
    undefined,
    Array.from({ length: 17 }, (_, i) => `gemini-3.${i}-flash`).join(","),
  );
  expect((await c.health()).body.aiAvailable).toBe(false);
  await c.send();
  expect(c.fetch).not.toHaveBeenCalled();
});
it("mixed model and unknown quota details rest the entire project", async () => {
  const c = setup(undefined, `${MODEL},${OTHER}`);
  c.fetch.mockImplementationOnce(async () =>
    error(429, [
      daily(),
      detail("QuotaFailure", { violations: [{ quotaId: "UnknownLimit" }] }),
    ]),
  );
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
  expect((await c.health()).body.aiAvailable).toBe(false);
});
it("an overflowing positive retry hint does not become an early retry", async () => {
  const c = setup();
  c.fetch.mockImplementationOnce(async () =>
    error(429, [], { "Retry-After": "9".repeat(400) }),
  );
  await c.send();
  c.advance(8 * 24 * 60 * 60 * 1000);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
});
it("short auth retry hints still rest invalid credentials for at least15 minutes", async () => {
  const c = setup();
  c.fetch.mockImplementationOnce(async () =>
    error(403, [], { "Retry-After": "1" }),
  );
  await c.send();
  c.advance(60000);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
});
it("a later short response cannot shorten an existing project cooldown", async () => {
  const c = setup();
  let resolveLong!: (value: Response) => void,
    resolveShort!: (value: Response) => void;
  c.fetch
    .mockImplementationOnce(
      () =>
        new Promise<Response>((r) => {
          resolveLong = r;
        }),
    )
    .mockImplementationOnce(
      () =>
        new Promise<Response>((r) => {
          resolveShort = r;
        }),
    );
  const first = c.send().then((r) => r),
    second = c.send().then((r) => r);
  await vi.waitFor(() => expect(c.fetch).toHaveBeenCalledTimes(2));
  resolveLong(error(429, [], { "Retry-After": "3600" }));
  await first;
  resolveShort(error(429, [], { "Retry-After": "1" }));
  await second;
  c.advance(120000);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(2);
});
it("accepts all-number identifiers without pretending to verify project ownership", async () => {
  const c = setup();
  poolSlots(2);
  vi.stubEnv("GEMINI_PROJECT_ID_1", "111111111111");
  vi.stubEnv("GEMINI_PROJECT_ID_2", "222222222222");
  expect(geminiConfiguration().error).toBeUndefined();
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
});
it.each(["mixed", "prefix", "duplicate-number", "leading-zero", "overflow"])(
  "rejects ambiguous project identifiers: %s",
  async (kind) => {
    const c = setup();
    poolSlots(2);
    vi.stubEnv("GEMINI_PROJECT_ID_1", "111111111111");
    vi.stubEnv(
      "GEMINI_PROJECT_ID_2",
      kind === "mixed"
        ? "mock-project-two"
        : kind === "prefix"
          ? "projects/222222222222"
          : kind === "duplicate-number"
            ? "111111111111"
            : kind === "leading-zero"
              ? "022222222222"
              : "99999999999999999999",
    );
    expect(geminiConfiguration().error).toBeTruthy();
    await c.send();
    expect(c.fetch).not.toHaveBeenCalled();
  },
);

it.each([
  ["delta seconds", "120", 120000],
  ["HTTP date", "Sat, 03 Oct 2026 12:02:00 GMT", 120000],
  ["large delay", "172800", 172800000],
])("honors Retry-After %s without earlier retries", async (_, hint, wait) => {
  const c = setup();
  c.fetch.mockImplementationOnce(async () =>
    error(429, [], { "Retry-After": String(hint) }),
  );
  expect((await c.send()).body.analysis.aiAssisted).toBe(false);
  c.advance(Number(wait) - 1);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
  expect((await c.health()).body.aiStatus).toBe("resting");
  c.advance(2);
  expect((await c.health()).body.aiStatus).toBe("ready");
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  expect(c.fetch).toHaveBeenCalledTimes(2);
});
it("uses the longest RetryInfo/header delay and understands fractional seconds", async () => {
  const c = setup();
  c.fetch.mockImplementationOnce(async () =>
    error(503, [detail("RetryInfo", { retryDelay: "90.5s" })], {
      "Retry-After": "20",
    }),
  );
  await c.send();
  c.advance(90500 - 1);
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
  c.advance(2);
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
});
it.each(["-2", "Infinity", "not-a-date"])(
  "uses conservative escalating backoff for invalid hint %s",
  async (hint) => {
    const c = setup();
    c.fetch.mockImplementation(async () =>
      error(429, [detail("RetryInfo", { retryDelay: "-1s" })], {
        "Retry-After": hint,
      }),
    );
    await c.send();
    c.advance(899999);
    await c.send();
    expect(c.fetch).toHaveBeenCalledTimes(1);
    c.advance(2);
    await c.send();
    expect(c.fetch).toHaveBeenCalledTimes(2);
    c.advance(900001);
    await c.send();
    expect(c.fetch).toHaveBeenCalledTimes(2);
    c.advance(900000);
    await c.send();
    expect(c.fetch).toHaveBeenCalledTimes(3);
  },
);
it.each([
  ["spring DST", "2026-03-08T08:00:00Z", "2026-03-09T07:00:05Z"],
  ["fall DST", "2026-11-01T07:00:00Z", "2026-11-02T08:00:05Z"],
  ["near midnight", "2026-10-04T06:59:50Z", "2026-10-04T07:00:05Z"],
])(
  "recovers structured daily request quotas at Pacific midnight: %s",
  async (_, start, reset) => {
    const c = setup(start);
    c.fetch.mockImplementationOnce(async () => error(429, [daily()]));
    await c.send();
    c.at(reset);
    c.advance(-1);
    await c.send();
    expect(c.fetch).toHaveBeenCalledTimes(1);
    c.advance(2);
    expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  },
);
it("rests the whole provider only for an explicit project-wide quota", async () => {
  const c = setup(undefined, `${MODEL},${OTHER}`);
  c.fetch.mockImplementationOnce(async () => error(429, [daily(true)]));
  await c.send();
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
  expect((await c.health()).body.aiStatus).toBe("resting");
});
it("keeps permitted same-project model fallback for a model-scoped quota", async () => {
  const c = setup(undefined, `${MODEL},${OTHER}`);
  c.fetch.mockImplementationOnce(async () => error(429, [daily()]));
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  expect(c.fetch.mock.calls.map(([url]) => String(url))).toEqual([
    expect.stringContaining(MODEL),
    expect.stringContaining(OTHER),
  ]);
});
it.each([401, 403, 400])(
  "does not hammer authentication failure %i or expose diagnostics",
  async (status) => {
    const c = setup(undefined, `${MODEL},${OTHER}`);
    c.fetch.mockImplementationOnce(async () =>
      error(status, [
        detail("ErrorInfo", {
          reason: "API_KEY_INVALID",
          metadata: { key: KEY },
        }),
      ]),
    );
    const a = await c.send();
    await c.send();
    const h = await c.health();
    expect(c.fetch).toHaveBeenCalledTimes(1);
    expect(h.body.aiStatus).toBe("resting");
    expect(a.text + h.text).not.toMatch(
      /mock-quota-key|API_KEY_INVALID|quotaDimensions|retryDelay/,
    );
    expect(h.body).not.toHaveProperty("quotaPercent");
  },
);
it("an administrative credential replacement clears obsolete cooldowns without logging keys", async () => {
  const c = setup();
  c.fetch.mockImplementationOnce(async () => error(403));
  await c.send();
  vi.stubEnv("GEMINI_API_KEY", "mock-admin-replacement");
  expect((await c.health()).body.aiStatus).toBe("ready");
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
  expect(c.fetch).toHaveBeenCalledTimes(2);
});
it("timeouts rest the model and never immediately retry it", async () => {
  const c = setup();
  c.fetch.mockRejectedValueOnce(new DOMException("mock", "TimeoutError"));
  await c.send();
  await c.send();
  expect(c.fetch).toHaveBeenCalledTimes(1);
  c.advance(60001);
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
});
it("does not infer a daily reset from unstructured prose or a token quota", async () => {
  const c = setup();
  c.fetch.mockImplementationOnce(async () =>
    error(429, [
      detail("QuotaFailure", {
        violations: [
          {
            quotaMetric: "generativelanguage.googleapis.com/tokens",
            quotaId: "TokensPerDayPerProjectPerModel",
          },
        ],
      }),
    ]),
  );
  await c.send();
  c.advance(900001);
  expect((await c.send()).body.analysis.aiAssisted).toBe(true);
});
