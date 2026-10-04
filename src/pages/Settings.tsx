import { useState } from "react";
import {
  Globe2,
  LockKeyhole,
  Settings2,
  Trash2,
  Type,
  Wifi,
} from "lucide-react";
import { useApp } from "../lib/preferences";
import { Eyebrow, Modal } from "../components/UI";
import { useAiProvider } from "../lib/ai-provider";
import { AccountCard } from "../components/AccountCard";
import { AppDownload } from "../components/AppDownload";
import { Capacitor } from "@capacitor/core";
import { AiDataNotice } from "../components/AiDataNotice";
export default function SettingsPage() {
  const { prefs, updatePrefs, t, clear } = useApp();
  const { provider } = useAiProvider(!prefs.lowData);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="page settings-page">
      <div className="page-heading">
        <div>
          <Eyebrow>
            {t("YOUR SPACE. YOUR CHOICES.", "आपकी जगह। आपकी पसंद।")}
          </Eyebrow>
          <h1>
            {t("Make yourself comfortable.", "अपने हिसाब से इस्तेमाल करें।")}
          </h1>
          <p>
            {t(
              "Choose how you learn and what you keep.",
              "सीखने का तरीका और क्या सहेजना है, चुनें।",
            )}
          </p>
        </div>
        <Settings2 className="heading-icon" size={32} />
      </div>
      <AccountCard />
      <div className="settings-grid">
        <div>
          <section className="card settings-card">
            <h2>{t("Learning preferences", "सीखने की पसंद")}</h2>
            <div className="setting-row">
              <Globe2 size={22} />
              <div>
                <strong>{t("Your language", "आपकी भाषा")}</strong>
                <p>
                  {t(
                    "Use the whole app in English, Hindi or Bengali.",
                    "पूरा ऐप अंग्रेज़ी, हिन्दी या बांग्ला में इस्तेमाल करें।",
                    "পুরো অ্যাপ English, हिन्दी বা বাংলায় ব্যবহার করুন।",
                  )}
                </p>
              </div>
              <select
                aria-label={t("App language", "ऐप की भाषा")}
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
            </div>
            <p
              className="privacy-note"
              lang={prefs.language === "bn" ? "bn" : undefined}
            >
              {t(
                "Bengali (beta) · Machine-assisted translation; native-speaker review pending.",
                "बांग्ला (बीटा) · मशीन की मदद से अनुवाद; मूल वक्ता की समीक्षा बाकी है।",
                "বাংলা (বেটা) · মেশিনের সাহায্যে অনুবাদ; বাংলা ভাষাভাষীর রিভিউ বাকি।",
              )}
            </p>
            <div className="setting-row">
              <Type size={22} />
              <div>
                <strong>{t("A little larger", "थोड़ा बड़ा पाठ")}</strong>
                <p>
                  {t(
                    "Increase text size throughout the app.",
                    "पूरे ऐप के अक्षर बड़े करें।",
                  )}
                </p>
              </div>
              <button
                className={`toggle ${prefs.largeText ? "on" : ""}`}
                role="switch"
                aria-checked={prefs.largeText}
                aria-label={t("Larger text", "बड़े अक्षर")}
                onClick={() => updatePrefs({ largeText: !prefs.largeText })}
              >
                <span />
              </button>
            </div>
            <div className="setting-row">
              <Wifi size={22} />
              <div>
                <strong>{t("Low-data mode", "कम-डेटा मोड")}</strong>
                <p>
                  {t(
                    "Disable the optional online AI second look and reduce motion.",
                    "वैकल्पिक ऑनलाइन AI जाँच बंद करें और गति कम करें।",
                  )}
                </p>
              </div>
              <button
                className={`toggle ${prefs.lowData ? "on" : ""}`}
                role="switch"
                aria-checked={prefs.lowData}
                aria-label={t("Low-data mode", "कम-डेटा मोड")}
                onClick={() => updatePrefs({ lowData: !prefs.lowData })}
              >
                <span />
              </button>
            </div>
          </section>
          <section className="card settings-card">
            <h2>
              {t("Your device, your notebook", "आपका डिवाइस, आपकी नोटबुक")}
            </h2>
            <p>
              {t(
                "Sajag keeps your saved checks, lesson completion and preferences in this browser. Local storage is not encrypted by Sajag. No banking access, trackers or advertising cookies.",
                "Sajag आपकी सहेजी जाँच, पाठ की प्रगति और सेटिंग इस ब्राउज़र में रखता है। स्थानीय डेटा Sajag द्वारा एन्क्रिप्ट नहीं होता। बैंकिंग पहुँच, ट्रैकर या विज्ञापन कुकी नहीं।",
              )}
            </p>
            <button
              className="button danger-outline small"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={16} />
              {t(
                "Clear Sajag data on this device",
                "इस डिवाइस का Sajag डेटा मिटाएँ",
              )}
            </button>
            <small className="muted">
              {t(
                "Clearing removes this account’s local notebook and lesson progress, plus shared device preferences. Other accounts, unassigned older data, cloud backups and sign-in stay separate.",
                "इस खाते की स्थानीय नोटबुक, पाठ प्रगति और साझा डिवाइस सेटिंग मिटेंगी। दूसरे खाते, पुराने बिना खाते के डेटा, क्लाउड बैकअप और लॉगिन अलग रहते हैं।",
                "এই অ্যাকাউন্টের স্থানীয় নোটবুক, পাঠের অগ্রগতি ও ডিভাইসের ভাগ করা পছন্দ মুছে যাবে। অন্য অ্যাকাউন্ট, পুরোনো মালিকবিহীন তথ্য, ক্লাউড ব্যাকআপ ও সাইন ইন আলাদা থাকবে।",
              )}
            </small>
          </section>
        </div>
        <div>
          <div className="gentle-note">
            <LockKeyhole size={23} />
            <strong>
              {t("You are in control.", "नियंत्रण आपके हाथ में है।")}
            </strong>
            <p>
              {t(
                "Use your Sajag password to sign in. Email codes verify a new account or reset a password. Sajag never needs your PAN, Aadhaar, bank statement, bank password or bank/UPI OTP. Saved checks stay in this account's local notebook unless you choose cloud backup. Read-aloud prefers an installed voice; an online voice may send public lesson or explanation text to its provider. Dictation uses your speech provider only when chosen.",
                "Sajag पासवर्ड से लॉगिन करें। ईमेल कोड नए खाते की पुष्टि या पासवर्ड बदलने के लिए हैं। Sajag को PAN, आधार, बैंक स्टेटमेंट, बैंक पासवर्ड या बैंक/UPI OTP नहीं चाहिए। क्लाउड बैकअप चुनने तक सहेजी जाँच इस खाते की स्थानीय नोटबुक में रहती है। सुनाने के लिए पहले इंस्टॉल आवाज़ चुनते हैं; ऑनलाइन आवाज़ सार्वजनिक पाठ या व्याख्या अपने प्रदाता को भेज सकती है। बोलकर लिखना चुनने पर ही स्पीच प्रदाता इस्तेमाल होता है।",
                "সজাগ পাসওয়ার্ড দিয়ে সাইন ইন করুন। ইমেল কোড নতুন অ্যাকাউন্ট যাচাই বা পাসওয়ার্ড রিসেটের জন্য। সজাগের PAN, আধার, ব্যাংক স্টেটমেন্ট, ব্যাংক পাসওয়ার্ড বা ব্যাংক/UPI OTP দরকার নেই। ক্লাউড ব্যাকআপ না বাছলে সেভ করা যাচাই এই অ্যাকাউন্টের স্থানীয় নোটবুকে থাকে। পড়ে শোনানোর জন্য আগে ইনস্টল করা ভয়েস নেওয়া হয়; অনলাইন ভয়েস প্রকাশ্য পাঠ বা ব্যাখ্যা তার পরিষেবায় পাঠাতে পারে। আপনি বেছে নিলেই কথা থেকে লেখা তৈরির পরিষেবা ব্যবহৃত হয়।",
              )}
            </p>
          </div>
          <section className="card trust-card">
            <h2>
              {t("Optional AI and your data", "वैकल्पिक AI और आपका डेटा")}
            </h2>
            <AiDataNotice provider={provider} />
          </section>
          {!Capacitor.isNativePlatform() && (
            <section className="card settings-card">
              <h2>{t("Get the app", "ऐप पाएँ")}</h2>
              <AppDownload />
            </section>
          )}
        </div>
      </div>
      {confirmDelete && (
        <Modal
          title={t(
            "Clear this device’s Sajag data?",
            "इस डिवाइस का Sajag डेटा मिटाएँ?",
          )}
          onClose={() => setConfirmDelete(false)}
        >
          <p>
            {t(
              "This deletes this account’s saved checks and lesson progress, and shared device preferences. It does not delete other accounts’ notebooks, unassigned older data, cloud backups or your sign-in.",
              "इस खाते की जाँच, पाठ प्रगति और साझा डिवाइस सेटिंग मिटेंगी। दूसरे खातों की नोटबुक, पुराना बिना खाते का डेटा, क्लाउड बैकअप या साइन इन नहीं मिटेंगे।",
              "এই অ্যাকাউন্টের সেভ করা যাচাই, পাঠের অগ্রগতি ও ডিভাইসের ভাগ করা পছন্দ মুছে যাবে। অন্য অ্যাকাউন্টের নোটবুক, পুরোনো মালিকবিহীন তথ্য, ক্লাউড ব্যাকআপ বা সাইন ইন মুছবে না।",
            )}
          </p>
          <div className="button-row">
            <button
              className="button danger"
              onClick={() => {
                clear();
                setConfirmDelete(false);
              }}
            >
              {t("Delete this data", "यह डेटा मिटाएँ")}
            </button>
            <button
              className="button secondary"
              onClick={() => setConfirmDelete(false)}
            >
              {t("Keep it", "रहने दें")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
