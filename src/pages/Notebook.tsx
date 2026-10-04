import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Download,
  LockKeyhole,
  Trash2,
} from "lucide-react";
import { displayRedactions } from "../lib/redaction-labels";
import { useApp } from "../lib/preferences";
import { AnalysisResult } from "./Check";
import { Emoji } from "../components/Emoji";
import { Eyebrow, Modal } from "../components/UI";
import { assessRisk } from "../../shared/risk";
import { maskOffensiveLanguage } from "../../shared/language-guard";
export default function Notebook() {
  const { t, local, saved, remove, toast, prefs } = useApp();
  const [selected, setSelected] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selectedCheck = saved.find((x) => x.id === selected);
  function exportNotes() {
    const blob = new Blob(
      [
        JSON.stringify(
          { app: "Sajag", exportedAt: new Date().toISOString(), checks: saved },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sajag-notebook.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(
      t(
        "Notebook exported. Keep this file private.",
        "नोटबुक निर्यात हो गई। फ़ाइल निजी रखें।",
      ),
    );
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <Eyebrow>
            {t(
              "A PLACE FOR THE THINGS YOU’VE UNDERSTOOD",
              "जो समझा, उसे याद रखने की जगह",
            )}
          </Eyebrow>
          <h1>{t("Your clarity notebook.", "आपकी समझ की नोटबुक।")}</h1>
          <p>
            {t(
              "Only the checks you chose to keep. Stored on this device.",
              "केवल वे जाँच जो आपने सहेजी हैं। इस डिवाइस पर उपलब्ध।",
            )}
          </p>
        </div>
        {saved.length > 0 && (
          <button className="button secondary small" onClick={exportNotes}>
            <Download size={16} />
            {t("Export notebook", "नोटबुक निर्यात करें")}
          </button>
        )}
      </div>
      {selectedCheck ? (
        <>
          <button
            className="text-link back-link"
            onClick={() => setSelected(null)}
          >
            <ArrowLeft size={16} />
            {t("Back to notebook", "नोटबुक पर वापस")}
          </button>
          <AnalysisResult result={selectedCheck.analysis} />
        </>
      ) : saved.length ? (
        <>
          <div className="notebook-list">
            {saved.map((note) => (
              <article className="card notebook-card" key={note.id}>
                <span className="icon-tile sage">
                  <Bookmark size={22} />
                </span>
                <button
                  className="notebook-entry"
                  onClick={() => setSelected(note.id)}
                >
                  <span className="notebook-date">
                    {new Date(note.savedAt).toLocaleDateString(
                      prefs.language === "bn"
                        ? "bn-IN"
                        : prefs.language === "hi"
                          ? "hi-IN"
                          : "en-IN",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}
                  </span>
                  <h3>{local(assessRisk(note.analysis).title)}</h3>
                  <p>
                    {displayRedactions(
                      maskOffensiveLanguage(note.analysis.input).text,
                      prefs.language,
                    )}
                  </p>
                  <span className="text-link">
                    {t("Revisit this check", "यह जाँच फिर देखें")}
                    <ArrowRight size={15} />
                  </span>
                </button>
                <button
                  className="icon-button"
                  onClick={() => setDeleteId(note.id)}
                  aria-label={t("Delete saved check", "सहेजी जाँच मिटाएँ")}
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
          </div>
          <div className="privacy-note">
            <LockKeyhole size={16} />
            <span>
              {t(
                "Saved checks can include message text. Anyone with access to this browser may see them. Delete them whenever you like.",
                "सहेजी जाँच में संदेश का पाठ हो सकता है। इस ब्राउज़र तक पहुँच वाला व्यक्ति देख सकता है। कभी भी मिटा सकते हैं।",
              )}
            </span>
          </div>
        </>
      ) : (
        <div className="card empty-state notebook-empty">
          <span className="empty-illustration">
            <Emoji name="saved" size={58} />
          </span>
          <h2>
            {t(
              "A fresh page. A good place to start.",
              "नया पन्ना। अच्छी शुरुआत।",
            )}
          </h2>
          <p>
            {t(
              "Check a message and choose “Save to notebook” to keep the explanation. Nothing is saved automatically.",
              "संदेश जाँचें और “नोटबुक में सहेजें” चुनें। कुछ भी अपने आप सहेजा नहीं जाता।",
            )}
          </p>
          <Link to="/check" className="button primary">
            {t("Check your first claim", "पहला दावा जाँचें")}
            <ArrowRight size={17} />
          </Link>
        </div>
      )}
      {deleteId && (
        <Modal
          title={t("Remove this saved check?", "यह सहेजी जाँच हटाएँ?")}
          onClose={() => setDeleteId(null)}
        >
          <p>
            {t(
              "This removes the check from this device. Cloud backups, if you created any, are managed separately in preferences.",
              "इस डिवाइस से जाँच हटेगी। यदि क्लाउड बैकअप बनाया है, तो उसे सेटिंग में अलग से हटाएँ।",
            )}
          </p>
          <div className="button-row">
            <button
              className="button danger"
              onClick={() => {
                remove(deleteId);
                setDeleteId(null);
              }}
            >
              {t("Remove check", "जाँच हटाएँ")}
            </button>
            <button
              className="button secondary"
              onClick={() => setDeleteId(null)}
            >
              {t("Keep it", "रहने दें")}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
