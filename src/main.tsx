import "./lib/validation-config";
import "./lib/share-intake";
import { Capacitor } from "@capacitor/core";
import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { useApp, readLocal } from "./lib/preferences";
import { AppProvider } from "./lib/preferences";
import { AuthProvider } from "./lib/auth";
import Layout from "./components/Layout";
import RequireSignIn from "./components/RequireSignIn";
import NativeBackNavigation from "./components/NativeBackNavigation";
import Home from "./pages/Home";
import "./styles.css";
import "./app-design.css";
const CheckPage = lazy(() => import("./pages/Check"));
const LearnPage = lazy(() =>
  import("./pages/Learn").then((m) => ({ default: m.LearnPage })),
);
const LessonPage = lazy(() =>
  import("./pages/Learn").then((m) => ({ default: m.LessonPage })),
);
const SimulatePage = lazy(() => import("./pages/Simulate"));
const Notebook = lazy(() => import("./pages/Notebook"));
const TrustPage = lazy(() =>
  import("./pages/Trust").then((m) => ({ default: m.TrustPage })),
);
const HelpPage = lazy(() =>
  import("./pages/Trust").then((m) => ({ default: m.HelpPage })),
);
const SettingsPage = lazy(() => import("./pages/Settings"));
function LoadingPage() {
  const { t } = useApp();
  return (
    <div className="loading-page" role="status">
      {t("Sajag · Loading…", "सजग · खुल रहा है…", "সজাগ · খুলছে…")}
    </div>
  );
}
function NotFoundPage() {
  const { t } = useApp();
  return (
    <div className="card empty-state">
      <h1>{t("Page not found", "पेज नहीं मिला", "পেজ পাওয়া যায়নি")}</h1>
      <Link className="button primary" to="/">
        {t("Return to Sajag", "सजग पर वापस जाएँ", "সজাগে ফিরে যান")}
      </Link>
    </div>
  );
}
function PageError() {
  const language =
    document.documentElement.lang ||
    readLocal<{ language?: string }>("sajag-preferences", {}).language;
  const t = (en: string, hi: string, bn: string) =>
    language === "bn" ? bn : language === "hi" ? hi : en;
  return (
    <div className="card empty-state">
      <h1>
        {t("Let’s try that again.", "फिर कोशिश करें।", "আবার চেষ্টা করি।")}
      </h1>
      <p>
        {t(
          "Something interrupted the page. Your saved notebook has not been deleted.",
          "पेज खुलने में समस्या आई। सहेजी नोटबुक नहीं मिटाई गई है।",
          "পেজ খুলতে সমস্যা হয়েছে। আপনার সেভ করা নোটবুক মুছে যায়নি।",
        )}
      </p>
      <button
        className="button primary"
        onClick={() => window.location.reload()}
      >
        {t("Reload", "फिर खोलें", "আবার খুলুন")}
      </button>
    </div>
  );
}
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <PageError /> : this.props.children;
  }
}
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <NativeBackNavigation />
            <RequireSignIn>
              <Suspense fallback={<LoadingPage />}>
                <Routes>
                  <Route element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="check" element={<CheckPage />} />
                    <Route path="learn" element={<LearnPage />} />
                    <Route path="learn/:id" element={<LessonPage />} />
                    <Route path="simulate" element={<SimulatePage />} />
                    <Route path="saved" element={<Notebook />} />
                    <Route path="sources" element={<TrustPage />} />
                    <Route path="help" element={<HelpPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
              </Suspense>
            </RequireSignIn>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  !Capacitor.isNativePlatform()
)
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* App remains usable without cache. */
    });
  });
if ("speechSynthesis" in window) window.speechSynthesis.getVoices();
