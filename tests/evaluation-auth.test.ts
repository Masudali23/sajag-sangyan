import { afterEach, describe, expect, it, vi } from "vitest";
import {
  evaluationAuthHeaders,
  EvaluationAuthError,
  isEvaluationAuthFailure,
  rejectEvaluationAuthFailure,
} from "../scripts/evaluation-auth.ts";

afterEach(() => vi.unstubAllEnvs());

describe("successor evaluation verified-session contract", () => {
  it("keeps offline scoring independent of cloud credentials", () => {
    expect(evaluationAuthHeaders(false, "malformed token")).toEqual({});
  });

  it.each([undefined, "", "   ", "malformed token", "x".repeat(8193)])(
    "rejects missing or malformed cloud credentials before data access",
    (token) => {
      vi.stubEnv("SAJAG_EVAL_ACCESS_TOKEN", "");
      expect(() => evaluationAuthHeaders(true, token)).toThrow(
        EvaluationAuthError,
      );
    },
  );

  it("adds bearer authorization from the explicit environment setting", () => {
    vi.stubEnv("SAJAG_EVAL_ACCESS_TOKEN", "test.fixture.signature");
    expect(evaluationAuthHeaders(true)).toEqual({
      Authorization: "Bearer test.fixture.signature",
    });
  });

  it("never includes a malformed credential in an error", () => {
    const secret = "DO-NOT-LOG credential\nmarker";
    try {
      evaluationAuthHeaders(true, secret);
      expect.fail("A malformed credential was accepted");
    } catch (error) {
      expect(error).toBeInstanceOf(EvaluationAuthError);
      expect(String(error)).not.toContain(secret);
      expect(String(error)).not.toContain("marker");
    }
  });

  it.each([401, 403])(
    "aborts HTTP %s even when no JSON error is supplied",
    (status) => {
      expect(isEvaluationAuthFailure(status, null)).toBe(true);
      expect(() => rejectEvaluationAuthFailure(status, null)).toThrow(
        EvaluationAuthError,
      );
    },
  );

  it.each(["AUTH_REQUIRED", "SESSION_INVALID", "AUTH_UNAVAILABLE"])(
    "aborts 503 %s instead of counting an offline fallback",
    (code) => {
      expect(() => rejectEvaluationAuthFailure(503, { code })).toThrow(
        EvaluationAuthError,
      );
    },
  );

  it.each([
    [200, { analysis: {} }],
    [429, { code: "quota_exceeded" }],
    [503, { code: "provider_busy" }],
    [503, null],
  ])(
    "does not mislabel HTTP %s provider responses as auth failures",
    (status, body) => {
      expect(isEvaluationAuthFailure(status, body)).toBe(false);
      expect(() => rejectEvaluationAuthFailure(status, body)).not.toThrow();
    },
  );
});
