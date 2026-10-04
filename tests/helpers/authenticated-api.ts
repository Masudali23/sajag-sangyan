import request from "supertest";
import { createApp } from "../../server/app";
import type { SessionAuth } from "../../server/auth";

export {
  cueCacheIdentity,
  providerReviewLimits,
  type ProviderDiagnostic,
} from "../../server/app";

const fixtureToken = "isolated-api-test-session";
const sessionAuth: SessionAuth = {
  configured: true,
  verify: async (token) =>
    token === fixtureToken
      ? { status: "verified", userId: "11111111-2222-4333-8444-555555555555" }
      : { status: "invalid" },
};

// Provider/validation regressions supply an authenticated caller explicitly.
// Authentication itself is tested with real createApp in api-auth.test.ts.
export function createAuthenticatedApp(
  options: Parameters<typeof createApp>[0] = {},
) {
  return createApp({
    ...options,
    sessionAuth: options.sessionAuth ?? sessionAuth,
  });
}

export function authenticatedRequest(app: Parameters<typeof request>[0]) {
  return request.agent(app).set("Authorization", `Bearer ${fixtureToken}`);
}
