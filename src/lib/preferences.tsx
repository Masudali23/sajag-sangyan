import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type {
  Language,
  Localized,
  ClaimAnalysis,
  SavedCheck,
} from "../../shared/types";
import { bengaliUi } from "./bengali-ui";
import { bengaliEngineCopy } from "../../shared/bengali-engine-copy";
import { LANGUAGES } from "../../shared/types";
import { analysisSchema } from "../../shared/validation";
import { useAuth } from "./auth";
import {
  readAccountNotebook,
  readLegacyNotebook,
  writeAccountNotebook,
  importLegacyNotebook,
  type AccountNotebook,
} from "./account-notebook";
type Preferences = { language: Language; largeText: boolean; lowData: boolean };
type AppContextValue = {
  prefs: Preferences;
  updatePrefs: (next: Partial<Preferences>) => void;
  t: (en: string, hi: string, bn?: string) => string;
  local: (value: Localized) => string;
  saved: SavedCheck[];
  save: (analysis: ClaimAnalysis) => void;
  restore: (checks: SavedCheck[]) => void;
  remove: (id: string) => void;
  completed: string[];
  legacyNotebookCount: number;
  legacyProgressCount: number;
  migrateLegacyNotebook: () => void;
  complete: (id: string) => void;
  clear: () => void;
  toast: (text: string) => void;
};
const Context = createContext<AppContextValue | null>(null);
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // Remount before rendering a different account so one user's notebook never
  // appears for even one render in another user's signed-in session.
  return (
    <OwnedAppProvider key={user?.id || "signed-out"} owner={user?.id || null}>
      {children}
    </OwnedAppProvider>
  );
}
function OwnedAppProvider({
  children,
  owner,
}: {
  children: ReactNode;
  owner: string | null;
}) {
  const [prefs, setPrefs] = useState<Preferences>(() => {
    const p = readLocal<Partial<Preferences>>("sajag-preferences", {});
    return {
      language: LANGUAGES.includes(p.language as Language) ? p.language! : "en",
      largeText: !!p.largeText,
      lowData: !!p.lowData,
    };
  });
  const [notebook, setNotebook] = useState<AccountNotebook>(() => {
    try {
      return readAccountNotebook(localStorage, owner);
    } catch {
      return { saved: [], completed: [] };
    }
  });
  const [legacy, setLegacy] = useState<AccountNotebook>(() => {
    try {
      return readLegacyNotebook(localStorage);
    } catch {
      return { saved: [], completed: [] };
    }
  });
  const { saved, completed } = notebook;
  function persist(next: AccountNotebook) {
    try {
      if (!writeAccountNotebook(localStorage, owner, next)) return false;
      setNotebook(next);
      return true;
    } catch {
      return false;
    }
  }
  function migrateLegacyNotebook() {
    if (!owner) throw new Error("Sign in required");
    const next = importLegacyNotebook(localStorage, owner);
    setNotebook(next);
    setLegacy({ saved: [], completed: [] });
  }
  const [message, setMessage] = useState("");
  const toast = (text: string) => setMessage(text);
  const t = (en: string, hi: string, bn?: string) =>
    prefs.language === "bn"
      ? (bn ?? bengaliUi[en] ?? en)
      : prefs.language === "hi"
        ? hi
        : en;
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4500);
    return () => clearTimeout(timer);
  }, [message]);
  useEffect(() => {
    document.documentElement.lang = prefs.language;
    document.documentElement.classList.toggle("large-text", prefs.largeText);
    document.documentElement.classList.toggle("low-data", prefs.lowData);
  }, [prefs]);
  function updatePrefs(next: Partial<Preferences>) {
    setPrefs((old) => {
      const p = { ...old, ...next };
      writeLocal("sajag-preferences", p);
      return p;
    });
  }
  function save(analysis: ClaimAnalysis) {
    const next = [
      { id: analysis.id, analysis, savedAt: new Date().toISOString() },
      ...saved.filter((s) => s.id !== analysis.id),
    ].slice(0, 50);
    if (persist({ saved: next, completed })) {
      toast(
        prefs.language === "bn"
          ? "এই ডিভাইসে রাখা হয়েছে"
          : prefs.language === "hi"
            ? "इस डिवाइस पर सहेजा गया"
            : "Saved on this device",
      );
    } else
      toast(
        prefs.language === "bn"
          ? "ব্রাউজারে সেভ করা যাচ্ছে না"
          : prefs.language === "hi"
            ? "ब्राउज़र में सहेजना उपलब्ध नहीं है"
            : "Browser storage is unavailable",
      );
  }
  function remove(id: string) {
    const next = saved.filter((x) => x.id !== id);
    if (!persist({ saved: next, completed }))
      toast(
        t(
          "Browser storage is unavailable",
          "ब्राउज़र में सहेजना उपलब्ध नहीं है",
          "ব্রাউজারে সেভ করা যাচ্ছে না",
        ),
      );
  }
  function restore(checks: SavedCheck[]) {
    const merged = new Map(saved.map((s) => [s.id, s]));
    for (const check of checks)
      if (analysisSchema.safeParse(check.analysis).success)
        merged.set(check.id, {
          ...check,
          analysis: analysisSchema.parse(check.analysis),
        });
    const next = [...merged.values()]
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .slice(0, 50);
    if (persist({ saved: next, completed })) return;
    else throw new Error("Storage unavailable");
  }
  function complete(id: string) {
    const next = [...new Set([...completed, id])];
    if (!persist({ saved, completed: next }))
      toast(
        t(
          "Browser storage is unavailable",
          "ब्राउज़र में सहेजना उपलब्ध नहीं है",
          "ব্রাউজারে সেভ করা যাচ্ছে না",
        ),
      );
  }
  function clear() {
    if (!persist({ saved: [], completed: [] })) {
      toast(
        t(
          "Browser storage is unavailable",
          "ब्राउज़र में सहेजना उपलब्ध नहीं है",
          "ব্রাউজারে সেভ করা যাচ্ছে না",
        ),
      );
      return;
    }
    try {
      localStorage.removeItem("sajag-preferences");
    } catch {
      /* Shared display preferences only. */
    }
    setPrefs({ language: "en", largeText: false, lowData: false });
    toast(
      prefs.language === "bn"
        ? "এই ডিভাইস থেকে সজাগের শেখার তথ্য মুছে দেওয়া হয়েছে।"
        : prefs.language === "hi"
          ? "इस डिवाइस से सजग का सीखने का डेटा मिटा दिया गया।"
          : "Your account’s learning data cleared from this device.",
    );
  }
  return (
    <Context.Provider
      value={{
        prefs,
        updatePrefs,
        t,
        local: (v) =>
          v[prefs.language] ||
          (prefs.language === "bn"
            ? (bengaliEngineCopy[v.en] ??
              "এই পুরোনো লেখার বাংলা অনুবাদ নেই। মূল ভাষায় পড়তে English বেছে নিন।")
            : v.en),
        saved,
        save,
        restore,
        remove,
        completed,
        legacyNotebookCount: legacy.saved.length,
        legacyProgressCount: legacy.completed.length,
        migrateLegacyNotebook,
        complete,
        clear,
        toast,
      }}
    >
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}
export function useApp() {
  const context = useContext(Context);
  if (!context) throw new Error("AppProvider is required");
  return context;
}
