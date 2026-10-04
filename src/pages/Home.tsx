import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Bookmark,
  ChevronRight,
  Lightbulb,
  MessageSquareText,
  SearchCheck,
  ShieldCheck,
} from "lucide-react";
import { lessons, sampleClaims } from "../../shared/content";
import { useApp } from "../lib/preferences";
import { Emoji } from "../components/Emoji";
import { LessonArt } from "../components/UI";

export default function Home() {
  const { t, local, completed, saved } = useApp();
  const next =
    lessons.find((lesson) => !completed.includes(lesson.id)) ?? lessons[0];
  return (
    <div className="page dashboard-page">
      <section className="dashboard-hero">
        <div className="hero-welcome">
          <span className="hero-shield">
            <Emoji name="wave" size={29} />
          </span>
          <span>
            {t("A little wiser, every day", "हर दिन, थोड़ी बेहतर समझ")}
          </span>
        </div>
        <h1>{t("Understand before you act.", "कदम से पहले, समझें।")}</h1>
        <p>
          {t(
            "A money message feels confusing? Let’s take a closer look.",
            "पैसों का संदेश उलझा रहा है? आइए, उसे समझें।",
          )}
        </p>
        <Link className="button hero-cta" to="/check">
          <SearchCheck size={21} />
          {t("Check a message", "संदेश जाँचें")}
          <ArrowRight size={20} />
        </Link>
        <span className="hero-assurance">
          <ShieldCheck size={14} />
          {t(
            "Checks run on your device · Cloud only when you choose",
            "जाँच आपके डिवाइस पर · क्लाउड सिर्फ़ आपकी मर्ज़ी से",
            "যাচাই হয় আপনার ডিভাইসে · ক্লাউড শুধু আপনি চাইলে",
          )}
        </span>
        <ShieldCheck className="hero-watermark" aria-hidden="true" />
      </section>

      <div className="dashboard-stats" aria-label={t("Your space", "आपकी जगह")}>
        <Link to="/learn">
          <BookOpen size={18} />
          <strong>
            {completed.length}
            <small> / {lessons.length}</small>
          </strong>
          <span>{t("Lessons done", "पूरे हुए पाठ")}</span>
        </Link>
        <Link to="/saved">
          <Bookmark size={18} />
          <strong>{saved.length}</strong>
          <span>{t("Saved checks", "सहेजी जाँच")}</span>
        </Link>
        <div>
          <ShieldCheck size={18} />
          <strong>{t("On device", "डिवाइस पर")}</strong>
          <span>{t("Default checks", "सामान्य जाँच")}</span>
        </div>
      </div>

      <section
        className="dashboard-actions"
        aria-label={t("Explore Sajag", "सजग को जानें")}
      >
        <Link to="/learn" className="dashboard-action learn-action">
          <span className="action-icon">
            <Emoji name="learn" size={34} />
          </span>
          <div>
            <h2>{t("Learn simply", "आसानी से सीखें")}</h2>
            <p>
              {t("Money words, everyday examples", "पैसों की बात, आसान उदाहरण")}
            </p>
          </div>
          <ChevronRight size={20} />
        </Link>
        <Link to="/simulate" className="dashboard-action risk-action">
          <span className="action-icon">
            <Emoji name="warning" size={35} />
          </span>
          <div>
            <h2>
              {t(
                "Practise spotting scams",
                "ठगी पहचानने का अभ्यास",
                "প্রতারণা চেনার অনুশীলন",
              )}
            </h2>
            <p>
              {t(
                "Step through fictional scam chats. Zero real money.",
                "काल्पनिक ठगी वाली बातचीत, कदम-दर-कदम। असली पैसा नहीं।",
                "কাল্পনিক প্রতারণার কথোপকথন, ধাপে ধাপে। আসল টাকা নেই।",
              )}
            </p>
          </div>
          <ChevronRight size={20} />
        </Link>
      </section>

      <section className="card learning-progress-card">
        <div className="section-heading">
          <h2>{t("Your learning journey", "सीखने का सफर")}</h2>
          <span className="progress-fraction">
            {completed.length}/{lessons.length}
          </span>
        </div>
        <div
          className="progress-track"
          role="progressbar"
          aria-label={t("Lessons completed", "पूरे हुए पाठ")}
          aria-valuenow={completed.length}
          aria-valuemin={0}
          aria-valuemax={lessons.length}
        >
          <div
            style={{ width: `${(completed.length / lessons.length) * 100}%` }}
          />
        </div>
        <Link to={`/learn/${next.id}`} className="continue-lesson">
          <span className={`mini-lesson-art ${next.color}`}>
            <LessonArt kind={next.id} />
          </span>
          <span>
            <small>
              {completed.length === lessons.length
                ? t("Revisit a lesson", "पाठ फिर देखें")
                : t("Up next · 2–3 minutes", "अगला पाठ · 2–3 मिनट")}
            </small>
            <strong>{local(next.title)}</strong>
          </span>
          <ArrowRight size={20} />
        </Link>
      </section>

      <section className="dashboard-lessons">
        <div className="section-heading">
          <h2>{t("A little learning", "थोड़ा सीखें")}</h2>
          <Link className="text-link" to="/learn">
            {t("See all", "सभी देखें")}
            <ChevronRight size={17} />
          </Link>
        </div>
        <div className="home-lesson-list">
          {(["digital-arrest", "upi-pin"] as const).map((id) => {
            const lesson = lessons.find((l) => l.id === id)!;
            return (
              <Link
                className="compact-lesson card"
                to={`/learn/${id}`}
                key={id}
              >
                <span className={`mini-lesson-art ${lesson.color}`}>
                  <LessonArt kind={id} />
                </span>
                <span>
                  <small>
                    {lesson.minutes}{" "}
                    {t("min · Read or listen", "मिनट · पढ़ें या सुनें")}
                  </small>
                  <h3>{local(lesson.title)}</h3>
                  <p>{local(lesson.subtitle)}</p>
                </span>
                <ChevronRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>

      <Link
        to="/check"
        state={{ text: local(sampleClaims[0].text) }}
        className="dashboard-example"
      >
        <span className="icon-tile">
          <MessageSquareText size={23} />
        </span>
        <span>
          <small>
            {t("TRY A FICTIONAL MESSAGE", "काल्पनिक संदेश आज़माएँ")}
          </small>
          <strong>{local(sampleClaims[0].title)}</strong>
        </span>
        <ArrowRight size={20} />
      </Link>
      <div className="dashboard-tip">
        <Lightbulb size={20} />
        <p>
          {t(
            "A confident claim isn’t evidence. Ask: where can I check this?",
            "विश्वास से कही गई बात प्रमाण नहीं। पूछें: इसे कहाँ जाँचूँ?",
          )}
        </p>
      </div>
    </div>
  );
}
