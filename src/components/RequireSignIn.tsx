import { useEffect, type ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/preferences";
import { holdSharedMessageForSignIn } from "../lib/share-intake";
import { AccountCard } from "./AccountCard";
import { Brand } from "./UI";
import { Emoji } from "./Emoji";
import { lessons } from "../../shared/content";

// Keep the router at its intended destination; neither credentials nor shared text
// goes into a redirect URL. No educational route mounts before verification.
export default function RequireSignIn({ children }: { children: ReactNode }) {
  const { user, loading, configured, issue, retrySession } = useAuth();
  const { t, prefs, updatePrefs } = useApp();
  const lessonCount = new Intl.NumberFormat(
    prefs.language === "bn" ? "bn-IN" : "en-IN",
  ).format(lessons.length);
  const features = [
    {
      icon: "check",
      title: t("Check a message", "संदेश जाँचें", "বার্তা যাচাই করুন"),
      detail: t(
        "Understand the wording before you act.",
        "कोई कदम उठाने से पहले संदेश को समझें।",
        "কিছু করার আগে বার্তার ভাষা বুঝুন।",
      ),
    },
    {
      icon: "learn",
      title: t(
        `${lessonCount} short lessons`,
        `${lessonCount} छोटे पाठ`,
        `${lessonCount}টি ছোট পাঠ`,
      ),
      detail: t(
        "Money basics and ways to spot scams.",
        "पैसों की बुनियाद और ठगी पहचानने के तरीके।",
        "টাকার প্রাথমিক ধারণা ও প্রতারণা চেনার উপায়।",
      ),
    },
    {
      icon: "warning",
      title: t("Scam stories", "ठगी की कहानियाँ", "প্রতারণার গল্প"),
      detail: t(
        "Practise choices in fictional chats.",
        "काल्पनिक बातचीत में अपने फैसले आज़माएँ।",
        "কাল্পনিক কথোপকথনে সিদ্ধান্ত নেওয়ার অনুশীলন করুন।",
      ),
    },
    {
      icon: "lock",
      title: t("Private by default", "निजता पहले", "গোপনীয়তা আগে"),
      detail: t(
        "On-device checks. AI only with permission.",
        "डिवाइस पर जाँच। AI सिर्फ आपकी अनुमति से।",
        "ডিভাইসে যাচাই। AI শুধু আপনার অনুমতিতে।",
      ),
    },
  ];
  useEffect(() => {
    if (!user) return holdSharedMessageForSignIn();
  }, [Boolean(user)]);
  if (user) return children;
  return (
    <main id="main" className="signin-page" aria-labelledby="signin-heading">
      <section className="signin-hero" aria-labelledby="signin-heading">
        <Brand />
        <div className="signin-welcome">
          <h1 id="signin-heading">
            {t("Welcome to Sajag", "Sajag में आपका स्वागत है", "সজাগে স্বাগতম")}
          </h1>
          <p className="signin-lead">
            {t(
              "Start with your own verified email.",
              "अपने ईमेल की पुष्टि करके शुरू करें।",
              "আপনার নিজের ইমেল যাচাই করে শুরু করুন।",
            )}
          </p>
          <p className="signin-pitch">
            {t(
              "Check a message, learn how scams work, and practise your next step in English, Hindi or Bengali.",
              "संदेश जाँचें, ठगी के तरीके समझें और अगला कदम आज़माएँ — अंग्रेज़ी, हिन्दी या बंगाली में।",
              "বার্তা যাচাই করুন, প্রতারণার কৌশল বুঝুন, আর পরের পদক্ষেপের অনুশীলন করুন — ইংরেজি, হিন্দি বা বাংলায়।",
            )}
          </p>
        </div>
        <div className="signin-feature-grid">
          {features.map((feature) => (
            <div className="signin-feature" key={feature.icon}>
              <Emoji name={feature.icon} size={38} />
              <div>
                <strong>{feature.title}</strong>
                <p>{feature.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="signin-credit">
          {t(
            "Team FirstBest · Education only. No investment recommendations.",
            "Team FirstBest · सिर्फ शिक्षा। निवेश की सिफारिश नहीं।",
            "Team FirstBest · শুধু শিক্ষার জন্য। বিনিয়োগের পরামর্শ নয়।",
          )}
        </p>
      </section>
      <section
        className="signin-panel"
        aria-label={t(
          "Your Sajag sign-in",
          "आपका Sajag लॉगिन",
          "আপনার সজাগ সাইন ইন",
        )}
      >
        <div className="signin-panel-content">
          <div className="language-control signin-language">
            <label htmlFor="signin-language">
              {t("Choose language", "भाषा चुनें", "ভাষা বেছে নিন")}
            </label>
            <select
              id="signin-language"
              value={prefs.language}
              onChange={(event) =>
                updatePrefs({
                  language: event.target.value as "en" | "hi" | "bn",
                })
              }
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="bn">বাংলা</option>
            </select>
          </div>
          {loading ? (
            <p className="callout" role="status">
              {t(
                "Checking your verified session…",
                "आपके सत्यापित लॉगिन की जाँच हो रही है…",
                "আপনার যাচাই করা সেশন দেখা হচ্ছে…",
              )}
            </p>
          ) : (
            <>
              {issue && (
                <p className="callout" role="alert">
                  {issue === "unavailable"
                    ? t(
                        "Sign-in is temporarily unavailable. Please try again after the service is connected.",
                        "लॉगिन सेवा अभी उपलब्ध नहीं है। सेवा जुड़ने के बाद फिर कोशिश करें।",
                        "সাইন ইন এখন উপলব্ধ নয়। পরিষেবা যুক্ত হলে আবার চেষ্টা করুন।",
                      )
                    : issue === "unverified"
                      ? t(
                          "Your session needs verification. Sign in again with your email and Sajag password.",
                          "आपके लॉगिन की फिर पुष्टि चाहिए। ईमेल और Sajag पासवर्ड से दोबारा लॉगिन करें।",
                          "আপনার সেশন আবার যাচাই করতে হবে। ইমেল ও সজাগ পাসওয়ার্ড দিয়ে আবার সাইন ইন করুন।",
                        )
                      : t(
                          "We could not verify a signed-in account. Connect to the internet and try again.",
                          "लॉगिन खाते की पुष्टि नहीं हो सकी। इंटरनेट से जुड़कर फिर कोशिश करें।",
                          "সাইন ইন করা অ্যাকাউন্ট যাচাই করা যায়নি। ইন্টারনেটে যুক্ত হয়ে আবার চেষ্টা করুন।",
                        )}
                </p>
              )}
              <AccountCard required />
              {configured && issue && (
                <button
                  className="button secondary"
                  onClick={() => void retrySession()}
                >
                  {t(
                    "Check my session again",
                    "मेरा लॉगिन फिर जाँचें",
                    "আমার সেশন আবার দেখুন",
                  )}
                </button>
              )}
            </>
          )}
          <p className="small-text muted signin-note">
            {t(
              "Sign-in verifies access to your email. It does not verify an investment or a message sender. After signing in, cached lessons and the on-device check can work offline; online AI and cloud backup need a connection.",
              "लॉगिन आपके ईमेल तक पहुँच की पुष्टि करता है। यह निवेश या संदेश भेजने वाले की पुष्टि नहीं है। लॉगिन के बाद कैश किए पाठ और डिवाइस की जाँच ऑफलाइन चल सकते हैं; ऑनलाइन AI और क्लाउड बैकअप के लिए कनेक्शन चाहिए।",
              "সাইন ইন আপনার ইমেলে প্রবেশাধিকার যাচাই করে। এটি কোনও বিনিয়োগ বা বার্তার প্রেরককে যাচাই করে না। সাইন ইনের পরে ক্যাশ করা পাঠ ও ডিভাইসের যাচাই অফলাইনে চলতে পারে; অনলাইন AI ও ক্লাউড ব্যাকআপের জন্য সংযোগ প্রয়োজন।",
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
