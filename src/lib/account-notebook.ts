import type { SavedCheck } from "../../shared/types";
import { analysisSchema } from "../../shared/validation";

export type NotebookStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;
export type AccountNotebook = { saved: SavedCheck[]; completed: string[] };
export const LEGACY_NOTEBOOK_KEYS = ["sajag-saved", "sajag-completed"] as const;
export const accountNotebookKey = (owner: string) =>
  `sajag-notebook:${encodeURIComponent(owner)}`;

function parse(storage: NotebookStorage, key: string): unknown {
  try {
    return JSON.parse(storage.getItem(key) || "null");
  } catch {
    return null;
  }
}
export function cleanSaved(items: unknown): SavedCheck[] {
  if (!Array.isArray(items)) return [];
  const valid = items
    .filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.savedAt === "string" &&
        Number.isFinite(Date.parse(item.savedAt)) &&
        analysisSchema.safeParse(item.analysis).success,
    )
    .map((item) => ({
      id: item.id,
      savedAt: item.savedAt,
      analysis: analysisSchema.parse(item.analysis),
    }));
  return [...new Map(valid.map((item) => [item.id, item])).values()].slice(
    0,
    50,
  );
}
function cleanCompleted(items: unknown): string[] {
  return Array.isArray(items)
    ? [
        ...new Set(
          items.filter(
            (item): item is string =>
              typeof item === "string" && item.length > 0 && item.length <= 150,
          ),
        ),
      ].slice(0, 500)
    : [];
}
export function readAccountNotebook(
  storage: NotebookStorage,
  owner: string | null,
): AccountNotebook {
  if (!owner) return { saved: [], completed: [] };
  const raw = parse(
    storage,
    accountNotebookKey(owner),
  ) as Partial<AccountNotebook> | null;
  return {
    saved: cleanSaved(raw?.saved),
    completed: cleanCompleted(raw?.completed),
  };
}
export function readLegacyNotebook(storage: NotebookStorage): AccountNotebook {
  return {
    saved: cleanSaved(parse(storage, LEGACY_NOTEBOOK_KEYS[0])),
    completed: cleanCompleted(parse(storage, LEGACY_NOTEBOOK_KEYS[1])),
  };
}
export function writeAccountNotebook(
  storage: NotebookStorage,
  owner: string | null,
  notebook: AccountNotebook,
): boolean {
  if (!owner) return false;
  try {
    storage.setItem(
      accountNotebookKey(owner),
      JSON.stringify({
        version: 1,
        saved: cleanSaved(notebook.saved),
        completed: cleanCompleted(notebook.completed),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

// Explicit ownership confirmation must happen in the UI before calling this.
// Write the combined account record first; failed storage never deletes legacy data.
export function importLegacyNotebook(
  storage: NotebookStorage,
  owner: string,
): AccountNotebook {
  const current = readAccountNotebook(storage, owner);
  const legacy = readLegacyNotebook(storage);
  const merged = new Map(legacy.saved.map((item) => [item.id, item]));
  for (const item of current.saved) merged.set(item.id, item);
  const next = {
    saved: [...merged.values()]
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .slice(0, 50),
    completed: [...new Set([...current.completed, ...legacy.completed])].slice(
      0,
      500,
    ),
  };
  if (!writeAccountNotebook(storage, owner, next))
    throw new Error("Storage unavailable");
  // Removing both old keys is an explicit migration, never an automatic assignment.
  for (const key of LEGACY_NOTEBOOK_KEYS) storage.removeItem(key);
  return next;
}
