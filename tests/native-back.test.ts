import { describe, expect, it, vi } from "vitest";
import { consumeNativeBack } from "../src/lib/native-back";

function surface(
  dialog: EventTarget | null = null,
  menu: { click(): void } | null = null,
) {
  return {
    querySelector: (selector: string) =>
      selector === "dialog[open]" ? dialog : menu,
  } as Pick<Document, "querySelector">;
}

describe("Android app Back", () => {
  it.each([
    "/check",
    "/learn",
    "/learn/risk",
    "/simulate",
    "/saved",
    "/settings",
    "/help",
  ])(
    "consumes Back on %s and returns Home instead of leaving the app",
    (pathname) => {
      const back = new Event("sajag:native-back", { cancelable: true });
      const goHome = vi.fn();
      consumeNativeBack(back, pathname, goHome, surface());
      expect(back.defaultPrevented).toBe(true);
      expect(goHome).toHaveBeenCalledOnce();
    },
  );
  it("leaves Home Back unconsumed for Android to exit", () => {
    const back = new Event("sajag:native-back", { cancelable: true });
    const goHome = vi.fn();
    consumeNativeBack(back, "/", goHome, surface());
    expect(back.defaultPrevented).toBe(false);
    expect(goHome).not.toHaveBeenCalled();
  });
  it("cancels an open modal before navigating or closing the navigation menu", () => {
    const dialog = new EventTarget();
    const cancel = vi.fn();
    dialog.addEventListener("cancel", cancel);
    const menu = { click: vi.fn() };
    const goHome = vi.fn();
    const back = new Event("sajag:native-back", { cancelable: true });
    consumeNativeBack(back, "/check", goHome, surface(dialog, menu));
    expect(cancel).toHaveBeenCalledOnce();
    expect(back.defaultPrevented).toBe(true);
    expect(menu.click).not.toHaveBeenCalled();
    expect(goHome).not.toHaveBeenCalled();
  });
  it("closes navigation before returning Home, including from Home", () => {
    const menu = { click: vi.fn() };
    const goHome = vi.fn();
    const back = new Event("sajag:native-back", { cancelable: true });
    consumeNativeBack(back, "/", goHome, surface(null, menu));
    expect(menu.click).toHaveBeenCalledOnce();
    expect(back.defaultPrevented).toBe(true);
    expect(goHome).not.toHaveBeenCalled();
  });
});
