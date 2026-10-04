import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FlaskConical,
  Globe2,
  Home,
  Leaf,
  Menu,
  SearchCheck,
  Settings2,
  ShieldCheck,
  Sparkles,
  WifiOff,
  Bookmark,
  X,
} from "lucide-react";
import { useApp } from "../lib/preferences";
import { Brand, Modal } from "./UI";
import { useAuth } from "../lib/auth";
import { profileFor } from "../lib/profile";
import { AppDownload } from "./AppDownload";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export default function Layout() {
  const { t, prefs, updatePrefs } = useApp();
  const { user } = useAuth();
  const profile = profileFor(user);
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const [install, setInstall] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    const onlineHandler = () => setOnline(navigator.onLine);
    const installHandler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as InstallEvent);
    };
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", onlineHandler);
    window.addEventListener("beforeinstallprompt", installHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", onlineHandler);
      window.removeEventListener("beforeinstallprompt", installHandler);
    };
  }, []);
  const nav = [
    { to: "/", icon: Home, label: t("Home", "होम"), short: t("Home", "होम") },
    {
      to: "/check",
      icon: SearchCheck,
      label: t("Check a message", "संदेश जाँचें"),
      short: t("Check", "जाँचें"),
    },
    {
      to: "/learn",
      icon: BookOpen,
      label: t("Learn simply", "आसानी से सीखें"),
      short: t("Learn", "सीखें"),
    },
    {
      to: "/simulate",
      icon: FlaskConical,
      label: t("Experience risk", "जोखिम समझें"),
      short: t("Explore", "आज़माएँ"),
    },
    {
      to: "/saved",
      icon: Bookmark,
      label: t("My notebook", "मेरी नोटबुक"),
      short: t("Saved", "सहेजे"),
    },
  ];
  const current = nav.find((n) =>
    n.to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(n.to),
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t("Skip to content", "सीधे मुख्य सामग्री पर जाएँ")}
      </a>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label={t("Close navigation", "नेविगेशन बंद करें")}
          onClick={() => setMenu(false)}
        />
      )}
      <aside
        id="main-sidebar"
        className={`sidebar ${menu ? "open" : ""}`}
        aria-label={t("App navigation", "ऐप नेविगेशन", "অ্যাপের নেভিগেশন")}
      >
        <NavLink
          to="/"
          className="brand-link"
          aria-label={t("Sajag home", "सजग का मुख्य पेज", "সজাগের হোম")}
        >
          <Brand />
        </NavLink>
        <p className="brand-tagline">
          {t("A little wiser. A little safer.", "थोड़ी समझ। थोड़ी सुरक्षा।")}
        </p>
        <div className="nav-label">
          {t("YOUR EVERYDAY COMPANION", "आपका रोज़ का साथी")}
        </div>
        <nav
          className="main-nav"
          aria-label={t("Main navigation", "मुख्य नेविगेशन")}
        >
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={19} strokeWidth={1.75} />
              <span>{label}</span>
              {to === "/check" && (
                <span className="nav-new">{t("TRY", "जाँचें")}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="little-leaf">
              <Leaf size={19} />
            </span>
            <strong>
              {t(
                "Confidence grows with understanding.",
                "समझ से भरोसा बढ़ता है।",
              )}
            </strong>
            <p>
              {t(
                "One small lesson can make a big difference.",
                "एक छोटी सीख बड़ा अंतर ला सकती है।",
              )}
            </p>
            <NavLink to="/learn">
              {t("Start learning", "सीखना शुरू करें")}
              <ArrowUpRight size={16} />
            </NavLink>
          </div>
          <nav className="support-nav">
            {!Capacitor.isNativePlatform() && (
              <button
                className="nav-item"
                onClick={() => {
                  setMenu(false);
                  setInstall(true);
                }}
              >
                <ArrowDownToLine size={18} />
                {t("Get the app", "ऐप पाएँ")}
              </button>
            )}
            <NavLink to="/sources" className="nav-item">
              <ShieldCheck size={18} />
              {t("Our sources & trust", "हमारे स्रोत और भरोसा")}
            </NavLink>
            <NavLink to="/help" className="nav-item">
              <CircleHelp size={18} />
              {t("Get help", "मदद पाएँ")}
            </NavLink>
          </nav>
          <NavLink to="/settings" className="guest-profile">
            <span className="avatar" aria-hidden="true">
              {user ? profile.initials : "S"}
            </span>
            <span>
              <strong>
                {user ? profile.label : t("Your own pace", "अपनी गति से")}
              </strong>
              <small>
                {user
                  ? t("Your account", "आपका खाता")
                  : t(
                      "Sign in to Sajag",
                      "Sajag में साइन इन करें",
                      "সজাগে সাইন ইন করুন",
                    )}
              </small>
            </span>
            <Settings2 size={18} />
          </NavLink>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button menu-button"
              aria-label={
                menu
                  ? t("Close navigation", "नेविगेशन बंद करें")
                  : t("Open navigation", "नेविगेशन खोलें")
              }
              aria-expanded={menu}
              aria-controls="main-sidebar"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={21} /> : <Menu size={21} />}
            </button>
            <span className="desktop-breadcrumb">
              {t("Your companion", "आपका साथी")}
              <ChevronRight size={13} />
            </span>
            <strong className="desktop-route-title">
              {current?.label || t("Sajag", "सजग")}
            </strong>
            <NavLink
              to="/"
              className="mobile-brand"
              aria-label={t("Sajag home", "सजग का मुख्य पेज", "সজাগের হোম")}
            >
              <Brand />
            </NavLink>
          </div>
          <div className="topbar-actions">
            <span className="bharat-badge">
              <span className="tricolor">🇮🇳</span>
              {t("Made for Bharat", "भारत के लिए")}
            </span>
            <label className="language-control">
              <Globe2 size={16} />
              <span className="sr-only">
                {t("Choose language", "भाषा चुनें")}
              </span>
              <select
                value={prefs.language}
                onChange={(e) =>
                  updatePrefs({
                    language: e.target.value as "en" | "hi" | "bn",
                  })
                }
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी</option>
                <option value="bn">বাংলা</option>
              </select>
              <ChevronDown size={13} />
            </label>
            {!Capacitor.isNativePlatform() && (
              <button
                className="install-button"
                aria-label={t("Get the app", "ऐप पाएँ")}
                onClick={() => setInstall(true)}
              >
                <ArrowDownToLine size={16} />
                <span>{t("Get the app", "ऐप पाएँ")}</span>
              </button>
            )}
            <NavLink
              to="/settings"
              className={`icon-button topbar-settings ${user ? "profile-avatar" : ""}`}
              aria-label={
                user
                  ? t(
                      `Your account: ${profile.label}`,
                      `आपका खाता: ${profile.label}`,
                      `আপনার অ্যাকাউন্ট: ${profile.label}`,
                    )
                  : t("Settings", "सेटिंग")
              }
            >
              {user ? (
                <span aria-hidden="true">{profile.initials}</span>
              ) : (
                <Settings2 size={20} />
              )}
            </NavLink>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <WifiOff size={16} />
            {t(
              "You’re offline. Saved lessons, local checks and simulations still work.",
              "आप ऑफलाइन हैं। उपलब्ध पाठ, स्थानीय जाँच और सिम्युलेशन चलते रहेंगे।",
            )}
          </div>
        )}
        <main id="main" className="main-content">
          <Outlet />
        </main>
        <footer className="app-footer">
          <span>
            <ShieldCheck size={14} />
            {t(
              "Built for understanding. Always independent.",
              "समझ के लिए। हमेशा स्वतंत्र।",
            )}
          </span>
          <span>
            {t(
              "Education, not investment advice.",
              "शिक्षा, निवेश की सलाह नहीं।",
            )}
            <NavLink to="/settings">{t("Privacy", "गोपनीयता")}</NavLink>
          </span>
        </footer>
      </div>
      <nav
        className="mobile-nav"
        aria-label={t("Mobile navigation", "मोबाइल नेविगेशन")}
      >
        {nav.map(({ to, icon: Icon, short, label }) => (
          <NavLink key={to} to={to} end={to === "/"} aria-label={label}>
            <span className="nav-icon">
              <Icon size={22} />
            </span>
            <span>{short}</span>
          </NavLink>
        ))}
      </nav>
      {install && (
        <Modal
          title={t("A little clarity, wherever you go.", "समझ का साथ, हर जगह।")}
          onClose={() => setInstall(false)}
        >
          <div className="install-preview">
            <Brand />
            <Sparkles size={25} />
          </div>
          <AppDownload />
          <p>
            {t(
              "Keep Sajag on your home screen. Sign in online first. Downloaded lessons, local checks and simulations remain available offline while your verified session is remembered.",
              "Sajag को होम स्क्रीन पर रखें। पहले ऑनलाइन साइन इन करें। सत्यापित सत्र याद रहने तक डाउनलोड किए पाठ, स्थानीय जाँच और सिम्युलेशन ऑफलाइन उपलब्ध रहते हैं।",
              "সজাগকে হোম স্ক্রিনে রাখুন। আগে অনলাইনে সাইন ইন করুন। যাচাই করা সেশন মনে রাখা থাকলে ডাউনলোড করা পাঠ, স্থানীয় যাচাই ও সিমুলেশন অফলাইনে পাওয়া যায়।",
            )}
          </p>
          {installEvent ? (
            <button
              className="button primary full"
              onClick={async () => {
                await installEvent.prompt();
                await installEvent.userChoice;
                setInstallEvent(null);
                setInstall(false);
              }}
            >
              {t("Install Sajag", "Sajag इंस्टॉल करें")}
              <ArrowDownToLine size={17} />
            </button>
          ) : (
            <div className="callout">
              <strong>
                {t("Add to your home screen", "होम स्क्रीन पर जोड़ें")}
              </strong>
              <p>
                {t(
                  "On Android: open your browser menu → Install app or Add to Home screen. On iPhone: open in Safari → Share → Add to Home Screen. The option appears on supported browsers over HTTPS.",
                  "Android: ब्राउज़र मेनू → ऐप इंस्टॉल करें या होम स्क्रीन पर जोड़ें। iPhone: Safari → शेयर → होम स्क्रीन पर जोड़ें। यह विकल्प समर्थित ब्राउज़र में HTTPS पर मिलता है।",
                )}
              </p>
            </div>
          )}
          <small className="muted">
            {t(
              "No trading. No banking access. Just understanding.",
              "कोई ट्रेडिंग नहीं। बैंक खाते तक पहुँच नहीं। सिर्फ समझ।",
            )}
          </small>
        </Modal>
      )}
    </div>
  );
}
