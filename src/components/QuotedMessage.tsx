import { useId, useState } from "react";
import { maskOffensiveLanguage } from "../../shared/language-guard";
import { displayRedactions } from "../lib/redaction-labels";
import { useApp } from "../lib/preferences";

// The prop is the already privacy-masked analysis text, never the raw draft.
// Revealing a quotation only reveals its offensive words, not personal data.
export function QuotedMessage({
  text,
  lang,
  className = "",
}: {
  text: string;
  lang: string;
  className?: string;
}) {
  const { prefs } = useApp();
  const [revealedText, setRevealedText] = useState<string | null>(null);
  const quoteId = useId();
  const masked = maskOffensiveLanguage(text);
  const revealed = revealedText === text;
  const words = {
    en: {
      notice: "Offensive words are hidden.",
      shown: "Personal details remain masked.",
      show: "Show original wording",
      hide: "Hide offensive words",
    },
    hi: {
      notice: "अपशब्द छिपाए गए हैं।",
      shown: "निजी जानकारी अभी भी छिपी है।",
      show: "मूल शब्द दिखाएँ",
      hide: "अपशब्द छिपाएँ",
    },
    bn: {
      notice: "আপত্তিকর শব্দ আড়াল করা হয়েছে।",
      shown: "ব্যক্তিগত তথ্য এখনও আড়াল করা আছে।",
      show: "মূল শব্দ দেখুন",
      hide: "আপত্তিকর শব্দ আড়াল করুন",
    },
  }[prefs.language];
  return (
    <>
      <blockquote id={quoteId} className={className} lang={lang}>
        {displayRedactions(revealed ? text : masked.text, prefs.language)}
      </blockquote>
      {masked.hasMaskedWords && (
        <div className="quote-language-control">
          <span className="muted small-text">
            {revealed ? words.shown : words.notice}
          </span>
          <button
            type="button"
            className="text-link quote-toggle"
            aria-controls={quoteId}
            aria-expanded={revealed}
            onClick={() => setRevealedText(revealed ? null : text)}
          >
            {revealed ? words.hide : words.show}
          </button>
        </div>
      )}
    </>
  );
}
