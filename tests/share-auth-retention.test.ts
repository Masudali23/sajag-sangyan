import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => "android" },
}));
let target: EventTarget;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  const location = {
    href: "https://localhost/check?text=Sensitive%20shared%20message",
    pathname: "/check",
  };
  target = new EventTarget();
  vi.stubGlobal(
    "window",
    Object.assign(target, {
      location,
      history: {
        state: null,
        replaceState(_state: unknown, _title: string, path: string) {
          location.href = new URL(path, location.href).href;
        },
      },
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("transient share intake during required sign-in", () => {
  it("retains received text through a normal OTP wait then restores short consumption expiry", async () => {
    const intake = await import("../src/lib/share-intake");
    const release = intake.holdSharedMessageForSignIn();
    await vi.advanceTimersByTimeAsync(65000);
    expect(intake.peekSharedMessage()?.text).toBe("Sensitive shared message");
    release();
    await vi.advanceTimersByTimeAsync(30000);
    expect(intake.peekSharedMessage()).toBeNull();
    expect(intake.getShareIntakeStatus()).toBe("unavailable");
  });
  it("caps a stalled sign-in at fifteen minutes even with repeated holds", async () => {
    const intake = await import("../src/lib/share-intake");
    const first = intake.holdSharedMessageForSignIn();
    await vi.advanceTimersByTimeAsync(14 * 60000);
    const second = intake.holdSharedMessageForSignIn();
    first();
    await vi.advanceTimersByTimeAsync(60000);
    expect(intake.peekSharedMessage()).toBeNull();
    second();
  });
  it("purges share text immediately on pagehide even while sign-in is pending", async () => {
    const intake = await import("../src/lib/share-intake");
    intake.holdSharedMessageForSignIn();
    target.dispatchEvent(new Event("pagehide"));
    expect(intake.peekSharedMessage()).toBeNull();
  });
});
