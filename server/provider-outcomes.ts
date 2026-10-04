import type { ProviderDiagnostic } from "./app.ts";

type ReviewProvider = "gemini" | "openai";
type ReviewResult = "completed" | "fallback" | "cache";

const EVENTS = ["physical-finish", "validation", "cooldown", "review-failure"] as const;
const PASSES = ["proposal", "confirmation"] as const;
const FAILURES = [
  "none", "rate-limit", "busy", "transport", "deadline", "validation", "cooldown", "unavailable",
] as const;
const QUOTA_SCOPES = ["per-day", "per-minute", "unknown"] as const;
const STATUS_BUCKETS = [
  "200", "400", "401", "403", "404", "429", "500", "502", "503", "504",
  "1xx-other", "2xx-other", "3xx-other", "4xx-other", "5xx-other", "no-response",
] as const;
const RETRY_BUCKETS = ["none", "up-to-1s", "up-to-1m", "up-to-1h", "over-1h"] as const;
const REVIEW_PROVIDERS = ["gemini", "openai"] as const;
const REVIEW_RESULTS = ["completed", "fallback", "cache"] as const;
const DIAGNOSTIC_FIELDS = [
  "provider", "pass", "event", "status", "failure", "quotaScope", "retryDelayMs",
] as const;

function counts<const K extends readonly string[]>(keys: K): Record<K[number], number> {
  return Object.fromEntries(keys.map((key) => [key, 0])) as Record<K[number], number>;
}

function statusBucket(status: number | null): typeof STATUS_BUCKETS[number] {
  if (status === null) return "no-response";
  const exact = String(status);
  if ((STATUS_BUCKETS as readonly string[]).includes(exact)) {
    return exact as typeof STATUS_BUCKETS[number];
  }
  return `${Math.floor(status / 100)}xx-other` as typeof STATUS_BUCKETS[number];
}

function retryBucket(delay: number | null): typeof RETRY_BUCKETS[number] {
  if (delay === null) return "none";
  if (delay <= 1_000) return "up-to-1s";
  if (delay <= 60_000) return "up-to-1m";
  if (delay <= 3_600_000) return "up-to-1h";
  return "over-1h";
}

function member(values: readonly string[], value: unknown): value is string {
  return typeof value === "string" && values.includes(value);
}

// Reject any raw provider body, message, key, project identifier or extra field.
// No property getters run, and error messages never echo an invalid value.
function validateDiagnostic(value: unknown): asserts value is ProviderDiagnostic {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("Invalid provider diagnostic");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Invalid provider diagnostic");
  }
  const keys = Reflect.ownKeys(value);
  if (
    keys.length !== DIAGNOSTIC_FIELDS.length ||
    keys.some((key) => typeof key !== "string" || !DIAGNOSTIC_FIELDS.includes(key as typeof DIAGNOSTIC_FIELDS[number]))
  ) {
    throw new TypeError("Invalid provider diagnostic");
  }
  const fields = Object.getOwnPropertyDescriptors(value);
  if (DIAGNOSTIC_FIELDS.some((key) => !fields[key] || !("value" in fields[key]))) {
    throw new TypeError("Invalid provider diagnostic");
  }
  const event = value as ProviderDiagnostic;
  if (
    event.provider !== "gemini" ||
    !member(PASSES, event.pass) ||
    !member(EVENTS, event.event) ||
    (event.failure !== null && !member(FAILURES.slice(1), event.failure)) ||
    !member(QUOTA_SCOPES, event.quotaScope) ||
    (event.status !== null && (!Number.isInteger(event.status) || event.status < 100 || event.status > 599)) ||
    (event.retryDelayMs !== null && (
      typeof event.retryDelayMs !== "number" || !Number.isFinite(event.retryDelayMs) ||
      event.retryDelayMs < 0 || event.retryDelayMs > Number.MAX_SAFE_INTEGER
    ))
  ) {
    throw new TypeError("Invalid provider diagnostic");
  }
}

function initialState(maxCount: number) {
  return {
    schemaVersion: 1 as const,
    scope: "instance-memory-only" as const,
    maxCount,
    diagnostics: { total: 0, events: counts(EVENTS) },
    physicalAttempts: {
      total: 0,
      passes: counts(PASSES),
      statuses: counts(STATUS_BUCKETS),
      quotaScopes: counts(QUOTA_SCOPES),
      failures: counts(FAILURES),
      retryDelays: counts(RETRY_BUCKETS),
    },
    reviews: {
      gemini: { total: 0, outcomes: counts(REVIEW_RESULTS) },
      openai: { total: 0, outcomes: counts(REVIEW_RESULTS) },
    },
  };
}

export type ProviderOutcomesSnapshot = ReturnType<typeof initialState>;

/** Fixed-size, per-app counters. No event objects or identifying data are retained.
 * A physical HTTP success is distinct from a validated, completed logical review.
 * Cache outcomes are separate from completion so they cannot inflate availability.
 * No timer, network, persistence or logging is created by this factory.
 */
export function createProviderOutcomes(options: { maxCount?: number } = {}) {
  const maxCount = options.maxCount ?? Number.MAX_SAFE_INTEGER;
  if (!Number.isSafeInteger(maxCount) || maxCount < 1) {
    throw new TypeError("Invalid provider counter ceiling");
  }
  const state = initialState(maxCount);
  function increment<K extends string>(group: Record<K, number>, key: K) {
    if (group[key] < maxCount) group[key] += 1;
  }

  return Object.freeze({
    record(event: ProviderDiagnostic) {
      validateDiagnostic(event);
      increment(state.diagnostics, "total");
      increment(state.diagnostics.events, event.event);
      if (event.event !== "physical-finish") return;
      increment(state.physicalAttempts, "total");
      increment(state.physicalAttempts.passes, event.pass);
      increment(state.physicalAttempts.statuses, statusBucket(event.status));
      increment(state.physicalAttempts.quotaScopes, event.quotaScope);
      increment(state.physicalAttempts.failures, event.failure ?? "none");
      increment(state.physicalAttempts.retryDelays, retryBucket(event.retryDelayMs));
    },
    review(provider: ReviewProvider, result: ReviewResult) {
      if (!member(REVIEW_PROVIDERS, provider) || !member(REVIEW_RESULTS, result)) {
        throw new TypeError("Invalid provider review outcome");
      }
      increment(state.reviews[provider], "total");
      increment(state.reviews[provider].outcomes, result);
    },
    snapshot(): ProviderOutcomesSnapshot {
      return structuredClone(state);
    },
  });
}
