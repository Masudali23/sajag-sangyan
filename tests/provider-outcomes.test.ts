import { describe, expect, it, vi } from "vitest";
import type { ProviderDiagnostic } from "../server/app.ts";
import { createProviderOutcomes } from "../server/provider-outcomes.ts";

const diagnostic = (changes: Partial<ProviderDiagnostic> = {}): ProviderDiagnostic => ({
  provider: "gemini",
  pass: "proposal",
  event: "physical-finish",
  status: 200,
  failure: null,
  quotaScope: "unknown",
  retryDelayMs: null,
  ...changes,
});

describe("private, bounded provider outcome counters", () => {
  it("counts physical status, pass, failure, quota scope and sanitized retry bucket", () => {
    const outcomes = createProviderOutcomes();
    outcomes.record(Object.freeze(diagnostic()));
    outcomes.record(diagnostic({
      pass: "confirmation", status: 429, failure: "rate-limit",
      quotaScope: "per-day", retryDelayMs: 90_500,
    }));
    const snapshot = outcomes.snapshot();
    expect(snapshot).toMatchObject({
      schemaVersion: 1, scope: "instance-memory-only", maxCount: Number.MAX_SAFE_INTEGER,
      diagnostics: { total: 2, events: { "physical-finish": 2 } },
      physicalAttempts: {
        total: 2, passes: { proposal: 1, confirmation: 1 },
        statuses: { "200": 1, "429": 1 },
        quotaScopes: { unknown: 1, "per-day": 1, "per-minute": 0 },
        failures: { none: 1, "rate-limit": 1 },
        retryDelays: { none: 1, "up-to-1h": 1 },
      },
    });
    expect(snapshot.reviews.gemini.total).toBe(0);
  });

  it.each(["validation", "cooldown", "review-failure"] as const)(
    "records %s without inventing a physical attempt or logical review",
    (event) => {
      const outcomes = createProviderOutcomes();
      outcomes.record(diagnostic({ event, failure: "validation" }));
      expect(outcomes.snapshot().diagnostics.events[event]).toBe(1);
      expect(outcomes.snapshot().physicalAttempts.total).toBe(0);
      expect(outcomes.snapshot().reviews.gemini.total).toBe(0);
    },
  );

  it("distinguishes validated reviews, fallbacks and cache hits for each provider", () => {
    const outcomes = createProviderOutcomes();
    outcomes.review("gemini", "completed");
    outcomes.review("gemini", "fallback");
    outcomes.review("gemini", "cache");
    outcomes.review("openai", "completed");
    expect(outcomes.snapshot().reviews).toEqual({
      gemini: { total: 3, outcomes: { completed: 1, fallback: 1, cache: 1 } },
      openai: { total: 1, outcomes: { completed: 1, fallback: 0, cache: 0 } },
    });
    expect(outcomes.snapshot().physicalAttempts.total).toBe(0);
  });

  it.each([
    [null, "no-response"], [101, "1xx-other"], [204, "2xx-other"],
    [302, "3xx-other"], [418, "4xx-other"], [507, "5xx-other"],
    [200, "200"], [400, "400"], [401, "401"], [403, "403"],
    [404, "404"], [429, "429"], [500, "500"], [502, "502"],
    [503, "503"], [504, "504"],
  ] as const)("maps HTTP %s to fixed status bucket %s", (status, bucket) => {
    const outcomes = createProviderOutcomes();
    const keys = Object.keys(outcomes.snapshot().physicalAttempts.statuses);
    outcomes.record(diagnostic({ status }));
    expect(outcomes.snapshot().physicalAttempts.statuses[bucket]).toBe(1);
    expect(Object.keys(outcomes.snapshot().physicalAttempts.statuses)).toEqual(keys);
  });

  it.each([
    [null, "none"], [0, "up-to-1s"], [1_000, "up-to-1s"],
    [1_000.5, "up-to-1m"], [60_000, "up-to-1m"],
    [60_001, "up-to-1h"], [3_600_000, "up-to-1h"],
    [3_600_001, "over-1h"],
  ] as const)("retains only a retry-delay bucket for %s ms", (retryDelayMs, bucket) => {
    const outcomes = createProviderOutcomes();
    outcomes.record(diagnostic({ retryDelayMs }));
    expect(outcomes.snapshot().physicalAttempts.retryDelays[bucket]).toBe(1);
    expect(JSON.stringify(outcomes.snapshot())).not.toContain('"retryDelayMs"');
  });

  it("returns independent deep copies and retains no input object", () => {
    const outcomes = createProviderOutcomes();
    const event = diagnostic();
    outcomes.record(event);
    const snapshot = outcomes.snapshot();
    snapshot.physicalAttempts.total = 700;
    snapshot.physicalAttempts.statuses["200"] = 900;
    snapshot.reviews.gemini.outcomes.completed = 800;
    Object.assign(event, { status: 503, failure: "busy" });
    expect(outcomes.snapshot().physicalAttempts.total).toBe(1);
    expect(outcomes.snapshot().physicalAttempts.statuses["200"]).toBe(1);
    expect(outcomes.snapshot().physicalAttempts.statuses["503"]).toBe(0);
    expect(outcomes.snapshot().reviews.gemini.outcomes.completed).toBe(0);
  });

  it("saturates every counter without growing the stored shape", () => {
    const outcomes = createProviderOutcomes({ maxCount: 3 });
    const initial = outcomes.snapshot();
    for (let index = 0; index < 5_000; index += 1) {
      outcomes.record(diagnostic());
      outcomes.review("gemini", "completed");
    }
    const snapshot = outcomes.snapshot();
    expect(snapshot).toMatchObject({
      diagnostics: { total: 3, events: { "physical-finish": 3 } },
      physicalAttempts: {
        total: 3, passes: { proposal: 3 }, statuses: { "200": 3 },
        quotaScopes: { unknown: 3 }, failures: { none: 3 }, retryDelays: { none: 3 },
      },
      reviews: { gemini: { total: 3, outcomes: { completed: 3 } } },
    });
    const shape = (value: unknown): unknown => typeof value === "number" ? 0 :
      value !== null && typeof value === "object" ?
        Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)])) : value;
    expect(shape(snapshot)).toEqual(shape(initial));
  });

  it.each([0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    "rejects invalid counter ceiling %s", (maxCount) => {
      expect(() => createProviderOutcomes({ maxCount })).toThrow("Invalid provider counter ceiling");
    },
  );

  it.each([
    null, undefined, [], {},
    { provider: "openai" }, { pass: "unknown" }, { event: "unknown" },
    { status: "200" }, { status: NaN }, { status: Infinity },
    { status: 99 }, { status: 600 }, { status: 200.5 },
    { failure: "none" }, { failure: "raw-provider-error" },
    { quotaScope: "other" }, { retryDelayMs: "1000" },
    { retryDelayMs: NaN }, { retryDelayMs: Infinity }, { retryDelayMs: -1 },
    { retryDelayMs: Number.MAX_SAFE_INTEGER + 1 },
  ])("rejects invalid diagnostic %j before mutating counters", (invalid) => {
    const outcomes = createProviderOutcomes();
    const input = invalid && !Array.isArray(invalid) && Object.keys(invalid).length ?
      { ...diagnostic(), ...invalid } : invalid;
    expect(() => outcomes.record(input as ProviderDiagnostic)).toThrow("Invalid provider diagnostic");
    expect(outcomes.snapshot()).toEqual(createProviderOutcomes().snapshot());
  });

  it.each(["message", "text", "apiKey", "project", "ip", "timestamp", "providerBody"])(
    "rejects raw extra field %s without echoing or storing it", (field) => {
      const outcomes = createProviderOutcomes();
      const canary = "private-canary-DO-NOT-RETAIN";
      const input = { ...diagnostic(), [field]: canary };
      const log = vi.spyOn(console, "log");
      const error = vi.spyOn(console, "error");
      try {
        expect(() => outcomes.record(input as ProviderDiagnostic)).toThrow("Invalid provider diagnostic");
        expect(JSON.stringify(outcomes.snapshot())).not.toContain(canary);
        expect(log).not.toHaveBeenCalled();
        expect(error).not.toHaveBeenCalled();
      } finally {
        log.mockRestore();
        error.mockRestore();
      }
    },
  );

  it("rejects getters, symbol extras and inherited raw fields without running getters", () => {
    const outcomes = createProviderOutcomes();
    const getter = vi.fn(() => "private-canary");
    const accessor = Object.defineProperty(diagnostic(), "failure", { get: getter });
    const symbol = Object.assign(diagnostic(), { [Symbol("raw")]: "private-canary" });
    const inherited = Object.assign(Object.create({ message: "private-canary" }), diagnostic());
    for (const input of [accessor, symbol, inherited]) {
      expect(() => outcomes.record(input)).toThrow("Invalid provider diagnostic");
    }
    expect(getter).not.toHaveBeenCalled();
    expect(outcomes.snapshot().diagnostics.total).toBe(0);
  });

  it("accepts a plain null-prototype diagnostic", () => {
    const outcomes = createProviderOutcomes();
    outcomes.record(Object.assign(Object.create(null), diagnostic()));
    expect(outcomes.snapshot().physicalAttempts.total).toBe(1);
  });

  it.each([
    ["other", "completed"], ["gemini", "other"],
    [null, "fallback"], ["openai", { text: "private-canary" }],
  ])("rejects invalid review arguments without retaining values", (provider, result) => {
    const outcomes = createProviderOutcomes();
    expect(() => outcomes.review(
      provider as "gemini", result as "completed",
    )).toThrow("Invalid provider review outcome");
    expect(outcomes.snapshot()).toEqual(createProviderOutcomes().snapshot());
  });
});
