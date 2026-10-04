import { describe, expect, it } from "vitest";
import { analyzeClaim } from "../shared/engine";
import {
  accountNotebookKey,
  importLegacyNotebook,
  readAccountNotebook,
  readLegacyNotebook,
  writeAccountNotebook,
  type NotebookStorage,
} from "../src/lib/account-notebook";
function memoryStorage() {
  const data = new Map<string, string>();
  const storage: NotebookStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
  return { storage, data };
}
const saved = (id: string) => ({
  id,
  analysis: analyzeClaim(
    "Guaranteed returns if you pay the joining fee today.",
    "en",
  ),
  savedAt: "2026-10-03T00:00:00Z",
});
describe("account-owned local notebooks", () => {
  it("never loads an unowned notebook or another account's notebook on sign-in", () => {
    const { storage } = memoryStorage();
    storage.setItem("sajag-saved", JSON.stringify([saved("legacy")]));
    storage.setItem("sajag-completed", JSON.stringify(["otp"]));
    expect(
      writeAccountNotebook(storage, "A", {
        saved: [saved("A-check")],
        completed: ["fees"],
      }),
    ).toBe(true);
    expect(readAccountNotebook(storage, "A").saved[0].id).toBe("A-check");
    expect(readAccountNotebook(storage, "B")).toEqual({
      saved: [],
      completed: [],
    });
    expect(readAccountNotebook(storage, null)).toEqual({
      saved: [],
      completed: [],
    });
    expect(
      writeAccountNotebook(storage, null, {
        saved: [saved("guest")],
        completed: [],
      }),
    ).toBe(false);
    expect(readLegacyNotebook(storage).saved[0].id).toBe("legacy");
  });
  it("imports only when explicitly requested, merges progress and preserves existing account entries", () => {
    const { storage } = memoryStorage();
    storage.setItem(
      "sajag-saved",
      JSON.stringify([saved("legacy"), saved("duplicate")]),
    );
    storage.setItem("sajag-completed", JSON.stringify(["otp", "fees"]));
    writeAccountNotebook(storage, "A", {
      saved: [saved("duplicate")],
      completed: ["fees", "risk"],
    });
    const result = importLegacyNotebook(storage, "A");
    expect(result.saved.map((item) => item.id).sort()).toEqual([
      "duplicate",
      "legacy",
    ]);
    expect(result.completed).toEqual(["fees", "risk", "otp"]);
    expect(readLegacyNotebook(storage)).toEqual({ saved: [], completed: [] });
    expect(readAccountNotebook(storage, "B")).toEqual({
      saved: [],
      completed: [],
    });
  });
  it("keeps prior unowned data if account storage fails", () => {
    const { storage } = memoryStorage();
    storage.setItem("sajag-saved", JSON.stringify([saved("legacy")]));
    const failing = {
      ...storage,
      setItem: () => {
        throw new Error("Quota exceeded");
      },
    };
    expect(() => importLegacyNotebook(failing, "A")).toThrow(
      "Storage unavailable",
    );
    expect(readLegacyNotebook(storage).saved).toHaveLength(1);
    expect(storage.getItem(accountNotebookKey("A"))).toBeNull();
  });
  it("clearing one account never resurrects unowned data or erases another account", () => {
    const { storage } = memoryStorage();
    writeAccountNotebook(storage, "A", {
      saved: [saved("A")],
      completed: ["risk"],
    });
    writeAccountNotebook(storage, "B", {
      saved: [saved("B")],
      completed: ["fees"],
    });
    storage.setItem("sajag-saved", JSON.stringify([saved("legacy")]));
    writeAccountNotebook(storage, "A", { saved: [], completed: [] });
    expect(readAccountNotebook(storage, "A")).toEqual({
      saved: [],
      completed: [],
    });
    expect(readAccountNotebook(storage, "B").saved[0].id).toBe("B");
    expect(readLegacyNotebook(storage).saved).toHaveLength(1);
  });
  it("rejects malformed persisted entries and bounds oversized progress", () => {
    const { storage } = memoryStorage();
    storage.setItem(
      accountNotebookKey("A"),
      JSON.stringify({
        saved: [null, { id: "bad" }, saved("good")],
        completed: [null, "", "risk", "risk"],
      }),
    );
    expect(
      readAccountNotebook(storage, "A").saved.map((item) => item.id),
    ).toEqual(["good"]);
    expect(readAccountNotebook(storage, "A").completed).toEqual(["risk"]);
  });
});
