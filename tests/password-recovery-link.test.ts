import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RecoveryModule = typeof import("../src/lib/password-recovery-link");
const access = "synthetic-opaque-access";
const refresh = "synthetic-opaque-refresh";
const fragment =
  "#" +
  new URLSearchParams({
    type: "recovery",
    access_token: access,
    refresh_token: refresh,
  }).toString();
let recovery: RecoveryModule;

beforeEach(async () => {
  vi.unstubAllGlobals();
  vi.resetModules();
  recovery = await import("../src/lib/password-recovery-link");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function openCallback(initialHref: string, historyThrows = false) {
  let href = initialHref;
  const localStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const sessionStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const state = { navigation: "existing-history-state" };
  const replaceState = vi.fn(
    (_state: unknown, _title: string, next: string | URL | null) => {
      if (historyThrows) throw new Error("Synthetic history failure");
      href = new URL(String(next), href).href;
    },
  );
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("sessionStorage", sessionStorage);
  vi.stubGlobal("window", {
    location: {
      get href() {
        return href;
      },
    },
    history: { state, replaceState },
    // The module also listens for pasted reset links (hashchange).
    addEventListener: () => {},
    localStorage,
    sessionStorage,
  });
  vi.resetModules();
  const module = await import("../src/lib/password-recovery-link");
  return {
    module,
    currentUrl: () => new URL(href),
    replaceState,
    state,
    storageMethods: [
      ...Object.values(localStorage),
      ...Object.values(sessionStorage),
    ],
  };
}

describe("opaque recovery-link parsing", () => {
  it("accepts complete opaque credentials without treating them as verified", () => {
    expect(recovery.parseRecoveryLink(fragment, "?language=en")).toEqual({
      access_token: access,
      refresh_token: refresh,
    });
    expect(recovery.getRecoveryLinkTokens()).toBeNull();
    expect(recovery.recoveryLinkRequested()).toBe(false);
  });

  it.each([
    "&type=recovery",
    "&type=signup",
    "&access_token=second-synthetic-access",
    "&refresh_token=second-synthetic-refresh",
  ])("rejects an ambiguous duplicate field %s", (duplicate) => {
    expect(recovery.parseRecoveryLink(fragment + duplicate)).toBeNull();
  });

  it.each(["?code=synthetic-pkce-code", "?code="])(
    "rejects a mixed PKCE/implicit callback %s",
    (search) => {
      expect(recovery.parseRecoveryLink(fragment, search)).toBeNull();
    },
  );

  it("rejects missing, empty, oversized or unrelated credentials", () => {
    for (const hash of [
      "#type=recovery&access_token=synthetic-access",
      "#type=recovery&access_token=&refresh_token=synthetic-refresh",
      "#type=recovery&access_token=synthetic-access&refresh_token=",
      fragment.replace("type=recovery", "type=email"),
      "#lesson-details",
      "",
    ]) {
      expect(recovery.parseRecoveryLink(hash)).toBeNull();
    }
    const long = "x".repeat(16385);
    expect(
      recovery.parseRecoveryLink(
        "#" +
          new URLSearchParams({
            type: "recovery",
            access_token: long,
            refresh_token: refresh,
          }),
      ),
    ).toBeNull();
    expect(
      recovery.parseRecoveryLink(
        "#" +
          new URLSearchParams({
            type: "recovery",
            access_token: access,
            refresh_token: long,
          }),
      ),
    ).toBeNull();
  });
});

describe("recovery callback initialization", () => {
  it("scrubs valid credentials, preserves navigation state and keeps tokens only in memory", async () => {
    const callback = await openCallback(
      `https://sajag.example.test/settings?language=bn${fragment}`,
    );
    expect(callback.module.getRecoveryLinkTokens()).toEqual({
      access_token: access,
      refresh_token: refresh,
    });
    expect(callback.module.recoveryLinkRequested()).toBe(true);
    expect(callback.currentUrl().hash).toBe("");
    expect(callback.currentUrl().searchParams.get("language")).toBe("bn");
    expect(callback.currentUrl().searchParams.get("recovery")).toBe("1");
    expect(callback.replaceState).toHaveBeenCalledWith(
      callback.state,
      "",
      expect.any(URL),
    );
    expect(callback.currentUrl().href).not.toContain(access);
    expect(callback.currentUrl().href).not.toContain(refresh);
    for (const method of callback.storageMethods) {
      expect(method).not.toHaveBeenCalled();
    }
    callback.module.clearRecoveryLinkTokens();
    expect(callback.module.getRecoveryLinkTokens()).toBeNull();
    expect(callback.module.recoveryLinkRequested()).toBe(false);
  });

  it.each([
    "#type=recovery&access_token=synthetic-access",
    fragment + "&type=signup",
    "#type=signup" +
      fragment.slice(1).replace("type=recovery", "&type=recovery"),
  ])(
    "scrubs malformed recovery credentials and retains the gate: %s",
    async (hash) => {
      const callback = await openCallback(
        `https://sajag.example.test/settings${hash}`,
      );
      expect(callback.module.getRecoveryLinkTokens()).toBeNull();
      expect(callback.module.recoveryLinkRequested()).toBe(true);
      expect(callback.currentUrl().hash).toBe("");
      expect(callback.currentUrl().searchParams.get("recovery")).toBe("1");
      for (const method of callback.storageMethods) {
        expect(method).not.toHaveBeenCalled();
      }
    },
  );

  it("removes a rejected mixed code and recovery fragment before ordinary SDK initialization", async () => {
    const callback = await openCallback(
      `https://sajag.example.test/settings?code=synthetic-pkce-code${fragment}`,
    );
    expect(callback.module.getRecoveryLinkTokens()).toBeNull();
    expect(callback.module.recoveryLinkRequested()).toBe(true);
    expect(callback.currentUrl().hash).toBe("");
    expect(callback.currentUrl().searchParams.has("code")).toBe(false);
  });

  it("scrubs an expired recovery error without accepting credentials", async () => {
    const callback = await openCallback(
      "https://sajag.example.test/settings?recovery=1#error=access_denied&error_code=otp_expired&error_description=Synthetic+expired+code",
    );
    expect(callback.module.getRecoveryLinkTokens()).toBeNull();
    expect(callback.module.recoveryLinkRequested()).toBe(true);
    expect(callback.currentUrl().hash).toBe("");
  });

  it("leaves unrelated anchors and non-recovery callbacks to their existing handler", async () => {
    for (const hash of [
      "#lesson-details",
      fragment.replace("type=recovery", "type=email"),
    ]) {
      const original = `https://sajag.example.test/settings${hash}`;
      const callback = await openCallback(original);
      expect(callback.module.getRecoveryLinkTokens()).toBeNull();
      expect(callback.module.recoveryLinkRequested()).toBe(false);
      expect(callback.replaceState).not.toHaveBeenCalled();
      expect(callback.currentUrl().href).toBe(original);
    }
  });

  it("discards tokens and stays behind the recovery gate when history replacement fails", async () => {
    const callback = await openCallback(
      `https://sajag.example.test/settings${fragment}`,
      true,
    );
    expect(callback.module.getRecoveryLinkTokens()).toBeNull();
    expect(callback.module.recoveryLinkRequested()).toBe(true);
    expect(callback.replaceState).toHaveBeenCalledOnce();
    for (const method of callback.storageMethods) {
      expect(method).not.toHaveBeenCalled();
    }
  });
});
