import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  MessageSquareText,
  Phone,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Video,
} from "lucide-react";
import { scamStories } from "../../shared/scam-stories";
import type { ScamStory, ScamStoryStep } from "../../shared/types";
import { useApp } from "../lib/preferences";
import { Emoji } from "./Emoji";
import { Eyebrow, ListenButton, SourceList } from "./UI";

const channelIcons = {
  call: Phone,
  video: Video,
  sms: MessageSquareText,
  chat: MessageCircle,
  app: Smartphone,
};

function useNumber() {
  const { prefs } = useApp();
  return (n: number) =>
    n.toLocaleString(prefs.language === "bn" ? "bn-IN" : "en-IN");
}

// The story list, or the open story when the URL names one (?story=id).
export function ScamStories() {
  const { t, local } = useApp();
  const number = useNumber();
  const [params, setParams] = useSearchParams();
  const story = scamStories.find((s) => s.id === params.get("story"));
  if (story)
    return (
      <StoryPlayer key={story.id} story={story} onClose={() => setParams({})} />
    );
  return (
    <section className="story-picker" aria-labelledby="story-picker-title">
      <h2 id="story-picker-title">
        {t(
          "Pick a story and step through it",
          "एक कहानी चुनें और कदम-दर-कदम देखें",
          "একটা গল্প বেছে নিন, ধাপে ধাপে দেখুন",
        )}
      </h2>
      <div className="story-grid">
        {scamStories.map((s) => (
          <button
            key={s.id}
            type="button"
            className="story-card"
            onClick={() => setParams({ story: s.id })}
          >
            <Emoji name={s.emoji} size={46} />
            <span className="story-card-copy">
              <strong>{local(s.title)}</strong>
              <small>{local(s.subtitle)}</small>
              <span className="story-tag">
                {t(
                  `${s.steps.length} steps`,
                  `${s.steps.length} कदम`,
                  `${number(s.steps.length)}টি ধাপ`,
                )}
              </span>
            </span>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}

function channelLabel(
  channel: ScamStoryStep["channel"],
  t: (en: string, hi: string, bn: string) => string,
) {
  switch (channel) {
    case "call":
      return t("Phone call", "फ़ोन कॉल", "ফোন কল");
    case "video":
      return t("Video call", "वीडियो कॉल", "ভিডিও কল");
    case "sms":
      return t("SMS", "SMS", "এসএমএস");
    case "chat":
      return t("Chat message", "चैट संदेश", "চ্যাট মেসেজ");
    case "app":
      return t("App screen", "ऐप स्क्रीन", "অ্যাপের স্ক্রিন");
  }
}

function StoryPlayer({
  story,
  onClose,
}: {
  story: ScamStory;
  onClose: () => void;
}) {
  const { t, local } = useApp();
  const number = useNumber();
  // picks[i] is true when the safe reply was chosen at step i.
  const [picks, setPicks] = useState<boolean[]>([]);
  const [index, setIndex] = useState(0);
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const total = story.steps.length;
  const done = index >= total;
  const step = story.steps[Math.min(index, total - 1)];
  const answered = picks.length > index;
  const safeNow = picks[index];
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    (done || answered ? feedbackRef : questionRef).current?.focus();
  }, [answered, index, done]);

  const replies = step.safeFirst
    ? [
        { safe: true, label: step.safe },
        { safe: false, label: step.risky },
      ]
    : [
        { safe: false, label: step.risky },
        { safe: true, label: step.safe },
      ];
  const shown = story.steps.slice(0, done ? total : index + 1);

  return (
    <section className="story-player" aria-labelledby="story-title">
      <div className="story-player-head">
        <button type="button" className="text-link" onClick={onClose}>
          <ArrowLeft size={16} />
          {t("All stories", "सभी कहानियाँ", "সব গল্প")}
        </button>
        <div className="story-heading">
          <Emoji name={story.emoji} size={40} />
          <div>
            <h2 id="story-title">{local(story.title)}</h2>
            <p className="muted small-text">
              <span className="story-tag">
                {t("Fictional practice", "काल्पनिक अभ्यास", "কাল্পনিক অনুশীলন")}
              </span>{" "}
              {done
                ? t("Story complete", "कहानी पूरी", "গল্প শেষ")
                : t(
                    `Step ${index + 1} of ${total}`,
                    `कदम ${index + 1} / ${total}`,
                    `ধাপ ${number(index + 1)} / ${number(total)}`,
                  )}
            </p>
          </div>
        </div>
        <div
          className="story-progress"
          role="progressbar"
          aria-label={t("Story progress", "कहानी की प्रगति", "গল্পের অগ্রগতি")}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={picks.length}
        >
          {story.steps.map((_, i) => (
            <span
              key={i}
              className={
                i < picks.length
                  ? picks[i]
                    ? "safe"
                    : "risky"
                  : i === index
                    ? "current"
                    : ""
              }
            />
          ))}
        </div>
      </div>

      <ol
        className="story-chat"
        aria-label={t("Conversation", "बातचीत", "কথোপকথন")}
      >
        {shown.map((s, i) => {
          const Icon = channelIcons[s.channel];
          return (
            <li key={i}>
              <div className="story-bubble from-them">
                <span className="story-speaker">
                  <Icon size={14} aria-hidden="true" />
                  {channelLabel(s.channel, t)} · {local(s.speaker)}
                </span>
                <p>{local(s.message)}</p>
              </div>
              {i < picks.length && (
                <div
                  className={`story-bubble from-you ${picks[i] ? "safe" : "risky"}`}
                >
                  <span className="sr-only">
                    {t("Your reply:", "आपका जवाब:", "আপনার উত্তর:")}
                  </span>
                  <p>{local(picks[i] ? s.safe : s.risky)}</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {!done && !answered && (
        <div className="story-choices">
          <div className="story-choices-head">
            <h3 id="story-question" tabIndex={-1} ref={questionRef}>
              {t("What would you do?", "आप क्या करेंगे?", "আপনি কী করবেন?")}
            </h3>
            <ListenButton text={local(step.message)} small />
          </div>
          <div
            className="story-choice-list"
            role="group"
            aria-labelledby="story-question"
          >
            {replies.map((reply) => (
              <button
                key={String(reply.safe)}
                type="button"
                className="story-choice"
                onClick={() =>
                  setPicks((current) => [
                    ...current.slice(0, index),
                    reply.safe,
                  ])
                }
              >
                {local(reply.label)}
              </button>
            ))}
          </div>
        </div>
      )}

      {!done && answered && (
        <div className={`story-feedback ${safeNow ? "safe" : "risky"}`}>
          <h3 tabIndex={-1} ref={feedbackRef}>
            {safeNow ? (
              <ShieldCheck size={20} aria-hidden="true" />
            ) : (
              <ShieldAlert size={20} aria-hidden="true" />
            )}
            {safeNow
              ? t("Good call.", "सही फ़ैसला।", "ঠিক সিদ্ধান্ত।")
              : t(
                  "That is what the scammer wants.",
                  "ठग यही चाहता है।",
                  "প্রতারক ঠিক এটাই চায়।",
                )}
          </h3>
          <span className="story-tactic">
            {t("The trick:", "चाल:", "কৌশল:")} {local(step.tactic)}
          </span>
          <p>{local(step.reveal)}</p>
          {!safeNow && (
            <p className="story-safer">
              <strong>
                {t("A safer reply:", "बेहतर जवाब:", "নিরাপদ উত্তর:")}
              </strong>{" "}
              {local(step.safe)}
            </p>
          )}
          {safeNow && index < total - 1 && (
            <p className="muted small-text">
              {t(
                "In real life, ending contact here prevents further payments. If money has already gone, call your bank and 1930 straight away. The rest of the story is a “what if”, so you can recognise the next moves.",
                "असल ज़िंदगी में यहीं संपर्क तोड़ने से आगे के भुगतान रुक जाते हैं। अगर पैसे पहले ही चले गए हैं, तो तुरंत अपने बैंक और 1930 पर कॉल करें। आगे की कहानी एक “अगर ऐसा होता” है, ताकि आप अगली चालें पहचान सकें।",
                "বাস্তবে এখানে যোগাযোগ বন্ধ করলে আর টাকা যাওয়া আটকায়। টাকা যদি আগেই চলে গিয়ে থাকে, এখনই আপনার ব্যাংক আর ১৯৩০-এ ফোন করুন। গল্পের বাকিটা একটা ‘যদি এমন হতো’, যাতে আপনি পরের চালগুলোও চিনতে পারেন।",
              )}
            </p>
          )}
          <button
            type="button"
            className="button primary"
            onClick={() => setIndex((i) => i + 1)}
          >
            {index < total - 1
              ? t("Next message", "अगला संदेश", "পরের মেসেজ")
              : t(
                  "See what you learned",
                  "देखें, आपने क्या सीखा",
                  "দেখুন, কী শিখলেন",
                )}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}

      {done && (
        <div className="story-summary card">
          <Eyebrow>
            {t("WHAT YOU LEARNED", "आपने क्या सीखा", "আপনি কী শিখলেন")}
          </Eyebrow>
          <h3 tabIndex={-1} ref={feedbackRef}>
            {t(
              `You chose the safe reply at ${picks.filter(Boolean).length} of ${total} steps.`,
              `आपने ${total} में से ${picks.filter(Boolean).length} कदमों पर सुरक्षित जवाब चुना।`,
              `${number(total)}টি ধাপের মধ্যে ${number(picks.filter(Boolean).length)}টিতে আপনি নিরাপদ উত্তর বেছেছেন।`,
            )}
          </h3>
          <p>{local(story.summary)}</p>
          <div className="story-tactics">
            {story.steps.map((s, i) => (
              <span className="story-tag" key={i}>
                {number(i + 1)}. {local(s.tactic)}
              </span>
            ))}
          </div>
          <h4>{t("What to do", "क्या करें", "কী করবেন")}</h4>
          <ul className="story-actions">
            {story.actions.map((action, i) => (
              <li key={i}>
                <CheckCircle2 size={18} aria-hidden="true" />
                <span>{local(action)}</span>
              </li>
            ))}
          </ul>
          <div className="button-row">
            <Link className="button primary" to={`/learn/${story.lessonId}`}>
              {t("Read the lesson", "पाठ पढ़ें", "পাঠটা পড়ুন")}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setPicks([]);
                setIndex(0);
              }}
            >
              <RotateCcw size={16} aria-hidden="true" />
              {t("Replay", "फिर से खेलें", "আবার খেলুন")}
            </button>
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              {t("Another story", "दूसरी कहानी", "অন্য গল্প")}
            </button>
            <Link className="button secondary" to="/check">
              {t(
                "Check a real message",
                "असली संदेश जाँचें",
                "আসল মেসেজ যাচাই করুন",
              )}
            </Link>
          </div>
          <SourceList ids={story.sourceIds} compact />
        </div>
      )}
    </section>
  );
}
