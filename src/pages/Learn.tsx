import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  Lightbulb,
  Search,
  Volume2,
} from "lucide-react";
import { lessons } from "../../shared/content";
import { relatedConcepts } from "../../shared/engine";
import { scamLessons } from "../../shared/scam-lessons";
import { scamStories } from "../../shared/scam-stories";
import { useApp } from "../lib/preferences";
import { Emoji } from "../components/Emoji";
import { Eyebrow, LessonArt, ListenButton, SourceList } from "../components/UI";
const scamIds = new Set<string>(scamLessons.map((lesson) => lesson.id));
export function LearnPage() {
  const { t, local, completed, prefs } = useApp();
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<"all" | "scams" | "money">("all");
  const number = (n: number) =>
    n.toLocaleString(prefs.language === "bn" ? "bn-IN" : "en-IN");
  const ids = relatedConcepts(search);
  const inGroup = (id: string) =>
    group === "all" || (group === "scams") === scamIds.has(id);
  const filtered = lessons.filter(
    (l) =>
      inGroup(l.id) &&
      (!search.trim() ||
        ids.includes(l.id) ||
        `${local(l.title)} ${local(l.subtitle)} ${local(l.explanation)}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  const groups = [
    {
      id: "all" as const,
      label: t("All lessons", "सभी पाठ"),
      count: lessons.length,
    },
    {
      id: "scams" as const,
      label: t("Spot the scam", "ठगी पहचानें", "প্রতারণা চিনুন"),
      count: scamIds.size,
    },
    {
      id: "money" as const,
      label: t("Money basics", "पैसों की बुनियाद", "টাকার মূল কথা"),
      count: lessons.length - scamIds.size,
    },
  ];
  return (
    <div className="page learn-page">
      <div className="page-heading">
        <div>
          <Eyebrow>
            {t(
              "EVERYDAY EXAMPLES. EVERYDAY CONFIDENCE.",
              "रोज़मर्रा के उदाहरण। बेहतर समझ।",
            )}
          </Eyebrow>
          <h1>
            {t("Money words, made human.", "पैसों की बात, अपनी भाषा में।")}
          </h1>
          <p>
            {t(
              "Read, listen, then try a question. At your own pace.",
              "पढ़ें, सुनें और एक सवाल आज़माएँ। अपनी गति से।",
            )}
          </p>
        </div>
        <span className="quiet-pill">
          <BookOpen size={15} />
          {completed.length} / {lessons.length} {t("completed", "पूरे")}
        </span>
      </div>
      <div className="learning-banner">
        <form className="lesson-search" onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="lesson-search">
            {t("What would you like to understand?", "आप क्या समझना चाहेंगे?")}
          </label>
          <div className="search-input">
            <Search size={18} />
            <input
              id="lesson-search"
              placeholder={t(
                "Try “UPI PIN” or “What is NAV?”",
                "लिखें “UPI PIN” या “NAV क्या है?”",
                "লিখে দেখুন: ‘UPI PIN’ বা ‘NAV কী?’",
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("Clear search", "खोज मिटाएँ")}
            >
              {search ? "×" : <ArrowRight size={17} />}
            </button>
          </div>
          <span>
            {t(
              `${lessons.length} lessons · Available offline · English · हिन्दी · বাংলা`,
              `${lessons.length} पाठ · ऑफलाइन उपलब्ध · हिन्दी · English · বাংলা`,
              `${number(lessons.length)}টি পাঠ · অফলাইনে পাবেন · বাংলা · हिन्दी · English`,
            )}
          </span>
        </form>
      </div>
      <Link to="/simulate" className="story-banner">
        <Emoji name="warning" size={44} />
        <span>
          <strong>
            {t(
              "Practise spotting scams, step by step",
              "ठगी पहचानने का अभ्यास, कदम-दर-कदम",
              "প্রতারণা চেনার অনুশীলন, ধাপে ধাপে",
            )}
          </strong>
          <small>
            {t(
              "Walk through a fictional scam chat, choose your replies and see each trick revealed.",
              "एक काल्पनिक ठगी वाली बातचीत में जवाब चुनें और हर चाल का सच देखें।",
              "একটা কাল্পনিক প্রতারণার কথোপকথনে উত্তর বেছে নিন, আর প্রতিটি চালের আসল চেহারা দেখুন।",
            )}
          </small>
        </span>
        <ArrowRight size={19} aria-hidden="true" />
      </Link>
      <div
        className="lesson-filters"
        role="group"
        aria-label={t("Lesson topics", "पाठ के विषय", "পাঠের বিষয়")}
      >
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            aria-pressed={group === g.id}
            className={group === g.id ? "selected" : ""}
            onClick={() => setGroup(g.id)}
          >
            {g.label}
            <span className="filter-count">{number(g.count)}</span>
          </button>
        ))}
      </div>
      <div className="section-heading">
        <h2>
          {search
            ? t("Lessons for your question", "आपके सवाल से जुड़े पाठ")
            : t(
                "Start with a little curiosity.",
                "थोड़ी जिज्ञासा से शुरू करें।",
              )}
        </h2>
        <span className="muted small-text">
          {t("2–3 minutes each", "हर पाठ 2–3 मिनट")}
        </span>
      </div>
      <div className="lesson-grid all-lessons">
        {filtered.map((lesson) => (
          <Link
            to={`/learn/${lesson.id}`}
            className={`lesson-card ${lesson.color}`}
            key={lesson.id}
          >
            <div className="lesson-card-art">
              <LessonArt kind={lesson.id} />
              {completed.includes(lesson.id) ? (
                <span className="lesson-time completed-label">
                  <CheckCircle2 size={13} />
                  {t("Complete", "पूरा")}
                </span>
              ) : (
                <span className="lesson-time">
                  <Clock3 size={13} />
                  {lesson.minutes} {t("min", "मिनट")}
                </span>
              )}
            </div>
            <div className="lesson-card-copy">
              <small>{local(lesson.category)}</small>
              <h3>{local(lesson.title)}</h3>
              <p>{local(lesson.subtitle)}</p>
              <span className="lesson-card-footer">
                <span>
                  <Volume2 size={15} />
                  {t("Read or listen", "पढ़ें या सुनें")}
                </span>
                <ArrowUpRight size={19} />
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="card empty-state">
          <Search size={35} />
          <h2>
            {t(
              "We don’t have a lesson for that yet.",
              "इस पर अभी पाठ उपलब्ध नहीं है।",
            )}
          </h2>
          <p>
            {t(
              "Try UPI, KYC, job, trading app, risk, NAV or fees, or choose “All lessons”. Sajag cannot recommend stocks or products.",
              "UPI, KYC, नौकरी, ट्रेडिंग ऐप, जोखिम, NAV या शुल्क खोजें, या “सभी पाठ” चुनें। Sajag स्टॉक या प्रोडक्ट की सलाह नहीं दे सकता।",
              "UPI, KYC, চাকরি, ট্রেডিং অ্যাপ, ঝুঁকি, NAV বা খরচ লিখে খুঁজুন, অথবা ‘সব পাঠ’ বেছে নিন। Sajag কোনো শেয়ার বা প্রোডাক্টের পরামর্শ দিতে পারে না।",
            )}
          </p>
          <button
            className="button secondary"
            onClick={() => {
              setSearch("");
              setGroup("all");
            }}
          >
            {t("See all lessons", "सभी पाठ देखें")}
          </button>
        </div>
      )}
    </div>
  );
}
export function LessonPage() {
  const { id } = useParams();
  const { t, local, complete, completed } = useApp();
  const lesson = lessons.find((l) => l.id === id);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  if (!lesson)
    return (
      <div className="card empty-state">
        <h1>{t("Lesson not found", "पाठ नहीं मिला")}</h1>
        <Link className="button primary" to="/learn">
          {t("Browse lessons", "पाठ देखें")}
        </Link>
      </div>
    );
  const correct = selected === lesson.answer;
  const story = scamStories.find((s) => s.lessonId === lesson.id);
  return (
    <div className="page lesson-detail" key={lesson.id}>
      <Link to="/learn" className="text-link">
        <ArrowLeft size={16} />
        {t("All lessons", "सभी पाठ")}
      </Link>
      <header className={`lesson-detail-header ${lesson.color}`}>
        <div>
          <Eyebrow>{local(lesson.category)}</Eyebrow>
          <h1>{local(lesson.title)}</h1>
          <p>{local(lesson.subtitle)}</p>
          <div className="button-row">
            <span className="quiet-pill">
              <Clock3 size={14} />
              {lesson.minutes} {t("minute read", "मिनट में पढ़ें")}
            </span>
            <ListenButton
              text={`${local(lesson.title)}. ${local(lesson.analogy)} ${local(lesson.explanation)} ${local(lesson.takeaway)}`}
              small
            />
          </div>
        </div>
        <LessonArt kind={lesson.id} />
      </header>
      <div className="lesson-body">
        <article>
          <section className="analogy-box">
            <span className="icon-tile butter">
              <Lightbulb size={22} />
            </span>
            <div>
              <Eyebrow>{t("THINK OF IT THIS WAY", "ऐसे समझें")}</Eyebrow>
              <p>{local(lesson.analogy)}</p>
            </div>
          </section>
          <section className="lesson-explanation">
            <h2>
              {t("What that means for money", "पैसों के मामले में इसका मतलब")}
            </h2>
            <p>{local(lesson.explanation)}</p>
            <div className="takeaway">
              <CheckCircle2 size={21} />
              <strong>{local(lesson.takeaway)}</strong>
            </div>
          </section>
          <section className="card quiz-card">
            <Eyebrow>
              {t("A SMALL CHECK FOR UNDERSTANDING", "समझने का छोटा सवाल")}
            </Eyebrow>
            <h2>{local(lesson.question)}</h2>
            <div
              className="quiz-options"
              role="radiogroup"
              aria-label={local(lesson.question)}
            >
              {lesson.options.map((option, i) => (
                <label
                  key={i}
                  className={`quiz-option ${selected === i ? "selected" : ""} ${submitted && selected === i ? (correct ? "correct" : "incorrect") : ""}`}
                >
                  <input
                    type="radio"
                    name={`quiz-${id}`}
                    checked={selected === i}
                    onChange={() => {
                      setSelected(i);
                      setSubmitted(false);
                    }}
                  />
                  <span className="option-letter">
                    {String.fromCharCode(65 + i)}
                  </span>
                  {local(option)}
                </label>
              ))}
            </div>
            {submitted && (
              <div
                className={`quiz-feedback ${correct ? "correct" : ""}`}
                role="status"
              >
                <strong>
                  {correct
                    ? t(
                        "That’s it. A little wiser already.",
                        "सही। समझ में एक कदम आगे।",
                      )
                    : t("Take another look.", "एक बार फिर सोचें।")}
                </strong>
                <p>
                  {correct
                    ? local(lesson.feedback)
                    : t(
                        "Revisit the example above and try again. This is a place to learn at your own pace.",
                        "ऊपर का उदाहरण फिर देखें और दोबारा कोशिश करें। यहाँ अपनी गति से सीख सकते हैं।",
                      )}
                </p>
              </div>
            )}
            <button
              className="button primary"
              disabled={selected === null}
              onClick={() => {
                setSubmitted(true);
                if (correct) complete(lesson.id);
              }}
            >
              {submitted && correct ? <CheckCircle2 size={17} /> : null}
              {submitted && correct
                ? t("Understanding checked", "समझ की जाँच पूरी")
                : t("Check my understanding", "मेरी समझ जाँचें")}
            </button>
          </section>
        </article>
        <aside
          className="lesson-sidebar"
          aria-label={t(
            "Lesson references",
            "पाठ के संदर्भ",
            "পাঠের তথ্যসূত্র",
          )}
        >
          <div className="card">
            <h3>
              {t("Grounded in a real source.", "आधिकारिक स्रोत पर आधारित।")}
            </h3>
            <p className="muted">
              {t(
                "Our example is original. The underlying concept is linked here so you can explore further.",
                "उदाहरण हमारा है। अवधारणा का स्रोत यहाँ है ताकि आप और समझ सकें।",
              )}
            </p>
            <SourceList ids={lesson.sourceIds} compact />
            <small className="muted">
              {t(
                "Educational reference, not endorsement of Sajag.",
                "शैक्षिक संदर्भ, Sajag का समर्थन नहीं।",
              )}
            </small>
          </div>
          {lesson.id === "after-fraud" ? (
            <div className="gentle-note">
              <h3>
                {t(
                  "Need help right now?",
                  "अभी मदद चाहिए?",
                  "এখনই সাহায্য দরকার?",
                )}
              </h3>
              <p>
                {t(
                  "Call 1930 or report at cybercrime.gov.in. The Help page has the details and a call button.",
                  "1930 पर कॉल करें या cybercrime.gov.in पर रिपोर्ट करें। मदद पेज पर पूरी जानकारी और कॉल बटन है।",
                  "১৯৩০-এ ফোন করুন বা cybercrime.gov.in-এ রিপোর্ট করুন। সাহায্যের পাতায় বিস্তারিত তথ্য আর ফোন করার বোতাম আছে।",
                )}
              </p>
              <Link to="/help" className="button secondary">
                {t("Open Help", "मदद खोलें", "সাহায্যের পাতা খুলুন")}
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : scamIds.has(lesson.id) ? (
            <div className="gentle-note">
              <h3>
                {t(
                  "See it happen, safely.",
                  "इसे होते हुए देखें, सुरक्षित ढंग से।",
                  "নিরাপদে ঘটনাটা ঘটতে দেখুন।",
                )}
              </h3>
              <p>
                {t(
                  "Step through a fictional scam chat, choose your replies and see each trick revealed.",
                  "एक काल्पनिक ठगी वाली बातचीत में जवाब चुनें और हर चाल का सच देखें।",
                  "একটা কাল্পনিক প্রতারণার কথোপকথনে উত্তর বেছে নিন, আর প্রতিটি চালের আসল চেহারা দেখুন।",
                )}
              </p>
              <Link
                to={story ? `/simulate?story=${story.id}` : "/simulate"}
                className="button secondary"
              >
                {story
                  ? t(
                      "Walk through this scam",
                      "यह ठगी कदम-दर-कदम देखें",
                      "এই প্রতারণা ধাপে ধাপে দেখুন",
                    )
                  : t(
                      "Try a scam story",
                      "ठगी की एक कहानी आज़माएँ",
                      "একটা প্রতারণার গল্প দেখুন",
                    )}
                <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="gentle-note">
              <h3>
                {t(
                  "Feel the idea, safely.",
                  "इस विचार को सुरक्षित तरीके से समझें।",
                )}
              </h3>
              <p>
                {t(
                  "Explore how a fictional loss changes a balance. No real money, no predictions.",
                  "देखें कि काल्पनिक नुकसान राशि को कैसे बदलता है। असली पैसा या भविष्यवाणी नहीं।",
                )}
              </p>
              <Link to="/simulate?mode=money" className="button secondary">
                {t("Try the simulator", "सिम्युलेटर आज़माएँ")}
                <ArrowRight size={16} />
              </Link>
            </div>
          )}
          {completed.includes(lesson.id) && (
            <span className="completion-note">
              <CheckCircle2 size={19} />
              {t("Completed on this device", "इस डिवाइस पर पूरा किया")}
            </span>
          )}
        </aside>
      </div>
    </div>
  );
}
