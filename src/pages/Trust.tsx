import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  ExternalLink,
  Eye,
  HeartHandshake,
  LockKeyhole,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { sources } from "../../shared/content";
import { useApp } from "../lib/preferences";
import { Eyebrow, Outbound, SourceList } from "../components/UI";
import { useAiProvider } from "../lib/ai-provider";
import { AiDataNotice } from "../components/AiDataNotice";
export function TrustPage() {
  const { t, prefs } = useApp();
  const { provider } = useAiProvider(!prefs.lowData);
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <Eyebrow>
            {t("TRUST SHOULD BE EXPLAINED, NOT ASSUMED", "भरोसा समझकर करें")}
          </Eyebrow>
          <h1>
            {t("You deserve to see the source.", "स्रोत देखना आपका हक है।")}
          </h1>
          <p>
            {t(
              "What Sajag knows, how it knows it, and where its limits are.",
              "Sajag क्या जानता है, कैसे जानता है और उसकी सीमाएँ क्या हैं।",
            )}
          </p>
        </div>
        <ShieldCheck size={34} className="heading-icon" />
      </div>
      <div className="trust-grid">
        {[
          {
            icon: BookOpen,
            title: t("Grounded explanations", "संदर्भ-आधारित समझ"),
            text: t(
              "Our original lessons point to official educational resources. A citation supports a concept; it does not verify a forwarded message.",
              "हमारे पाठ आधिकारिक शैक्षिक स्रोतों से जुड़े हैं। संदर्भ अवधारणा समझाता है; फॉरवर्ड संदेश सत्यापित नहीं करता।",
            ),
          },
          {
            icon: Eye,
            title: t("Honest uncertainty", "अनिश्चितता साफ-साफ"),
            text: t(
              "No “safe” badge or made-up accuracy score. We show the cues found, the missing evidence and the things we have not checked.",
              "कोई “सुरक्षित” बैज या मनगढ़ंत सटीकता अंक नहीं। मिले संकेत, प्रमाण की कमी और जो नहीं जाँचा वह दिखाते हैं।",
            ),
          },
          {
            icon: LockKeyhole,
            title: t("Your information stays yours", "आपकी जानकारी, आपकी"),
            text: t(
              "Sajag requires a verified email account and a Sajag password. Confirm your email when signing up; normal sign-in uses your password. Saved checks are separated by account on this device and stay local unless you choose cloud backup. AI review is a separate, optional choice.",
              "Sajag के लिए सत्यापित ईमेल खाता और Sajag पासवर्ड ज़रूरी हैं। खाता बनाते समय ईमेल की पुष्टि करें; सामान्य लॉगिन पासवर्ड से होता है। इस डिवाइस पर सहेजी जाँच हर खाते के लिए अलग रहती है और आपकी पसंद से ही क्लाउड बैकअप होता है। AI समीक्षा अलग, वैकल्पिक विकल्प है।",
              "সজাগে যাচাই করা ইমেল অ্যাকাউন্ট ও সজাগ পাসওয়ার্ড দরকার। অ্যাকাউন্ট খোলার সময় ইমেল যাচাই করুন; সাধারণ সাইন ইনে পাসওয়ার্ড লাগে। এই ডিভাইসে সেভ করা যাচাই প্রতিটি অ্যাকাউন্টের জন্য আলাদা থাকে; আপনি বেছে নিলেই ক্লাউডে ব্যাকআপ হয়। AI পর্যালোচনা আলাদা, ঐচ্ছিক পছন্দ।",
            ),
          },
        ].map((item) => (
          <div className="card trust-card" key={item.title}>
            <span className="icon-tile sage">
              <item.icon size={23} />
            </span>
            <h2>{item.title}</h2>
            <p>{item.text}</p>
          </div>
        ))}
      </div>
      <section className="card trust-method">
        <div>
          <Eyebrow>{t("HOW A CHECK WORKS", "जाँच कैसे काम करती है")}</Eyebrow>
          <h2>
            {t(
              "A starting point for better questions.",
              "बेहतर सवालों की शुरुआत।",
            )}
          </h2>
        </div>
        <ol>
          <li>
            <strong>
              {t("Look at the actual words.", "असली शब्द देखें।")}
            </strong>
            <p>
              {t(
                "A small set of English, Hindi and Bengali rules finds phrases about certainty, urgency, promotion, borrowing and misleading NAV comparisons.",
                "अंग्रेज़ी, हिन्दी और बांग्ला के सीमित नियम निश्चितता, जल्दबाज़ी, प्रचार, उधार और NAV तुलना की भाषा पहचानते हैं।",
                "English, हिन्दी ও বাংলার কিছু নিয়ম দিয়ে নিশ্চিত লাভ, তাড়াহুড়ো, প্রচার, ধার আর বিভ্রান্তিকর NAV তুলনার ভাষা খোঁজা হয়।",
              )}
            </p>
          </li>
          <li>
            <strong>{t("Connect to an explanation.", "समझ से जोड़ें।")}</strong>
            <p>
              {t(
                "We link cues to reviewed explanations and official references. With your permission, relevant guidance passages are retrieved and sent to AI with the masked message. Accepted AI cues must quote the message and cite the selected guidance. They are labelled as possibly wrong and do not verify a claim.",
                "संकेत समीक्षित व्याख्याओं और आधिकारिक संदर्भों से जुड़ते हैं। आपकी अनुमति पर संबंधित मार्गदर्शन के अंश खोजकर निजी जानकारी छिपाए गए संदेश के साथ AI को दिए जाते हैं। स्वीकार किए गए AI संकेतों में संदेश के शब्द और चुने गए मार्गदर्शन का संदर्भ होना चाहिए। ये गलत हो सकते हैं और दावे का सत्यापन नहीं करते।",
                "সংকেতের সঙ্গে পর্যালোচিত ব্যাখ্যা ও সরকারি সূত্র জুড়ে দেওয়া হয়। অনুমতি দিলে প্রাসঙ্গিক নির্দেশনার অংশ খুঁজে ব্যক্তিগত তথ্য ঢাকা বার্তার সঙ্গে AI-কে দেওয়া হয়। গ্রহণযোগ্য AI সংকেতে বার্তার হুবহু শব্দ ও নির্বাচিত নির্দেশনার উল্লেখ থাকতে হবে। এগুলি ভুল হতে পারে এবং দাবির সত্যতা নিশ্চিত করে না।",
              )}
            </p>
          </li>
          <li>
            <strong>
              {t(
                "Three warning levels, no automatic safe verdict.",
                "तीन चेतावनी स्तर; अपने आप सुरक्षित होने की पुष्टि नहीं।",
                "সতর্কতার তিন স্তর; স্বয়ংক্রিয় নিরাপদ রায় নেই।",
              )}
            </strong>
            <p>
              {t(
                "Strong scam indicators need multiple distinct warning signs and a local rule match. AI alone cannot establish that strongest level. Potential scam indicators need further checks. Not enough evidence never means safe; no message-only check can exclude every possibility of fraud.",
                "धोखाधड़ी के प्रबल संकेत के लिए कई अलग चेतावनियाँ और डिवाइस के नियम से मिला संकेत ज़रूरी है। केवल AI सबसे प्रबल स्तर तय नहीं कर सकता। संभावित संकेतों की और जाँच चाहिए। पर्याप्त प्रमाण न मिलने का मतलब सुरक्षित नहीं; केवल संदेश से धोखाधड़ी की हर संभावना खारिज नहीं हो सकती।",
                "প্রতারণার জোরালো লক্ষণের জন্য একাধিক আলাদা সতর্কতা ও ডিভাইসের নিয়মে মেলা সংকেত দরকার। শুধু AI এই সর্বোচ্চ স্তর দিতে পারে না। সম্ভাব্য লক্ষণ আরও যাচাই করতে হবে। যথেষ্ট প্রমাণ না থাকা মানে নিরাপদ নয়; শুধু বার্তা দেখে প্রতারণার সব সম্ভাবনা বাদ দেওয়া যায় না।",
              )}
            </p>
          </li>
          <li>
            <strong>
              {t("Leave the unknowns visible.", "जो अज्ञात है, उसे साफ रखें।")}
            </strong>
            <p>
              {t(
                "We do not open submitted links, authenticate people, analyse images, verify live registration or guarantee correctness. Context and unfamiliar wording can be missed.",
                "हम भेजे गए लिंक नहीं खोलते, पहचान प्रमाणित नहीं करते, चित्र नहीं जाँचते और लाइव पंजीकरण सत्यापित नहीं करते। संदर्भ और अनजानी भाषा छूट सकती है।",
              )}
            </p>
          </li>
        </ol>
      </section>
      <section className="card trust-card">
        <h2>{t("Optional AI and your data", "वैकल्पिक AI और आपका डेटा")}</h2>
        <AiDataNotice provider={provider} />
      </section>
      <section className="sources-section">
        <div className="section-heading">
          <div>
            <Eyebrow>{t("THE REFERENCE LIBRARY", "संदर्भ संग्रह")}</Eyebrow>
            <h2>{t("Explore the original sources.", "मूल स्रोत देखें।")}</h2>
          </div>
          <span className="muted small-text">
            {t("Reviewed 2 October 2026", "2 अक्टूबर 2026 को समीक्षा")}
          </span>
        </div>
        <SourceList ids={sources.map((s) => s.id)} />
        <p className="muted small-text">
          {t(
            "External pages may change. Sajag is an independent hackathon prototype; these links do not imply endorsement by SEBI, NSDL or any public authority. Hindi and Bengali explanations are educational adaptations, not official translations. Bengali is a beta translation awaiting native-speaker review.",
            "बाहरी पेज बदल सकते हैं। Sajag स्वतंत्र हैकाथॉन प्रोटोटाइप है; इन लिंक से SEBI, NSDL या किसी सरकारी संस्था का समर्थन नहीं माना जाए। हिन्दी और बांग्ला व्याख्याएँ शैक्षिक प्रस्तुति हैं, आधिकारिक अनुवाद नहीं। बांग्ला बीटा है; मूल वक्ता की समीक्षा बाकी है।",
            "বাইরের পেজ বদলাতে পারে। সজাগ একটি স্বাধীন হ্যাকাথন প্রোটোটাইপ; এই লিংক মানে SEBI, NSDL বা সরকারি কোনো সংস্থা আমাদের সমর্থন করে না। হিন্দি ও বাংলা ব্যাখ্যা শেখার জন্য তৈরি, সরকারি অনুবাদ নয়। বাংলা বেটা; বাংলা ভাষাভাষীর রিভিউ বাকি।",
          )}
        </p>
      </section>
    </div>
  );
}
export function HelpPage() {
  const { t } = useApp();
  return (
    <div className="page help-page">
      <div className="page-heading">
        <div>
          <Eyebrow>
            {t(
              "YOU DON’T HAVE TO FIGURE IT OUT ALONE",
              "सब कुछ अकेले समझना ज़रूरी नहीं",
            )}
          </Eyebrow>
          <h1>{t("Find the right kind of help.", "सही तरह की मदद पाएँ।")}</h1>
          <p>
            {t(
              "Use official channels. Sajag does not submit complaints or promise recovery.",
              "आधिकारिक माध्यम अपनाएँ। Sajag शिकायत दर्ज नहीं करता और वापसी का वादा नहीं करता।",
            )}
          </p>
        </div>
      </div>
      <div className="card urgent-help">
        <span className="icon-tile peach">
          <Phone size={25} />
        </span>
        <div>
          <Eyebrow>
            {t(
              "IF MONEY HAS BEEN LOST TO CYBER FRAUD",
              "साइबर धोखाधड़ी में पैसा गया हो तो",
            )}
          </Eyebrow>
          <h2>
            {t(
              "Act promptly through official channels.",
              "आधिकारिक माध्यम से जल्दी संपर्क करें।",
            )}
          </h2>
          <p>
            {t(
              "Call 1930, contact your bank through its official helpline, and report at the National Cyber Crime Reporting Portal. Keep relevant evidence securely. Reporting does not guarantee recovery.",
              "1930 पर कॉल करें, अपने बैंक की आधिकारिक हेल्पलाइन पर संपर्क करें और राष्ट्रीय साइबर अपराध पोर्टल पर रिपोर्ट करें। प्रमाण सुरक्षित रखें। रिपोर्ट करने से पैसे वापस मिलने की गारंटी नहीं है।",
            )}
          </p>
          <div className="button-row">
            <a className="button primary" href="tel:1930">
              <Phone size={17} />
              {t("Call 1930", "1930 पर कॉल करें")}
            </a>
            <a
              className="button secondary"
              href="https://cybercrime.gov.in/"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("Official reporting portal", "आधिकारिक रिपोर्ट पोर्टल")}
              <ExternalLink size={16} />
            </a>
          </div>
        </div>
      </div>
      <div className="help-grid">
        <section className="card">
          <ShieldCheck size={25} />
          <h2>
            {t(
              "A securities-market grievance?",
              "प्रतिभूति बाज़ार से जुड़ी शिकायत?",
            )}
          </h2>
          <p>
            {t(
              "Raise the issue with the concerned institution first. If it remains unresolved, explore the current eligibility and process on SEBI SCORES.",
              "पहले संबंधित संस्था को समस्या बताएँ। समाधान न हो तो SEBI SCORES पर वर्तमान पात्रता और प्रक्रिया समझें।",
            )}
          </p>
          <Outbound href="https://scores.sebi.gov.in/">
            {t("Visit SEBI SCORES", "SEBI SCORES देखें")}
          </Outbound>
        </section>
        <section className="card">
          <HeartHandshake size={25} />
          <h2>{t("Helping a family member?", "परिवार की मदद कर रहे हैं?")}</h2>
          <p>
            {t(
              "Offer to read a message together. Ask what the source is, what remains unknown, and whether there is pressure to act. Avoid blame—anyone can encounter persuasive misinformation.",
              "संदेश साथ पढ़ें। स्रोत, अज्ञात बातें और जल्दबाज़ी के दबाव पर चर्चा करें। दोष न दें—कोई भी प्रभावशाली गलत जानकारी से सामना कर सकता है।",
            )}
          </p>
          <Link to="/check" className="text-link">
            {t("Examine a message together", "साथ मिलकर संदेश समझें")}
            <ArrowRight size={16} />
          </Link>
        </section>
      </div>
      <div className="privacy-note">
        <LockKeyhole size={17} />
        <span>
          {t(
            "Never share passwords, OTPs, account access or remote-control permissions with someone offering recovery. Sajag never asks for bank passwords, financial OTPs or remote-control access.",
            "पैसे वापस दिलाने वाले को पासवर्ड, OTP, खाते की पहुँच या रिमोट-कंट्रोल अनुमति न दें। Sajag बैंक पासवर्ड, वित्तीय OTP या रिमोट-कंट्रोल पहुँच नहीं माँगता।",
            "টাকা ফেরত পাইয়ে দেওয়ার কথা বলা কাউকে পাসওয়ার্ড, OTP, অ্যাকাউন্টের অ্যাক্সেস বা রিমোট-কন্ট্রোলের অনুমতি দেবেন না। সজাগ কখনো ব্যাংকের পাসওয়ার্ড, আর্থিক OTP বা রিমোট-কন্ট্রোল অ্যাক্সেস চায় না।",
          )}
        </span>
      </div>
    </div>
  );
}
