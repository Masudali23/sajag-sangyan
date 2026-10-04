import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { AuthApiError } from "@supabase/supabase-js";
import {
  completePasswordRecovery,
  completePasswordRecoverySession,
  resendSignup,
  sendPasswordRecovery,
  signInWithPassword,
  signUpWithPassword,
  validatePassword,
} from "../src/lib/password-auth";

type Auth = SupabaseClient["auth"];
const user: User = {
  id: "confirmed-owner",
  email: "reader@example.test",
  email_confirmed_at: "2026-10-04T00:00:00Z",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-10-04T00:00:00Z",
};
const session: Session = {
  access_token: "fictional-recovery-access",
  refresh_token: "fictional-recovery-refresh",
  expires_in: 3600,
  token_type: "bearer",
  user,
};
const password = "  example password  ";
const code = "12345678";
const resetDone = {
  status: "password-updated",
  requiresPasswordSignIn: true,
};

function mockClient() {
  return {
    auth: {
      signUp: vi.fn<Auth["signUp"]>().mockResolvedValue({
        data: { user, session: null },
        error: null,
      }),
      signInWithPassword: vi
        .fn<Auth["signInWithPassword"]>()
        .mockResolvedValue({ data: { user, session }, error: null }),
      resend: vi.fn<Auth["resend"]>().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      resetPasswordForEmail: vi
        .fn<Auth["resetPasswordForEmail"]>()
        .mockResolvedValue({ data: {}, error: null }),
      verifyOtp: vi.fn<Auth["verifyOtp"]>().mockResolvedValue({
        data: { user, session },
        error: null,
      }),
      setSession: vi.fn<Auth["setSession"]>().mockResolvedValue({
        data: { user, session },
        error: null,
      }),
      getUser: vi
        .fn<Auth["getUser"]>()
        .mockResolvedValue({ data: { user }, error: null }),
      updateUser: vi
        .fn<Auth["updateUser"]>()
        .mockResolvedValue({ data: { user }, error: null }),
      dispose: vi.fn<Auth["dispose"]>().mockResolvedValue(undefined),
      signInWithOtp: vi.fn(),
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("password signup and login", () => {
  it("requires eight characters and an exact confirmation without trimming", () => {
    expect(validatePassword("1234567")).toBe("too-short");
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword(password, password.trim())).toBe(
      "confirmation-mismatch",
    );
    expect(validatePassword(password, password)).toBeNull();
    expect(validatePassword("        ", "        ")).toBeNull();
  });

  it.each([
    ["short", "short", "reader@example.test", "too-short"],
    [password, password.trim(), "reader@example.test", "confirmation-mismatch"],
    [password, password, "not-an-email", "invalid-email"],
  ])(
    "rejects invalid signup input before a request",
    async (p, c, email, error) => {
      const client = mockClient();
      await expect(
        signUpWithPassword(client, email, p, c),
      ).rejects.toMatchObject({
        code: error,
      });
      expect(client.auth.signUp).not.toHaveBeenCalled();
      expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
    },
  );

  it("signup requests confirmation and forwards the exact password and redirect", async () => {
    const client = mockClient();
    await expect(
      signUpWithPassword(
        client,
        " reader@example.test ",
        password,
        password,
        "https://example.test/settings",
      ),
    ).resolves.toEqual({ status: "confirmation-required" });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: user.email,
      password,
      options: { emailRedirectTo: "https://example.test/settings" },
    });
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("accepts signup as signed in only with a matching confirmed session", async () => {
    const client = mockClient();
    client.auth.signUp.mockResolvedValue({
      data: { user, session },
      error: null,
    });
    await expect(
      signUpWithPassword(client, user.email!, password, password),
    ).resolves.toEqual({ status: "signed-in", user, session });
  });

  it("does not infer a login from an opaque signup response", async () => {
    const client = mockClient();
    client.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    await expect(
      signUpWithPassword(client, user.email!, password, password),
    ).resolves.toEqual({ status: "confirmation-required" });
  });

  it("password login uses only the password endpoint and retains spaces", async () => {
    const client = mockClient();
    await expect(
      signInWithPassword(client, " READER@example.test ", password),
    ).resolves.toEqual({ status: "signed-in", user, session });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "READER@example.test",
      password,
    });
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("lets the provider verify a shorter legacy password", async () => {
    const client = mockClient();
    await expect(
      signInWithPassword(client, user.email!, "legacy"),
    ).resolves.toEqual({ status: "signed-in", user, session });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: user.email,
      password: "legacy",
    });
  });

  it("rejects an empty login password without contacting the provider", async () => {
    const client = mockClient();
    await expect(
      signInWithPassword(client, user.email!, ""),
    ).rejects.toMatchObject({ code: "empty-password" });
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each([
    ["unconfirmed", { ...user, email_confirmed_at: undefined }, session],
    ["anonymous", { ...user, is_anonymous: true }, session],
    ["wrong email", { ...user, email: "other@example.test" }, session],
    ["missing token", user, { ...session, access_token: "" }],
    ["wrong owner", user, { ...session, user: { ...user, id: "other-owner" } }],
    [
      "session unconfirmed",
      user,
      { ...session, user: { ...user, email_confirmed_at: undefined } },
    ],
  ])(
    "rejects %s password session responses",
    async (_, returnedUser, returnedSession) => {
      const client = mockClient();
      client.auth.signInWithPassword.mockResolvedValue({
        data: { user: returnedUser, session: returnedSession },
        error: null,
      });
      await expect(
        signInWithPassword(client, user.email!, password),
      ).rejects.toMatchObject({ code: "unverified-session" });
    },
  );

  it("preserves email_not_confirmed without silently sending a login code", async () => {
    const client = mockClient();
    const failure = new AuthApiError(
      "Email not confirmed",
      400,
      "email_not_confirmed",
    );
    client.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: failure,
    });
    await expect(
      signInWithPassword(client, user.email!, password),
    ).rejects.toBe(failure);
    expect(client.auth.resend).not.toHaveBeenCalled();
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("resends signup confirmation explicitly, including the redirect", async () => {
    const client = mockClient();
    await resendSignup(client, user.email!, "https://example.test/settings");
    expect(client.auth.resend).toHaveBeenCalledWith({
      type: "signup",
      email: user.email,
      options: { emailRedirectTo: "https://example.test/settings" },
    });
    expect(client.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("propagates signup and resend failures", async () => {
    const client = mockClient();
    const failure = new AuthApiError(
      "Request rate limited",
      429,
      "over_email_send_rate_limit",
    );
    client.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: failure,
    });
    client.auth.resend.mockResolvedValue({
      data: { user: null, session: null },
      error: failure,
    });
    await expect(
      signUpWithPassword(client, user.email!, password, password),
    ).rejects.toBe(failure);
    await expect(resendSignup(client, user.email!)).rejects.toBe(failure);
  });
});

describe("isolated password recovery", () => {
  it("sends recovery with the optional redirect and always disposes the isolated client", async () => {
    const client = mockClient();
    const factory = vi.fn(() => client);
    await sendPasswordRecovery(
      factory,
      " reader@example.test ",
      "https://example.test/settings?recovery=1",
    );
    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(user.email, {
      redirectTo: "https://example.test/settings?recovery=1",
    });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
    expect(client.auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("disposes after a failed recovery email request", async () => {
    const client = mockClient();
    const failure = new AuthApiError("Unable to send", 503, undefined);
    client.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: failure,
    });
    await expect(sendPasswordRecovery(() => client, user.email!)).rejects.toBe(
      failure,
    );
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
  });

  it.each([
    [password, password.trim(), code, "confirmation-mismatch"],
    ["short", "short", code, "too-short"],
    [password, password, "not-a-code", "invalid-code"],
  ])(
    "rejects invalid recovery before creating a client",
    async (p, confirmation, token, error) => {
      const factory = vi.fn(() => mockClient());
      await expect(
        completePasswordRecovery(factory, user.email!, token, p, confirmation),
      ).rejects.toMatchObject({ code: error });
      expect(factory).not.toHaveBeenCalled();
    },
  );

  it("verifies only a recovery OTP, updates its owner and requires a fresh password login", async () => {
    const isolated = mockClient();
    const main = mockClient();
    const mainSession = { ...session, user: { ...user, id: "main-owner" } };
    const before = JSON.stringify(mainSession);
    const localStorageWrite = vi.fn();
    vi.stubGlobal("localStorage", { setItem: localStorageWrite });
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    isolated.auth.verifyOtp.mockImplementation(async () => ({
      data: { user, session },
      error: null,
    }));
    await expect(
      completePasswordRecovery(
        () => isolated,
        user.email!,
        ` ${code} `,
        password,
        password,
      ),
    ).resolves.toEqual(resetDone);
    expect(isolated.auth.verifyOtp).toHaveBeenCalledWith({
      email: user.email,
      token: code,
      type: "recovery",
    });
    expect(isolated.auth.updateUser).toHaveBeenCalledWith({ password });
    expect(isolated.auth.dispose).toHaveBeenCalledTimes(1);
    expect(main.auth.verifyOtp).not.toHaveBeenCalled();
    expect(main.auth.setSession).not.toHaveBeenCalled();
    expect(main.auth.updateUser).not.toHaveBeenCalled();
    expect(JSON.stringify(mainSession)).toBe(before);
    expect(localStorageWrite).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it.each(["verifyOtp", "updateUser"] as const)(
    "disposes on %s failure and never reports success",
    async (method) => {
      const client = mockClient();
      const failure = new AuthApiError("Recovery failed", 400, undefined);
      client.auth[method].mockRejectedValue(failure);
      await expect(
        completePasswordRecovery(
          () => client,
          user.email!,
          code,
          password,
          password,
        ),
      ).rejects.toBe(failure);
      expect(client.auth.dispose).toHaveBeenCalledTimes(1);
      if (method === "verifyOtp")
        expect(client.auth.updateUser).not.toHaveBeenCalled();
    },
  );

  it("rejects a recovery code for a different email before changing its password", async () => {
    const client = mockClient();
    const other = { ...user, email: "other@example.test" };
    client.auth.verifyOtp.mockResolvedValue({
      data: { user: other, session: { ...session, user: other } },
      error: null,
    });
    await expect(
      completePasswordRecovery(
        () => client,
        user.email!,
        code,
        password,
        password,
      ),
    ).rejects.toMatchObject({ code: "unverified-session" });
    expect(client.auth.updateUser).not.toHaveBeenCalled();
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
  });

  it("does not update a password after cancellation during code verification", async () => {
    const client = mockClient();
    let current = true;
    client.auth.verifyOtp.mockImplementation(async () => {
      current = false;
      return { data: { user, session }, error: null };
    });
    await expect(
      completePasswordRecovery(
        () => client,
        user.email!,
        code,
        password,
        password,
        () => current,
      ),
    ).rejects.toMatchObject({ code: "recovery-cancelled" });
    expect(client.auth.updateUser).not.toHaveBeenCalled();
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
  });

  it("verifies a linked recovery session against the Auth server before updating", async () => {
    const client = mockClient();
    const refreshed = {
      ...session,
      access_token: "fictional-refreshed-access",
    };
    client.auth.setSession.mockResolvedValue({
      data: { user, session: refreshed },
      error: null,
    });
    await expect(
      completePasswordRecoverySession(
        () => client,
        session,
        password,
        password,
      ),
    ).resolves.toEqual(resetDone);
    expect(client.auth.setSession).toHaveBeenCalledWith({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    expect(client.auth.getUser).toHaveBeenCalledWith(refreshed.access_token);
    expect(client.auth.updateUser).toHaveBeenCalledWith({ password });
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
  });

  it.each(["setSession", "getUser", "updateUser"] as const)(
    "disposes linked recovery on %s failure",
    async (method) => {
      const client = mockClient();
      const failure = new AuthApiError("Recovery rejected", 401, undefined);
      client.auth[method].mockRejectedValue(failure);
      await expect(
        completePasswordRecoverySession(
          () => client,
          session,
          password,
          password,
        ),
      ).rejects.toBe(failure);
      expect(client.auth.dispose).toHaveBeenCalledTimes(1);
      if (method !== "updateUser")
        expect(client.auth.updateUser).not.toHaveBeenCalled();
    },
  );

  it.each([
    { ...user, id: "other-owner" },
    { ...user, email: "other@example.test" },
    { ...user, email_confirmed_at: undefined },
    { ...user, is_anonymous: true },
  ])("rejects changed or unverified server ownership", async (returnedUser) => {
    const client = mockClient();
    client.auth.getUser.mockResolvedValue({
      data: { user: returnedUser },
      error: null,
    });
    await expect(
      completePasswordRecoverySession(
        () => client,
        session,
        password,
        password,
      ),
    ).rejects.toMatchObject({ code: "recovery-owner-mismatch" });
    expect(client.auth.updateUser).not.toHaveBeenCalled();
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
  });

  it("does not create a client after linked recovery was cancelled", async () => {
    const factory = vi.fn(() => mockClient());
    await expect(
      completePasswordRecoverySession(
        factory,
        session,
        password,
        password,
        () => false,
      ),
    ).rejects.toMatchObject({ code: "recovery-cancelled" });
    expect(factory).not.toHaveBeenCalled();
  });

  it("does not update after account changes during server verification", async () => {
    const client = mockClient();
    let current = true;
    client.auth.getUser.mockImplementation(async () => {
      current = false;
      return { data: { user }, error: null };
    });
    await expect(
      completePasswordRecoverySession(
        () => client,
        session,
        password,
        password,
        () => current,
      ),
    ).rejects.toMatchObject({ code: "recovery-cancelled" });
    expect(client.auth.updateUser).not.toHaveBeenCalled();
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
  });

  it("does not turn a late password update into a current recovery success", async () => {
    const client = mockClient();
    let current = true;
    client.auth.updateUser.mockImplementation(async () => {
      current = false;
      return { data: { user }, error: null };
    });
    await expect(
      completePasswordRecoverySession(
        () => client,
        session,
        password,
        password,
        () => current,
      ),
    ).rejects.toMatchObject({ code: "recovery-cancelled" });
    expect(client.auth.dispose).toHaveBeenCalledTimes(1);
  });
});
