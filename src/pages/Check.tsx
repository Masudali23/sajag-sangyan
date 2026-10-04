import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CircleAlert,
  Info,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  Mic,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { QuotedMessage } from "../components/QuotedMessage";
import { MAX_CLAIM_LENGTH } from "../../shared/engine";
import { analyzeMessage } from "../../shared/pattern-model";
import { assessRisk } from "../../shared/risk";
import { reviewedMerge } from "../../shared/ai-review";
import { analysisSchema } from "../../shared/validation";
import { lessons, sampleClaims } from "../../shared/content";
import type { ClaimAnalysis } from "../../shared/types";
import { useApp } from "../lib/preferences";
import { api, isApiAuthError } from "../lib/api";
import { useAuth } from "../lib/auth";
import { getAiProvider, useAiProvider } from "../lib/ai-provider";
import { AiDataNotice } from "../components/AiDataNotice";
import { listenForSpeech, cancelListening, VoiceError } from "../lib/voice";
import { voiceFeedback } from "../lib/voice-feedback";
import {
  peekSharedMessage,
  forgetSharedMessage,
  shareIntakeReady,
  getShareIntakeStatus,
} from "../lib/share-intake";
import { Emoji } from "../components/Emoji";
import { Eyebrow, ListenButton, Modal, SourceList } from "../components/UI";

function quoteLanguage(text: string): string {
  if (/गुंतव|मिळवा|हमी/.test(text)) return "mr";
  const total = (text.match(/\p{L}/gu) || []).length;
  for (const [language, script] of [
    ["hi", /\p{Script=Devanagari}/gu],
    ["bn", /\p{Script=Bengali}/gu],
    ["ta", /\p{Script=Tamil}/gu],
  ] as const)
    if ((text.match(script) || []).length > total / 2) return language;
  return "en";
}

export function AnalysisResult({
  result,
  onReset,
}: {
  result: ClaimAnalysis;
  onReset?: () => void;
}) {
  const { t, local, save, saved, prefs, updatePrefs } = useApp();
  const [tab, setTab] = useState<"findings" | "evidence">("findings");
  const [showMessage, setShowMessage] = useState(false);
  const tabId = useId();
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (onReset) resultHeading.current?.focus();
  }, [result.id]);
  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? "findings"
        : event.key === "End"
          ? "evidence"
          : tab === "findings"
            ? "evidence"
            : "findings";
    setTab(next);
    document.getElementById(`${tabId}-${next}`)?.focus();
  }
  const typeLabel = {
    promotional: t("Promotional cues", "प्रचार के संकेत"),
    educational: t("Explanatory wording", "समझाने वाली भाषा"),
    mixed: t("Education + promotion", "शिक्षा + प्रचार"),
    unclear: t("Purpose unclear", "उद्देश्य स्पष्ट नहीं"),
  };
  const paymentReminder =
    /credit[ -]?card|क्रेडिट\s*कार्ड|ক্রেডিট\s*কার্ড/i.test(result.input) &&
    /bill|statement|बिल|भुगतान\s*तारीख|বিল|স্টেটমেন্ট|পরিশোধের\s*তারিখ/i.test(
      result.input,
    );
  const reminderTitle = t(
    "This mentions a card bill",
    "इस संदेश में कार्ड के बिल की बात है",
  );
  const reminderStep = t(
    "Open your card issuer’s app yourself and compare the bill and due date with your statement. Do not rely on the message link to verify it.",
    "अपने कार्ड जारी करने वाली संस्था का ऐप खुद खोलें। बिल और भुगतान की तारीख अपने स्टेटमेंट से मिलाएँ। जाँच के लिए केवल संदेश के लिंक पर निर्भर न रहें।",
  );
  const related = paymentReminder
    ? []
    : lessons.filter((l) => result.lessonIds.includes(l.id));
  const isSaved = saved.some((s) => s.id === result.id);
  const risk = assessRisk(result);
  const readout = `${local(risk.title)}. ${local(risk.explanation)} ${paymentReminder ? `${reminderTitle}. ${reminderStep} ` : ""}${result.findings.map((f) => `${f.origin === "ai" ? t("AI noticed this; it may be wrong. ", "AI ने यह देखा; गलत हो सकता है। ") : ""}${local(f.title)}. ${local(f.explanation)}`).join(" ")} ${local(result.limitations)}`;
  return (
    <div className="analysis-result">
      <div className="result-top-actions">
        {onReset && (
          <button className="text-link" onClick={onReset}>
            <ArrowLeft size={16} />
            {t("Check another message", "दूसरा संदेश जाँचें")}
          </button>
        )}
        <div className="button-row">
          <ListenButton text={readout} small />
          <button
            className="button small secondary"
            onClick={() => save(result)}
          >
            {isSaved ? <Check size={16} /> : <Bookmark size={16} />}
            {isSaved
              ? t("Saved", "सहेजा गया")
              : t("Save to notebook", "नोटबुक में सहेजें")}
          </button>
        </div>
      </div>
      <div
        className={`result-banner ${result.status} risk-${risk.level}`}
        data-testid="risk-assessment"
        data-risk={risk.level}
      >
        <span className="result-symbol">
          {result.status === "attention" ? (
            <CircleAlert size={28} />
          ) : (
            <Info size={28} />
          )}
        </span>
        <div>
          <Eyebrow>
            {t(
              "WARNING ASSESSMENT · NOT A VERDICT",
              "चेतावनी का आकलन · अंतिम फैसला नहीं",
              "সতর্কতার মূল্যায়ন · চূড়ান্ত রায় নয়",
            )}
          </Eyebrow>
          <h2 ref={resultHeading} tabIndex={-1}>
            {local(risk.title)}
          </h2>
          <p className="risk-explanation">{local(risk.explanation)}</p>
          <p>
            {t(
              "The sender and claim are not verified. A missing warning does not mean safe.",
              "भेजने वाले और दावे का सत्यापन नहीं हुआ। चेतावनी न मिलने का मतलब सुरक्षित नहीं।",
            )}
          </p>
        </div>
      </div>
      {quoteLanguage(result.input) === "hi" && prefs.language === "en" && (
        <button
          className="language-suggestion"
          lang="hi"
          onClick={() => updatePrefs({ language: "hi" })}
        >
          हिन्दी में समझें <ArrowRight size={17} />
        </button>
      )}
      {quoteLanguage(result.input) === "bn" && prefs.language !== "bn" && (
        <button
          className="language-suggestion"
          lang="bn"
          onClick={() => updatePrefs({ language: "bn" })}
        >
          বাংলায় বুঝুন <ArrowRight size={17} />
        </button>
      )}
      {result.languageNotice && (
        <p role="status" className="privacy-note">
          {local(result.languageNotice)}
        </p>
      )}
      {paymentReminder && (
        <section
          className="payment-context"
          aria-label={t(
            "How to check this reminder",
            "इस संदेश की जाँच कैसे करें",
          )}
        >
          <h3>{reminderTitle}</h3>
          <p>{reminderStep}</p>
          <p>
            {t(
              "Sender, amount, date and any payment link remain unverified.",
              "भेजने वाले, राशि, तारीख और भुगतान लिंक का सत्यापन नहीं हुआ है।",
            )}
          </p>
        </section>
      )}
      <div className="result-grid">
        <div>
          <div className="card original-message">
            <div className="section-heading">
              <h3>
                <MessageSquareText size={17} />
                {t("The message you checked", "आपका जाँचा हुआ संदेश")}
              </h3>
              <span className="tiny-tag">
                {paymentReminder
                  ? t("Bill reminder wording", "बिल का संदेश")
                  : typeLabel[result.contentType]}
              </span>
            </div>
            <QuotedMessage
              key={result.id}
              className={showMessage ? "" : "quote-preview"}
              lang={quoteLanguage(result.input)}
              text={result.input}
            />
            {result.input.length > 150 && (
              <button
                className="text-link quote-toggle"
                aria-expanded={showMessage}
                onClick={() => setShowMessage(!showMessage)}
              >
                {showMessage
                  ? t("Show less", "कम दिखाएँ")
                  : t("Read full message", "पूरा संदेश पढ़ें")}
              </button>
            )}
            <span className="muted small-text">
              {t(
                "Some common personal identifiers are masked. Redaction may not catch everything.",
                "कुछ सामान्य निजी पहचानें छिपाई गई हैं। हर जानकारी छिपने की गारंटी नहीं है।",
              )}
            </span>
          </div>
          <div className="card findings-card">
            <div
              className="tab-bar"
              role="tablist"
              aria-label={t("Analysis details", "जाँच का विवरण")}
            >
              <button
                role="tab"
                id={`${tabId}-findings`}
                aria-controls={`${tabId}-panel`}
                aria-selected={tab === "findings"}
                tabIndex={tab === "findings" ? 0 : -1}
                onKeyDown={handleTabKeys}
                onClick={() => setTab("findings")}
              >
                {t("What to notice", "किन बातों पर ध्यान दें")}
                <span>{result.findings.length}</span>
              </button>
              <button
                role="tab"
                id={`${tabId}-evidence`}
                aria-controls={`${tabId}-panel`}
                aria-selected={tab === "evidence"}
                tabIndex={tab === "evidence" ? 0 : -1}
                onKeyDown={handleTabKeys}
                onClick={() => setTab("evidence")}
              >
                {t("Evidence & gaps", "प्रमाण और कमियाँ")}
              </button>
            </div>
            <div
              role="tabpanel"
              id={`${tabId}-panel`}
              aria-labelledby={`${tabId}-${tab}`}
              tabIndex={0}
            >
              {tab === "findings" ? (
                <>
                  {result.findings.length ? (
                    result.findings.map((finding, i) => (
                      <article className="finding" key={finding.id}>
                        <span className={`finding-number ${finding.severity}`}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <div>
                          <h3>{local(finding.title)}</h3>
                          {finding.origin === "ai" && (
                            <span className="tiny-tag ai-cue-tag">
                              {t(
                                "AI-noticed · may be wrong",
                                "AI ने देखा · गलत हो सकता है",
                              )}
                            </span>
                          )}
                          {finding.aiReview && (
                            <span className="tiny-tag ai-cue-tag">
                              {t(
                                "AI review: reads as a caution, report or routine notice, not a request · may be wrong",
                                "AI समीक्षा: यह चेतावनी, खबर या सामान्य सूचना लगती है, अनुरोध नहीं · गलत हो सकता है",
                                "AI পর্যালোচনা: এটি সতর্কবার্তা, খবর বা সাধারণ বিজ্ঞপ্তি মনে হচ্ছে, অনুরোধ নয় · ভুল হতে পারে",
                              )}
                            </span>
                          )}
                          <p>{local(finding.explanation)}</p>
                          <QuotedMessage
                            key={`${result.id}-${finding.id}`}
                            lang={quoteLanguage(finding.excerpt)}
                            text={finding.excerpt}
                          />
                          <SourceList ids={finding.sourceIds} compact />
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="no-findings">
                      <Info size={30} />
                      <h3>
                        {t(
                          "No specific pattern found in our small library.",
                          "हमारे सीमित संग्रह में कोई खास संकेत नहीं मिला।",
                        )}
                      </h3>
                      <p>
                        {t(
                          "This does not establish that the message is safe or correct. Names, numbers, images, dates and unsupported factual claims need independent checks.",
                          "इससे संदेश सुरक्षित या सही साबित नहीं होता। नाम, आँकड़े, चित्र, तारीख और तथ्यात्मक दावों की स्वतंत्र जाँच ज़रूरी है।",
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="evidence-panel">
                  {result.retrieval && (
                    <section
                      className="retrieved-evidence"
                      aria-label={t(
                        "Retrieved guidance",
                        "खोजा गया मार्गदर्शन",
                        "খুঁজে পাওয়া নির্দেশনা",
                      )}
                    >
                      <h3>
                        {t(
                          "Guidance retrieved for this message",
                          "इस संदेश के लिए खोजा गया मार्गदर्शन",
                          "এই বার্তার জন্য খুঁজে পাওয়া নির্দেশনা",
                        )}
                      </h3>
                      <p>
                        {result.retrieval.usedForAi
                          ? t(
                              "These selected passages were supplied to AI. They describe warning patterns; they do not verify this sender, link or offer.",
                              "ये चुने हुए अंश AI को दिए गए थे। ये चेतावनी के संकेत समझाते हैं; भेजने वाले, लिंक या ऑफर को सत्यापित नहीं करते।",
                              "এই বাছাই করা অংশগুলি AI-কে দেওয়া হয়েছিল। এগুলি সতর্কতার লক্ষণ বোঝায়; প্রেরক, লিঙ্ক বা প্রস্তাবের সত্যতা যাচাই করে না।",
                            )
                          : t(
                              "The AI review did not complete with grounded findings. Your on-device check remains available.",
                              "संदर्भों पर आधारित AI जाँच पूरी नहीं हुई। डिवाइस पर की गई जाँच उपलब्ध है।",
                              "সংশ্লিষ্ট নির্দেশনা দিয়ে AI যাচাই সম্পূর্ণ হয়নি। ডিভাইসে করা যাচাই পাওয়া যাচ্ছে।",
                            )}
                      </p>
                      {result.retrieval.evidence.map((evidence) => (
                        <article className="retrieved-card" key={evidence.id}>
                          <h4>{local(evidence.title)}</h4>
                          <p>{local(evidence.passage)}</p>
                          <small>
                            {t(
                              "Reviewed",
                              "समीक्षा की तारीख",
                              "পর্যালোচনার তারিখ",
                            )}
                            : {evidence.reviewedAt}
                          </small>
                          <SourceList ids={[evidence.sourceId]} compact />
                        </article>
                      ))}
                      <p className="small-text">
                        {t(
                          "Curated reference snapshots, not a live registry or a search of the sender’s website.",
                          "समीक्षित संदर्भों की प्रतियाँ; लाइव रजिस्ट्री या भेजने वाले की वेबसाइट की खोज नहीं।",
                          "পর্যালোচিত নির্দেশনার সংরক্ষিত অংশ; সরাসরি রেজিস্ট্রি বা প্রেরকের ওয়েবসাইটে খোঁজ নয়।",
                        )}
                      </p>
                    </section>
                  )}
                  <span className="status-label">
                    {t(
                      "Specific claim: not independently verified",
                      "विशिष्ट दावा: स्वतंत्र रूप से सत्यापित नहीं",
                    )}
                  </span>
                  <h3>
                    {t(
                      "What these references can tell you",
                      "ये संदर्भ क्या बताते हैं",
                    )}
                  </h3>
                  <p>
                    {t(
                      "The sources explain general financial concepts and warning patterns. They do not establish that a particular person, registration number, screenshot or promised return is genuine.",
                      "ये स्रोत सामान्य वित्तीय अवधारणाएँ और चेतावनी के संकेत समझाते हैं। ये किसी व्यक्ति, पंजीकरण नंबर, स्क्रीनशॉट या रिटर्न के वादे को असली साबित नहीं करते।",
                    )}
                  </p>
                  <SourceList
                    ids={
                      paymentReminder && result.findings.length === 0
                        ? ["rbi-kyc"]
                        : result.sourceIds.length
                          ? result.sourceIds
                          : ["sebi-investing"]
                    }
                  />
                  <h3>
                    {t(
                      "What still needs evidence",
                      "किसके लिए प्रमाण अभी चाहिए",
                    )}
                  </h3>
                  <ul className="plain-list">
                    <li>
                      {t(
                        "Who made the claim, and what can you verify independently?",
                        "दावा किसने किया और आप स्वतंत्र रूप से क्या जाँच सकते हैं?",
                      )}
                    </li>
                    <li>
                      {t(
                        "What official document supports this exact claim and date?",
                        "कौन-सा आधिकारिक दस्तावेज़ इसी दावे और तारीख का समर्थन करता है?",
                      )}
                    </li>
                    <li>
                      {t(
                        "What conditions, costs, conflicts or risks are missing?",
                        "कौन-सी शर्तें, खर्च, हितों के टकराव या जोखिम छिपे हैं?",
                      )}
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="limitations">
            <Info size={18} />
            <p>
              {local(result.limitations)}{" "}
              {result.aiAssisted &&
                t(
                  "AI reviewed possible cues; any added findings are labelled and may be wrong. It did not verify the claim.",
                  "AI ने संभावित संकेत देखे; जोड़ी गई बातों पर पहचान दी गई है और वे गलत हो सकती हैं। दावे का सत्यापन नहीं हुआ है।",
                )}
            </p>
          </div>
        </div>
        <aside
          className="result-side"
          aria-label={t(
            "Next learning steps",
            "सीखने के अगले कदम",
            "পরের শেখার ধাপ",
          )}
        >
          {paymentReminder ? (
            <div className="card next-step-card">
              <h3>
                {t("Use an independent source", "स्वतंत्र स्रोत से जाँचें")}
              </h3>
              <p>
                {t(
                  "For contact details, use the institution’s official website or the number printed on your card. The reference below is general fraud-prevention guidance; it does not authenticate this bill.",
                  "संपर्क के लिए संस्था की आधिकारिक वेबसाइट या कार्ड पर लिखा नंबर लें। नीचे धोखाधड़ी से बचने की सामान्य जानकारी है; इससे इस बिल की पुष्टि नहीं होती।",
                )}
              </p>
              <SourceList ids={["rbi-kyc"]} compact />
            </div>
          ) : (
            <div className="card next-step-card">
              <span className="icon-tile sage">
                <Sparkles size={22} />
              </span>
              <Eyebrow>
                {t("TURN THIS INTO UNDERSTANDING", "अब इसे समझ में बदलें")}
              </Eyebrow>
              <h3>{t("The idea behind the claim.", "दावे के पीछे की बात।")}</h3>
              <p>
                {t(
                  "A familiar example can make the next message easier to question.",
                  "एक आसान उदाहरण अगले संदेश पर सही सवाल पूछने में मदद करता है।",
                )}
              </p>
              {related.map((lesson) => (
                <Link
                  key={lesson.id}
                  to={`/learn/${lesson.id}`}
                  className="related-lesson"
                >
                  <span>
                    <strong>{local(lesson.title)}</strong>
                    <small>
                      {lesson.minutes} {t("minute lesson", "मिनट का पाठ")}
                    </small>
                  </span>
                  <ArrowRight size={16} />
                </Link>
              ))}
              <Link className="button primary full" to="/simulate?mode=money">
                {t("Experience a fictional loss", "काल्पनिक नुकसान समझें")}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
          <div className="gentle-note">
            <ShieldCheck size={20} />
            <strong>
              {t(
                "A pause is a useful next step.",
                "रुककर सोचना उपयोगी कदम है।",
              )}
            </strong>
            <p>
              {t(
                "You don’t need to act on a message to understand it. Ask for the source. Take your time.",
                "संदेश समझने के लिए उस पर अमल ज़रूरी नहीं। स्रोत माँगें। आराम से सोचें।",
              )}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CheckPage() {
  const { t, prefs, local, toast } = useApp();
  const { user, requireReverification } = useAuth();
  const location = useLocation();
  const [sharedMessage, setSharedMessage] = useState(peekSharedMessage);
  const [shareStatus, setShareStatus] = useState(getShareIntakeStatus);
  const [text, setText] = useState<string>(
    sharedMessage?.text ?? location.state?.text ?? "",
  );
  const [result, setResult] = useState<ClaimAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [useAI, setUseAI] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(false);
  const {
    provider,
    loading: providerLoading,
    setProvider,
  } = useAiProvider(aiExpanded && !prefs.lowData);
  const aiConsent = useRef(false);
  aiConsent.current = useAI && !prefs.lowData;
  useEffect(() => {
    setUseAI(false);
  }, [provider, prefs.lowData]);
  useEffect(
    () => () => {
      aiConsent.current = false;
    },
    [],
  );
  const [voiceModal, setVoiceModal] = useState(false);
  const [listening, setListening] = useState(false);
  const [voicePending, setVoicePending] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const voiceSession = useRef(0);
  const upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    void shareIntakeReady.then(() => {
      if (!active) return;
      const received = peekSharedMessage();
      setShareStatus(getShareIntakeStatus());
      if (received) {
        setSharedMessage(received);
        setText(received.text);
        setResult(null);
        setUseAI(false);
        setError("");
      }
      forgetSharedMessage();
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(
    () => () => {
      voiceSession.current++;
      void cancelListening();
    },
    [],
  );
  useEffect(() => {
    if (location.state?.text && !sharedMessage) {
      setText(location.state.text);
      setResult(null);
      setUseAI(false);
      aiConsent.current = false;
    }
  }, [location.state, sharedMessage]);
  async function analyze() {
    setError("");
    if (text.trim().length < 12) {
      setError(
        t(
          "Add at least 12 characters so there is something to examine.",
          "जाँचने के लिए कम से कम 12 अक्षर लिखें।",
        ),
      );
      return;
    }
    if (/^https?:\/\/\S+$/i.test(text.trim())) {
      setError(
        t(
          "Please paste the claim or transcript from that page. Sajag does not open or verify links.",
          "कृपया उस पेज का दावा या पाठ पेस्ट करें। Sajag लिंक खोलकर सत्यापित नहीं करता।",
        ),
      );
      return;
    }
    const localResult = analyzeMessage(text, prefs.language);
    setBusy(true);
    if (useAI && !prefs.lowData && provider) {
      try {
        const currentProvider = await getAiProvider();
        if (!aiConsent.current || currentProvider !== provider) {
          setUseAI(false);
          setProvider(currentProvider);
          throw new Error("Provider consent needs review");
        }
        // Consent applies to this submission, not a future message.
        aiConsent.current = false;
        setUseAI(false);
        const response = await api<{
          analysis: ClaimAnalysis;
          notice?: string;
        }>("analyze", {
          text: localResult.input,
          language: prefs.language,
          useAI: true,
          consent: true,
          consentProvider: provider,
        });
        setResult(
          reviewedMerge(localResult, analysisSchema.parse(response.analysis)),
        );
        if (response.notice)
          toast(
            t(
              response.notice,
              "AI जाँच उपलब्ध नहीं है। डिवाइस पर जाँच तैयार है।",
              "AI যাচাই পাওয়া যাচ্ছে না। ডিভাইসে করা যাচাই প্রস্তুত।",
            ),
          );
      } catch (failure) {
        if (isApiAuthError(failure)) {
          setResult(null);
          setBusy(false);
          if (failure.status === 401) requireReverification(user?.id);
          else
            setError(
              t(
                "Your sign-in could not be checked for this online request. Try again when the sign-in service is available, or turn off online AI for an on-device check in your verified session.",
                "इस ऑनलाइन जाँच के लिए लॉगिन की पुष्टि नहीं हो सकी। लॉगिन सेवा उपलब्ध होने पर फिर कोशिश करें या अपने सत्यापित लॉगिन में डिवाइस पर जाँच के लिए ऑनलाइन AI बंद करें।",
                "এই অনলাইন অনুরোধে সাইন ইন যাচাই করা যায়নি। পরিষেবা চালু হলে আবার চেষ্টা করুন, অথবা আপনার যাচাই করা সেশনে ডিভাইসে যাচাই করতে অনলাইন AI বন্ধ করুন।",
              ),
            );
          return;
        }
        setResult(localResult);
        toast(
          t(
            "Online matching is unavailable. Your on-device check is ready.",
            "ऑनलाइन मिलान उपलब्ध नहीं है। डिवाइस पर जाँच तैयार है।",
          ),
        );
      }
    } else setResult(localResult);
    setBusy(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function startVoice() {
    const session = ++voiceSession.current;
    setVoiceError("");
    setVoicePending(true);
    try {
      const transcript = await listenForSpeech({
        language:
          prefs.language === "bn"
            ? "bn-IN"
            : prefs.language === "hi"
              ? "hi-IN"
              : "en-IN",
        consent: true,
        onListening: () => {
          if (voiceSession.current === session) setListening(true);
        },
      });
      if (voiceSession.current !== session) return;
      setText((previous) =>
        `${previous} ${transcript}`
          .trim()
          .slice(0, MAX_CLAIM_LENGTH)
          .replace(/[\uD800-\uDBFF]$/, ""),
      );
      setVoiceModal(false);
      requestAnimationFrame(() =>
        document.getElementById("claim-text")?.focus(),
      );
    } catch (error) {
      if (
        voiceSession.current === session &&
        !(error instanceof VoiceError && error.code === "cancelled")
      ) {
        setVoiceError(local(voiceFeedback(error)));
      }
    } finally {
      if (voiceSession.current === session) {
        setListening(false);
        setVoicePending(false);
      }
    }
  }
  function closeVoice() {
    voiceSession.current++;
    void cancelListening();
    setListening(false);
    setVoicePending(false);
    setVoiceModal(false);
  }
  async function readFile(file?: File) {
    if (!file) return;
    if (file.size > 32000 || !/\.(txt|md)$/i.test(file.name)) {
      setError(
        t(
          "Choose a plain text (.txt or .md) file under 32 KB. Never upload account statements.",
          "32 KB से छोटी .txt या .md फ़ाइल चुनें। खाते का विवरण अपलोड न करें।",
        ),
      );
      return;
    }
    try {
      setText((await file.text()).slice(0, MAX_CLAIM_LENGTH));
      setError("");
    } catch {
      setError(t("We could not read that file.", "फ़ाइल नहीं पढ़ी जा सकी।"));
    }
  }
  return (
    <div className={`page check-page ${result ? "has-result" : ""}`}>
      <div className="page-heading">
        <div>
          <Eyebrow>
            {t("PAUSE. CHECK. UNDERSTAND.", "रुकें। जाँचें। समझें।")}
          </Eyebrow>
          <h1>{t("Check a message", "संदेश को समझें")}</h1>
          <p>
            {t(
              "Paste it. Spot the cues. See what needs evidence.",
              "संदेश पेस्ट करें। संकेत और प्रमाण की कमियाँ समझें।",
            )}
          </p>
        </div>
        <span className="quiet-pill">
          <LockKeyhole size={14} />
          {t(
            "Verified Sajag account",
            "सत्यापित Sajag खाता",
            "যাচাই করা সজাগ অ্যাকাউন্ট",
          )}
        </span>
      </div>
      {result ? (
        <AnalysisResult
          result={result}
          onReset={() => {
            setResult(null);
            setUseAI(false);
            setAiExpanded(false);
            aiConsent.current = false;
            requestAnimationFrame(() =>
              document.getElementById("claim-text")?.focus(),
            );
          }}
        />
      ) : (
        <div className="check-layout">
          <section className="card claim-input-card">
            {shareStatus === "unavailable" && (
              <p className="privacy-note" role="status">
                {t(
                  "The shared text could not be received. Please share again or paste it here.",
                  "साझा पाठ प्राप्त नहीं हो पाया। फिर से साझा करें या यहाँ पेस्ट करें।",
                )}
              </p>
            )}
            {sharedMessage && (
              <p className="privacy-note" role="status">
                {sharedMessage.truncated
                  ? t(
                      "Shared message ready. Only the first 6,000 characters fit. Review the text before checking; Sajag has not saved it to your notebook.",
                      "साझा संदेश तैयार है। पहले 6,000 अक्षर ही रखे गए हैं। जाँच से पहले पाठ देखें; सजग ने इसे आपकी नोटबुक में नहीं सहेजा है।",
                    )
                  : t(
                      "Shared message ready. Review the text before checking; Sajag has not saved it to your notebook.",
                      "साझा संदेश तैयार है। जाँच से पहले पाठ देखें; सजग ने इसे आपकी नोटबुक में नहीं सहेजा है।",
                    )}
              </p>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void analyze();
              }}
            >
              <label htmlFor="claim-text" className="input-label">
                {t("Paste or write a message", "संदेश पेस्ट करें या लिखें")}
              </label>
              <div className="claim-textarea-wrap">
                <textarea
                  id="claim-text"
                  autoComplete="off"
                  value={text}
                  maxLength={MAX_CLAIM_LENGTH}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t(
                    "Paste a WhatsApp forward, a caption or something you heard…",
                    "WhatsApp संदेश, कैप्शन या सुनी हुई बात यहाँ लिखें…",
                  )}
                  rows={5}
                  aria-describedby="claim-privacy"
                />
                {text && (
                  <button
                    type="button"
                    className="clear-input icon-button"
                    onClick={() => setText("")}
                    aria-label={t("Clear text", "पाठ मिटाएँ")}
                  >
                    <X size={16} />
                  </button>
                )}
                <span className="character-count">
                  {text.length.toLocaleString()} / 6,000
                </span>
              </div>
              <div className="input-tools">
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => {
                    setVoiceError("");
                    setVoiceModal(true);
                  }}
                >
                  <Mic size={16} />
                  {t("Speak it", "बोलकर लिखें")}
                </button>
                <button
                  type="button"
                  className="button ghost small"
                  onClick={() => upload.current?.click()}
                >
                  <Upload size={16} />
                  {t("Import text", "पाठ आयात करें")}
                </button>
                <input
                  ref={upload}
                  hidden
                  type="file"
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={(e) => void readFile(e.target.files?.[0])}
                />
                <span>
                  {t(
                    "English · हिन्दी · বাংলা",
                    "हिन्दी · English · বাংলা",
                    "বাংলা · हिन्दी · English",
                  )}
                </span>
              </div>
              <div id="claim-privacy" className="privacy-note">
                <LockKeyhole size={16} />
                <span>
                  {t(
                    "On-device by default. Saved only when you choose. Leave out personal and account details.",
                    "जाँच डिवाइस पर। आपके चुनने पर ही सहेजेंगे। निजी और खाते की जानकारी न लिखें।",
                  )}
                </span>
              </div>
              <details
                className="ai-options"
                onToggle={(event) => setAiExpanded(event.currentTarget.open)}
              >
                <summary>
                  {t(
                    "Optional: an AI second look",
                    "वैकल्पिक: AI से एक और जाँच",
                  )}
                </summary>
                {providerLoading ? (
                  <p role="status">
                    {t(
                      "Checking the AI provider…",
                      "AI प्रदाता की जानकारी देख रहे हैं…",
                    )}
                  </p>
                ) : (
                  <AiDataNotice provider={provider} />
                )}
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={useAI}
                    disabled={
                      prefs.lowData || !provider || providerLoading || busy
                    }
                    onChange={(e) => setUseAI(e.target.checked)}
                  />
                  <span>
                    {t(
                      `I agree to send this masked message to ${provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI" : "the confirmed provider"} under these terms.`,
                      `मैं इन शर्तों पर निजी जानकारी छिपाया हुआ संदेश ${provider === "gemini" ? "Google Gemini" : provider === "openai" ? "OpenAI" : "पुष्ट प्रदाता"} को भेजने की सहमति देता/देती हूँ।`,
                      `এই শর্তে ব্যক্তিগত তথ্য ঢেকে দেওয়া বার্তাটি ${provider === "gemini" ? "Google Gemini-কে" : provider === "openai" ? "OpenAI-কে" : "নিশ্চিত করা পরিষেবাকে"} পাঠাতে আমি রাজি।`,
                    )}
                  </span>
                </label>
                {prefs.lowData && (
                  <small>
                    {t(
                      "Turn off low-data mode in preferences to use online matching.",
                      "ऑनलाइन मिलान के लिए सेटिंग में कम-डेटा मोड बंद करें।",
                    )}
                  </small>
                )}
              </details>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                disabled={busy}
                className="button primary full analyze-button"
                type="submit"
              >
                {busy ? (
                  <LoaderCircle className="spin" size={18} />
                ) : (
                  <SearchCheck size={19} />
                )}
                {busy
                  ? t("Finding a little clarity…", "समझने की कोशिश जारी…")
                  : t("Check this message", "संदेश जाँचें")}
                {!busy && <ArrowRight size={18} />}
              </button>
            </form>
          </section>
          <aside className="check-side">
            <section className="card">
              <Eyebrow>
                {t("NOT SURE WHERE TO START?", "कहाँ से शुरू करें?")}
              </Eyebrow>
              <h2>{t("Try an example.", "एक उदाहरण आज़माएँ।")}</h2>
              <p>
                {t(
                  "These are made-up messages inspired by common patterns.",
                  "ये सामान्य संकेतों पर आधारित काल्पनिक संदेश हैं।",
                )}
              </p>
              <div className="sample-list">
                {sampleClaims.map((sample, i) => (
                  <button key={i} onClick={() => setText(local(sample.text))}>
                    <span className={`sample-platform platform-${i}`}>
                      <Emoji name={["phone", "promo", "nav"][i]} size={30} />
                    </span>
                    <span>
                      <small>{sample.platform}</small>
                      <strong>{local(sample.title)}</strong>
                    </span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </section>
            <div className="gentle-note">
              <ShieldCheck size={23} />
              <h3>
                {t(
                  "Clarity, without a false sense of certainty.",
                  "समझ, बिना झूठी निश्चितता के।",
                )}
              </h3>
              <p>
                {t(
                  "Sajag points out language patterns and explains relevant concepts. It cannot establish whether a person is trustworthy or a claim is true.",
                  "Sajag भाषा के संकेत और संबंधित अवधारणाएँ समझाता है। यह किसी की विश्वसनीयता या दावे की सच्चाई स्थापित नहीं कर सकता।",
                )}
              </p>
              <Link className="text-link" to="/sources">
                {t("How we use evidence", "हम प्रमाण कैसे इस्तेमाल करते हैं")}
                <ArrowRight size={15} />
              </Link>
            </div>
          </aside>
        </div>
      )}
      {voiceModal && (
        <Modal
          title={t("Say it in your own words.", "अपने शब्दों में बोलें।")}
          onClose={closeVoice}
        >
          <p>
            {t(
              "Your device or browser speech service may process audio online. Sajag does not record or save it. Allow microphone access when asked. Avoid personal details; review the words before checking.",
              "डिवाइस या ब्राउज़र की स्पीच सेवा आवाज़ ऑनलाइन प्रोसेस कर सकती है। Sajag इसे रिकॉर्ड या सहेजता नहीं। पूछे जाने पर माइक्रोफोन की अनुमति दें। निजी बातें न बोलें; जाँच से पहले पाठ देखें।",
            )}
          </p>
          {voiceError && (
            <p className="form-error" role="alert">
              {voiceError}
            </p>
          )}
          {voicePending && (
            <div className="voice-listening" role="status">
              <Mic size={22} />
              {listening
                ? t("Listening… speak now", "सुन रहे हैं… अब बोलें")
                : t(
                    "Starting… allow microphone access if asked",
                    "शुरू हो रहा है… पूछे जाने पर माइक्रोफोन की अनुमति दें",
                  )}
            </div>
          )}
          <button
            className="button primary full"
            onClick={
              voicePending
                ? () => void cancelListening()
                : () => void startVoice()
            }
          >
            <Mic size={18} />
            {voicePending
              ? t("Cancel listening", "सुनना रद्द करें")
              : t("Allow voice input and start", "बोलकर लिखना शुरू करें")}
          </button>
          <p className="muted small-text">
            {t(
              "A permission prompt appears only if access has not already been granted or blocked. Read-aloud does not need a microphone.",
              "अनुमति पहले से मिली या बंद न हो, तभी अनुमति का संदेश दिखता है। पढ़कर सुनाने के लिए माइक्रोफोन नहीं चाहिए।",
            )}
          </p>
        </Modal>
      )}
    </div>
  );
}
