import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { bengaliSources } from "../../shared/bengali-sources";
import { hindiSourceScopes } from "../../shared/hindi-sources";
import { sources } from "../../shared/content";
import { useApp } from "../lib/preferences";
import {
  getVoiceCapabilities,
  openVoiceDataSettings,
  readAloud,
  stopReadAloud,
  VoiceError,
} from "../lib/voice";
import { voiceFeedback } from "../lib/voice-feedback";
import { Emoji } from "./Emoji";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand ${compact ? "compact" : ""}`}>
      <span className="brand-mark">
        <ShieldCheck size={25} strokeWidth={1.8} />
      </span>
      {!compact && (
        <span>
          sajag<span className="brand-dot">.</span>
        </span>
      )}
    </span>
  );
}
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const { t } = useApp();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="dialog-title"
    >
      <div className="modal-inner">
        <div className="section-heading">
          <h2 id="dialog-title">{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label={t("Close", "बंद करें", "বন্ধ করুন")}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function ListenButton({
  text,
  small = false,
}: {
  text: string;
  small?: boolean;
}) {
  const { prefs, t, toast, local } = useApp();
  const [speaking, setSpeaking] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [openingSettings, setOpeningSettings] = useState(false);
  const disclosureId = useId();
  const session = useRef(0);
  useEffect(
    () => () => {
      session.current++;
      void stopReadAloud();
    },
    [],
  );
  async function toggle() {
    const current = ++session.current;
    setShowVoiceSettings(false);
    setOpeningSettings(false);
    if (speaking) {
      void stopReadAloud();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    try {
      await readAloud({
        text,
        // Both callers supply reviewed library text, never the input or quote.
        publicContent: true,
        language:
          prefs.language === "bn"
            ? "bn-IN"
            : prefs.language === "hi"
              ? "hi-IN"
              : "en-IN",
      });
    } catch (error) {
      if (
        session.current === current &&
        !(error instanceof VoiceError && error.code === "cancelled")
      ) {
        toast(local(voiceFeedback(error, "readout")));
        if (
          error instanceof VoiceError &&
          error.code === "language-unavailable"
        ) {
          const capabilities = await getVoiceCapabilities().catch(() => null);
          if (session.current === current)
            setShowVoiceSettings(capabilities?.platform === "android");
        }
      }
    } finally {
      if (session.current === current) setSpeaking(false);
    }
  }
  async function openSettings() {
    const current = session.current;
    setOpeningSettings(true);
    try {
      await openVoiceDataSettings({ userInitiated: true });
    } catch (error) {
      if (session.current === current)
        toast(local(voiceFeedback(error, "readout")));
    } finally {
      if (session.current === current) setOpeningSettings(false);
    }
  }
  return (
    <div className="listen-control">
      <button
        className={`button ${small ? "small ghost" : "secondary"}`}
        onClick={toggle}
        aria-pressed={speaking}
        aria-describedby={disclosureId}
      >
        {speaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
        {speaking ? t("Stop", "रोकें") : t("Listen", "सुनें")}
      </button>
      {showVoiceSettings && (
        <button
          className="button small secondary"
          onClick={openSettings}
          disabled={openingSettings}
        >
          {t(
            "Open voice settings",
            "वॉइस सेटिंग्स खोलें",
            "ভয়েস সেটিংস খুলুন",
          )}
        </button>
      )}
      <details className="read-aloud-disclosure">
        <summary id={disclosureId}>
          {t(
            "Public text · voice may use internet",
            "सार्वजनिक पाठ · आवाज़ के लिए इंटरनेट लग सकता है",
            "প্রকাশ্য লেখা · ভয়েসে ইন্টারনেট লাগতে পারে",
          )}
        </summary>
        <p>
          {t(
            "Read-aloud prefers installed local voices. Your device’s speech service may process Sajag’s public lessons and explanations online. Your message text is not included.",
            "पढ़कर सुनाने के लिए पहले डिवाइस में उपलब्ध ऑफलाइन आवाज़ चुनी जाती है। आपके डिवाइस की स्पीच सेवा सजग के सार्वजनिक पाठ और व्याख्याओं को ऑनलाइन प्रोसेस कर सकती है। आपके संदेश का पाठ इसमें शामिल नहीं होता।",
            "পড়ে শোনাতে আগে ডিভাইসে থাকা অফলাইন ভয়েস বেছে নেওয়া হয়। ডিভাইসের স্পিচ পরিষেবা সজাগের প্রকাশ্য পাঠ ও ব্যাখ্যা অনলাইনে প্রক্রিয়া করতে পারে। আপনার বার্তার লেখা এতে থাকে না।",
          )}
        </p>
      </details>
    </div>
  );
}
export function SourceList({
  ids,
  compact = false,
}: {
  ids: string[];
  compact?: boolean;
}) {
  const { t, prefs } = useApp();
  const selected = sources.filter((source) => ids.includes(source.id));
  return (
    <div className={`source-list ${compact ? "compact-sources" : ""}`}>
      {selected.map((source) => (
        <a
          className="source-link"
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="source-monogram">
            {source.publisher === "Government of India" ? "IN" : "S"}
          </span>
          <span>
            <small>
              {prefs.language === "bn"
                ? (bengaliSources[source.id]?.publisher ?? source.publisher)
                : source.publisher}{" "}
              · {t("Educational reference", "शैक्षिक संदर्भ")}
            </small>
            <strong>
              {prefs.language === "bn"
                ? (bengaliSources[source.id]?.title ?? source.title)
                : source.title}
            </strong>
            {!compact && (
              <span className="source-scope">
                {prefs.language === "bn"
                  ? (bengaliSources[source.id]?.scope ?? source.scope)
                  : prefs.language === "hi"
                    ? (hindiSourceScopes[source.id] ?? source.scope)
                    : source.scope}
              </span>
            )}
          </span>
          <ExternalLink size={16} />
        </a>
      ))}
    </div>
  );
}
export function CheckBullet({ children }: { children: ReactNode }) {
  return (
    <span className="check-bullet">
      <Check size={14} />
      {children}
    </span>
  );
}
export function Outbound({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-link"
    >
      {children}
      <ArrowUpRight size={17} />
    </a>
  );
}

export function HeroArt() {
  return (
    <svg
      className="hero-art"
      viewBox="0 0 420 300"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="dots" width="15" height="15" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#ccd6c7" />
        </pattern>
        <filter id="paper-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow
            dx="0"
            dy="12"
            stdDeviation="12"
            floodColor="#183c36"
            floodOpacity=".10"
          />
        </filter>
      </defs>
      <circle cx="238" cy="153" r="125" fill="#e5ebdb" />
      <rect x="105" y="32" width="230" height="239" fill="url(#dots)" />
      <circle cx="341" cy="57" r="29" fill="#f4c973" />
      <path
        d="M54 224c-1-29 28-42 25-72 35 21 16 41 10 66M78 242c29-15 23-47 56-50-9 28-22 40-52 47"
        fill="#8aab8d"
      />
      <path d="m76 258 14-84" stroke="#567c61" strokeWidth="2" />
      <g transform="rotate(-12 159 134)" filter="url(#paper-shadow)">
        <rect x="83" y="62" width="143" height="176" rx="13" fill="#fffdf8" />
        <rect x="99" y="82" width="41" height="7" rx="3" fill="#cbd8c1" />
        <rect x="99" y="110" width="104" height="6" rx="3" fill="#e1e4dc" />
        <rect x="99" y="124" width="90" height="6" rx="3" fill="#e1e4dc" />
        <rect x="99" y="138" width="98" height="6" rx="3" fill="#e1e4dc" />
        <circle cx="117" cy="187" r="17" fill="#fbdfcc" />
        <path
          d="M117 177v10m0 7v1"
          stroke="#b46435"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="145" y="178" width="54" height="6" rx="3" fill="#e1e4dc" />
        <rect x="145" y="191" width="37" height="6" rx="3" fill="#e1e4dc" />
      </g>
      <g transform="rotate(8 272 170)" filter="url(#paper-shadow)">
        <rect x="202" y="89" width="130" height="159" rx="14" fill="#fff" />
        <rect x="216" y="104" width="101" height="96" rx="7" fill="#eff3e9" />
        <path
          d="m266 118 32 13v24c0 23-21 35-32 40-11-5-32-17-32-40v-24Z"
          fill="#295448"
        />
        <path
          d="m251 154 11 11 22-25"
          stroke="#d6edb9"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="222" y="213" width="66" height="6" rx="3" fill="#d4dece" />
        <rect x="222" y="225" width="89" height="5" rx="2.5" fill="#e9ece6" />
      </g>
      <circle cx="341" cy="194" r="22" fill="#f4c973" />
      <path
        d="M330 194h22m-11-11v22"
        stroke="#fffef9"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="m57 84 5 9 10 2-8 7 1 10-9-5-9 5 2-10-8-7 10-2 6-9Z"
        fill="#dfac7b"
      />
      <path
        d="M344 120c20 9 26 24 22 42M58 140c-9 13-9 28-3 39"
        stroke="#bccbbb"
        strokeWidth="2"
        strokeDasharray="4 6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LessonArt({ kind }: { kind: string }) {
  const icons: Record<string, string> = {
    risk: "shield",
    diversification: "basket",
    volatility: "risk",
    compounding: "growth",
    fees: "fees",
    nav: "nav",
    nomination: "family",
    "digital-arrest": "stop",
    "kyc-update": "link",
    "upi-pin": "lock",
    "task-jobs": "promo",
    "trading-apps": "returns",
    "advance-fees": "urgency",
    "online-friend": "message",
    "after-fraud": "helpline",
  };
  return (
    <Emoji
      name={icons[kind] ?? "learn"}
      size={88}
      className="lesson-illustration"
    />
  );
}
