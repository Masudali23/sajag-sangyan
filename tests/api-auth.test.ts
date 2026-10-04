import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import { createSessionAuth, type SessionAuth } from "../server/auth";
import { api, isApiAuthError } from "../src/lib/api";

const authSdk = vi.hoisted(() => ({ getUser: vi.fn(), createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: authSdk.createClient,
}));
const browserAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  unsubscribe: vi.fn(),
  changed: null as
    null | ((event: string, session: { user: { id: string } } | null) => void),
}));
vi.mock("../src/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: browserAuth.getSession,
      onAuthStateChange: browserAuth.onAuthStateChange,
    },
  },
}));

const userId = "11111111-2222-4333-8444-555555555555";
const issuer = "https://auth-fixture.supabase.co";
const verified = {
  id: userId,
  role: "authenticated",
  email: "fixture@example.test",
  email_confirmed_at: "2026-10-04T00:00:00Z",
  is_anonymous: false,
};
const message = "Guaranteed returns every day if you join our group.";
const input = {
  text: message,
  useAI: true,
  consent: true,
  consentProvider: "openai",
};

function token(extra: Record<string, unknown> = {}) {
  const claims = {
    sub: userId,
    iss: `${issuer}/auth/v1`,
    role: "authenticated",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600,
    ...extra,
  };
  // This fixture is never cryptographically accepted by production: the SDK
  // lookup is explicitly mocked in this test file, and it is asserted below.
  return `fixture.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
}
function configuredApp() {
  vi.stubEnv("SUPABASE_URL", issuer);
  vi.stubEnv("SUPABASE_ANON_KEY", "public-test-key");
  return createApp();
}
function injectedAuth(
  status: "verified" | "invalid" | "unavailable",
): SessionAuth {
  return {
    configured: true,
    verify: vi.fn(async () =>
      status === "verified" ? { status, userId } : { status },
    ),
  };
}

beforeEach(() => {
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
    "GEMINI_API_KEY",
  ])
    vi.stubEnv(name, "");
  vi.stubEnv("AI_PROVIDER", "openai");
  vi.stubEnv("OPENAI_API_KEY", "test-only-provider");
  authSdk.createClient.mockImplementation(() => ({
    auth: { getUser: authSdk.getUser },
  }));
  authSdk.getUser.mockResolvedValue({ data: { user: verified }, error: null });
  browserAuth.changed = null;
  browserAuth.getSession.mockResolvedValue({
    data: {
      session: {
        access_token: "browser-fixture-token",
        user: { id: userId },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      },
    },
    error: null,
  });
  browserAuth.onAuthStateChange.mockImplementation((callback) => {
    browserAuth.changed = callback;
    return { data: { subscription: { unsubscribe: browserAuth.unsubscribe } } };
  });
  vi.stubGlobal("fetch", vi.fn());
});

describe("client bearer transport and sign-out races", () => {
  it("allows public bootstrap without reading or transmitting a session", async () => {
    const transport = vi
      .fn()
      .mockResolvedValue(new Response('{"status":"ok"}'));
    vi.stubGlobal("fetch", transport);
    expect(await api("health")).toEqual({ status: "ok" });
    expect(browserAuth.getSession).not.toHaveBeenCalled();
    expect(transport.mock.calls[0][1].headers).toEqual({});
  });

  it("attaches the current SDK access token to protected requests", async () => {
    const transport = vi.fn().mockResolvedValue(new Response('{"lessons":[]}'));
    vi.stubGlobal("fetch", transport);
    expect(
      await api("explain", { question: "What is diversification?" }),
    ).toEqual({ lessons: [] });
    expect(transport.mock.calls[0][1].headers).toEqual({
      Authorization: "Bearer browser-fixture-token",
      "Content-Type": "application/json",
    });
    expect(browserAuth.unsubscribe).toHaveBeenCalledOnce();
  });

  it("blocks an absent session before transmitting message text", async () => {
    browserAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    await expect(api("analyze", input)).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED",
    });
    expect(fetch).not.toHaveBeenCalled();
    expect(browserAuth.unsubscribe).toHaveBeenCalledOnce();
  });

  it("blocks a stale session returned after the SDK has switched accounts", async () => {
    let finish!: (value: unknown) => void;
    let began!: () => void;
    const started = new Promise<void>((resolve) => {
      began = resolve;
    });
    browserAuth.getSession.mockImplementation(() => {
      began();
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    const pending = api("analyze", input);
    const rejected = expect(pending).rejects.toMatchObject({
      status: 401,
      code: "SESSION_INVALID",
    });
    await started;
    browserAuth.changed?.("SIGNED_IN", { user: { id: "another-user" } });
    finish({
      data: {
        session: {
          access_token: "old-token",
          user: { id: userId },
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        },
      },
      error: null,
    });
    await rejected;
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks an expired session before transmitting message text", async () => {
    browserAuth.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "expired",
          user: { id: userId },
          expires_at: 1,
        },
      },
      error: null,
    });
    await expect(api("analyze", input)).rejects.toMatchObject({
      status: 401,
      code: "SESSION_INVALID",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a new sign-in when SDK token refresh reports a revoked session", async () => {
    browserAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: { status: 400, code: "refresh_token_not_found" },
    });
    await expect(api("analyze", input)).rejects.toMatchObject({
      status: 401,
      code: "SESSION_INVALID",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed with an availability notice when SDK refresh is unreachable", async () => {
    browserAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: { status: 0 },
    });
    await expect(api("analyze", input)).rejects.toMatchObject({
      status: 503,
      code: "AUTH_UNAVAILABLE",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("surfaces server auth errors for the app guard instead of returning an analysis", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "Sign in again.",
            code: "SESSION_INVALID",
          }),
          { status: 401 },
        ),
      ),
    );
    const failure = await api("analyze", input).catch(
      (error: unknown) => error,
    );
    expect(isApiAuthError(failure)).toBe(true);
    expect(failure).toMatchObject({ status: 401, code: "SESSION_INVALID" });
  });

  it.each(["SIGNED_OUT", "SIGNED_IN"])(
    "suppresses late results after %s changes the active account",
    async (event) => {
      let finish!: (response: Response) => void;
      let began!: () => void;
      const started = new Promise<void>((resolve) => {
        began = resolve;
      });
      const transport = vi.fn(
        (_input: RequestInfo | URL, _init: RequestInit) => {
          began();
          return new Promise<Response>((resolve) => {
            finish = resolve;
          });
        },
      );
      vi.stubGlobal("fetch", transport);
      const pending = api("analyze", input);
      const rejected = expect(pending).rejects.toMatchObject({
        status: 401,
        code: "SESSION_INVALID",
      });
      await started;
      browserAuth.changed?.(
        event,
        event === "SIGNED_OUT" ? null : { user: { id: "another-user" } },
      );
      expect(transport.mock.calls[0][1].signal?.aborted).toBe(true);
      finish(new Response('{"analysis":{"private":"discarded"}}'));
      await rejected;
      expect(browserAuth.unsubscribe).toHaveBeenCalledOnce();
    },
  );

  it("never sends bearer credentials to a caller-supplied URL", async () => {
    await expect(api("https://other.example.test", input)).rejects.toThrow(
      "Invalid API endpoint",
    );
    expect(browserAuth.getSession).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("mandatory server-verified sessions", () => {
  it("keeps health and auth bootstrap public without exposing configuration", async () => {
    const app = createApp();
    const health = await request(app).get("/api/health");
    expect(health.status).toBe(200);
    expect(health.body).toMatchObject({
      authRequired: true,
      authAvailable: false,
    });
    const bootstrap = await request(app).get("/api/auth");
    expect(bootstrap.status).toBe(200);
    expect(bootstrap.body).toEqual({
      required: true,
      available: false,
      method: "email-otp",
    });
    expect(authSdk.getUser).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(["/api/analyze", "/api/explain", "/api/lessons", "/api/sources"])(
    "fails closed at %s when server auth is unconfigured",
    async (path) => {
      const app = createApp();
      const response =
        path === "/api/lessons" || path === "/api/sources"
          ? await request(app).get(path)
          : await request(app).post(path).send(input);
      expect(response.status).toBe(503);
      expect(response.body.code).toBe("AUTH_UNAVAILABLE");
      expect(response.body.analysis).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it.each([
    undefined,
    "Basic fake",
    "Bearer",
    "Bearer fake token",
    `Bearer ${"x".repeat(8193)}`,
  ])(
    "rejects absent or malformed authorization before authentication and provider use",
    async (authorization) => {
      const auth = injectedAuth("verified");
      const req = request(createApp({ sessionAuth: auth })).post(
        "/api/analyze",
      );
      if (authorization) req.set("Authorization", authorization);
      const response = await req.send(input);
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("AUTH_REQUIRED");
      expect(auth.verify).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("does not accept an email or profile object in place of a verified token", async () => {
    const response = await request(configuredApp())
      .post("/api/analyze")
      .send({ ...input, email: verified.email, user: verified });
    expect(response.status).toBe(401);
    expect(authSdk.getUser).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("validates the exact caller token against Supabase in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const access = token();
    const response = await request(configuredApp())
      .post("/api/analyze")
      .set("Authorization", `Bearer ${access}`)
      .send({ text: message });
    expect(response.status).toBe(200);
    expect(response.body.analysis.aiAssisted).toBe(false);
    expect(authSdk.getUser).toHaveBeenCalledExactlyOnceWith(access);
    expect(authSdk.createClient).toHaveBeenCalledWith(
      issuer,
      "public-test-key",
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }),
    );
    expect(response.text).not.toContain(access);
    expect(response.text).not.toContain(verified.email);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    { label: "expired", claims: { exp: 1 }, user: verified },
    {
      label: "mismatched subject",
      claims: { sub: "another-user" },
      user: verified,
    },
    {
      label: "wrong project",
      claims: { iss: "https://other.supabase.co/auth/v1" },
      user: verified,
    },
    { label: "anonymous role", claims: { role: "anon" }, user: verified },
    {
      label: "unconfirmed email",
      claims: {},
      user: { ...verified, email_confirmed_at: null },
    },
    {
      label: "anonymous user",
      claims: {},
      user: { ...verified, is_anonymous: true },
    },
  ])(
    "rejects $label even if a lookup returns a user",
    async ({ claims, user }) => {
      authSdk.getUser.mockResolvedValue({ data: { user }, error: null });
      const response = await request(configuredApp())
        .post("/api/analyze")
        .set("Authorization", `Bearer ${token(claims)}`)
        .send(input);
      expect(response.status).toBe(401);
      expect(response.body.code).toBe("SESSION_INVALID");
      expect(response.body.analysis).toBeUndefined();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects a revoked session without provider transfer or local fallback", async () => {
    authSdk.getUser.mockResolvedValue({
      data: { user: null },
      error: { status: 401 },
    });
    const response = await request(configuredApp())
      .post("/api/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(input);
    expect(response.status).toBe(401);
    expect(response.body.code).toBe("SESSION_INVALID");
    expect(response.body.analysis).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns a useful unavailable result on auth transport failure, without trying AI", async () => {
    authSdk.getUser.mockRejectedValue(new Error("unavailable"));
    const response = await request(configuredApp())
      .post("/api/analyze")
      .set("Authorization", `Bearer ${token()}`)
      .send(input);
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("AUTH_UNAVAILABLE");
    expect(response.body.analysis).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lets a verified session reach AI without changing the provider schema", async () => {
    const provider = vi.fn().mockImplementation(async (_url, init) => {
      const requestBody = JSON.parse(init.body);
      const value =
        requestBody.text.format.name === "financial_literacy_confirmation"
          ? { decisions: [], localDecisions: [] }
          : { findings: [] };
      return {
        ok: true,
        status: 200,
        json: async () => ({
          output: [
            { content: [{ type: "output_text", text: JSON.stringify(value) }] },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", provider);
    const auth = injectedAuth("verified");
    const response = await request(createApp({ sessionAuth: auth }))
      .post("/api/analyze")
      .set("Authorization", "Bearer isolated-test-session")
      .send(input);
    expect(response.status).toBe(200);
    expect(auth.verify).toHaveBeenCalledExactlyOnceWith(
      "isolated-test-session",
    );
    expect(provider).toHaveBeenCalled();
    const sent = JSON.parse(provider.mock.calls[0][1].body);
    expect(sent.text.format.name).toBe("financial_literacy_cues");
    expect(JSON.stringify(sent)).not.toContain("isolated-test-session");
    expect(response.body.analysis).toBeDefined();
    expect(response.body.analysis.aiAssisted).toBe(true);
    expect(response.body.notice).toBeUndefined();
  });

  it("waits for verification and stops when sign-out makes that verification fail", async () => {
    let settle!: (value: { status: "invalid" }) => void;
    let started!: () => void;
    const began = new Promise<void>((resolve) => {
      started = resolve;
    });
    const auth: SessionAuth = {
      configured: true,
      verify: () => {
        started();
        return new Promise((resolve) => {
          settle = resolve;
        });
      },
    };
    const pending = request(createApp({ sessionAuth: auth }))
      .post("/api/analyze")
      .set("Authorization", "Bearer now-revoked")
      .send(input)
      .then((response) => response);
    await began;
    expect(fetch).not.toHaveBeenCalled();
    settle({ status: "invalid" });
    const response = await pending;
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("does not cache a verified session across requests", async () => {
    const auth = injectedAuth("verified");
    const app = createApp({ sessionAuth: auth });
    const first = await request(app)
      .post("/api/explain")
      .set("Authorization", "Bearer soon-revoked")
      .send({ question: "What does diversification mean?" });
    expect(first.status).toBe(200);
    vi.mocked(auth.verify).mockResolvedValue({ status: "invalid" });
    const second = await request(app)
      .post("/api/explain")
      .set("Authorization", "Bearer soon-revoked")
      .send({ question: "What does diversification mean?" });
    expect(second.status).toBe(401);
    expect(second.body.lessons).toBeUndefined();
    expect(auth.verify).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the existing VITE public configuration as an explicit server fallback", () => {
    vi.stubEnv("VITE_SUPABASE_URL", issuer);
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "public-fixture-only");
    expect(createSessionAuth().configured).toBe(true);
    expect(authSdk.createClient).toHaveBeenCalledWith(
      issuer,
      "public-fixture-only",
      expect.anything(),
    );
  });
});
