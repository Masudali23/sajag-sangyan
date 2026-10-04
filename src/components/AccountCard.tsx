import { fitsCloudNotebook } from "../lib/notebook-size";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Cloud,
  Download,
  LogOut,
  Mail,
  Pencil,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { supabase, updateProfileName } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { PasswordAccess } from "./PasswordAccess";
import { useApp } from "../lib/preferences";
import { cleanProfileName, MAX_PROFILE_NAME, profileFor } from "../lib/profile";
import { analysisSchema } from "../../shared/validation";
import { Modal } from "./UI";

export function AccountCard({ required = false }: { required?: boolean }) {
  const { user, loading, refreshProfile } = useAuth();
  const {
    t,
    saved,
    restore,
    toast,
    prefs,
    legacyNotebookCount,
    legacyProgressCount,
    migrateLegacyNotebook,
  } = useApp();
  const profile = profileFor(user);
  const [confirmLegacy, setConfirmLegacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(true);
  const [validationAttempt, setValidationAttempt] = useState(0);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const displayNumber = (value: number) =>
    value.toLocaleString(
      prefs.language === "bn"
        ? "bn-IN"
        : prefs.language === "hi"
          ? "hi-IN"
          : "en-IN",
    );
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const liveUser = useRef(user?.id);
  liveUser.current = user?.id;
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    setEditing(false);
    setConfirmDelete(false);
    setNotice("");
    setNoticeIsError(true);
  }, [user?.id]);
  useEffect(() => {
    if (editing) nameInput.current?.focus();
  }, [editing]);

  useEffect(() => {
    if (notice)
      noticeRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
  }, [notice, validationAttempt]);

  const noticeNode = notice ? (
    <p
      ref={noticeRef}
      id="account-feedback"
      className="callout account-notice"
      role={noticeIsError ? "alert" : "status"}
    >
      {notice}
    </p>
  ) : null;

  async function saveName() {
    if (!supabase || !user || busy) return;
    const owner = user.id;
    setBusy(true);
    setNotice("");
    setNoticeIsError(true);
    try {
      await updateProfileName(
        cleanProfileName(name) || null,
        owner,
        () => mounted.current && liveUser.current === owner,
      );
      if (!mounted.current || liveUser.current !== owner) return;
      await refreshProfile();
      if (mounted.current && liveUser.current === owner) {
        setEditing(false);
        toast(t("Your name is updated.", "आपका नाम अपडेट हो गया।"));
      }
    } catch {
      if (mounted.current && liveUser.current === owner)
        setNotice(
          t(
            "Name could not be saved. Your previous profile is unchanged. Try again when connected.",
            "नाम सहेजा नहीं गया। पिछली प्रोफ़ाइल वैसी ही है। कनेक्शन मिलने पर फिर कोशिश करें।",
          ),
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function cloudAction(action: "upload" | "restore" | "delete") {
    if (!supabase || !user || busy) return;
    if (
      action === "upload" &&
      saved.some((check) => !fitsCloudNotebook(check.analysis))
    ) {
      setNotice(
        t(
          "One saved check exceeds the 64 KB cloud limit. Your notebook remains on this device; you can export it from My notebook.",
          "एक सहेजी जाँच 64 KB की क्लाउड सीमा से बड़ी है। नोटबुक इस डिवाइस पर है; उसे मेरी नोटबुक से निर्यात कर सकते हैं।",
          "একটি সেভ করা যাচাই ক্লাউডের ৬৪ KB সীমার চেয়ে বড়। নোটবুক এই ডিভাইসেই আছে; আমার নোটবুক থেকে ফাইল হিসেবে নামাতে পারেন।",
        ),
      );
      return;
    }
    const owner = user.id;
    setBusy(true);
    setNotice("");
    setNoticeIsError(true);
    try {
      if (action === "upload" && saved.length) {
        const { error } = await supabase.from("notebook_entries").upsert(
          saved.map((s) => ({
            id: s.id,
            user_id: owner,
            analysis: s.analysis,
            saved_at: s.savedAt,
          })),
          { onConflict: "user_id,id" },
        );
        if (error) throw error;
      }
      if (action === "restore") {
        const { data, error } = await supabase
          .from("notebook_entries")
          .select("id,analysis,saved_at")
          .eq("user_id", owner)
          .order("saved_at", { ascending: false })
          .limit(50);
        if (error) throw error;
        const checks = (data || []).map((row) => ({
          id: row.id as string,
          savedAt: row.saved_at as string,
          analysis: analysisSchema.parse(row.analysis),
        }));
        if (!mounted.current || liveUser.current !== owner) return;
        restore(checks);
      }
      if (action === "delete") {
        const { error } = await supabase
          .from("notebook_entries")
          .delete()
          .eq("user_id", owner);
        if (error) throw error;
      }
      if (!mounted.current || liveUser.current !== owner) return;
      toast(
        action === "upload"
          ? t(
              "Saved checks backed up to your account.",
              "सहेजी जाँच का बैकअप हो गया।",
            )
          : action === "restore"
            ? t(
                "Cloud checks restored to this device.",
                "क्लाउड जाँच इस डिवाइस पर आ गई।",
              )
            : t(
                "Your cloud notebook has been deleted. Your sign-in account remains.",
                "क्लाउड नोटबुक मिट गई। लॉगिन खाता बना रहेगा।",
              ),
      );
      setConfirmDelete(false);
    } catch {
      if (mounted.current && liveUser.current === owner)
        setNotice(
          t(
            "Cloud action failed. Your local notebook is unchanged. Check the connection and try again.",
            "क्लाउड प्रक्रिया पूरी नहीं हुई। स्थानीय नोटबुक पहले जैसी है। कनेक्शन जाँचकर फिर कोशिश करें।",
          ),
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function signOut() {
    if (!supabase || busy) return;
    setBusy(true);
    setNotice("");
    setNoticeIsError(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      toast(
        t(
          "Signed out on this device. Your notebook is kept for this account.",
          "इस डिवाइस से लॉगआउट हो गया। नोटबुक इसी खाते के लिए सुरक्षित रखी गई है।",
          "এই ডিভাইসে সাইন আউট হয়েছে। আপনার নোটবুক এই অ্যাকাউন্টের জন্য রাখা আছে।",
        ),
      );
    } catch {
      if (mounted.current)
        setNotice(
          t(
            "Sign out failed. Check the connection and try again.",
            "लॉगआउट नहीं हुआ। कनेक्शन जाँचकर फिर कोशिश करें।",
          ),
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="card account-card" aria-labelledby="account-title">
      <div className="account-heading">
        <span className="eyebrow">{t("YOUR SAJAG", "आपका सजग")}</span>
        <span className="quiet-pill">
          <ShieldCheck size={14} />
          {user
            ? t("Signed in", "लॉगिन है")
            : t(
                "Email verification required",
                "ईमेल की पुष्टि ज़रूरी है",
                "ইমেল যাচাই প্রয়োজন",
              )}
        </span>
      </div>
      <h2 id="account-title">
        {required
          ? t(
              "Sign up or sign in",
              "खाता बनाएँ या लॉगिन करें",
              "অ্যাকাউন্ট খুলুন বা সাইন ইন করুন",
            )
          : t("Account", "खाता")}
      </h2>
      {loading ? (
        <p role="status">
          {t("Checking your session…", "आपका लॉगिन देख रहे हैं…")}
        </p>
      ) : !supabase ? (
        <p>
          {t(
            "Sign-in is not connected yet. Sajag cannot open your account until its sign-in service is available.",
            "लॉगिन सेवा अभी जुड़ी नहीं है। सेवा उपलब्ध होने तक Sajag आपका खाता नहीं खोल सकता।",
            "সাইন ইন পরিষেবা এখনও যুক্ত নয়। পরিষেবা চালু না হওয়া পর্যন্ত সজাগ আপনার অ্যাকাউন্ট খুলতে পারবে না।",
          )}
        </p>
      ) : user ? (
        <>
          <div className="account-identity">
            <span className="profile-avatar large" aria-hidden="true">
              {profile.initials}
            </span>
            <div className="account-person">
              <h3>{profile.label || t("Your account", "आपका खाता")}</h3>
              <p className="account-email">
                <Mail size={15} />
                <span>{profile.email}</span>
              </p>
              <span className="small-text muted">
                {t(
                  "Visible only in your signed-in session",
                  "केवल आपके लॉगिन सत्र में दिखाई देता है",
                )}
              </span>
            </div>
            <button
              className="icon-button edit-profile"
              aria-label={t("Edit your name", "अपना नाम बदलें")}
              disabled={busy || editing}
              onClick={() => {
                setName(profile.name);
                setEditing(true);
                setNotice("");
                setNoticeIsError(true);
              }}
            >
              <Pencil size={18} />
            </button>
          </div>
          {editing && (
            <form
              className="profile-editor"
              onSubmit={(event) => {
                event.preventDefault();
                void saveName();
              }}
            >
              <label className="input-label" htmlFor="profile-name">
                {t("Name (optional)", "नाम (वैकल्पिक)")}
              </label>
              <input
                ref={nameInput}
                id="profile-name"
                className="account-input"
                maxLength={MAX_PROFILE_NAME}
                autoComplete="name"
                value={name}
                disabled={busy}
                onChange={(event) => setName(event.target.value)}
                aria-describedby="name-privacy"
              />
              <p id="name-privacy" className="small-text muted">
                {t(
                  "Your name is stored in your Supabase account. Leave it blank to use your email.",
                  "नाम आपके Supabase खाते में रहता है। ईमेल दिखाने के लिए इसे खाली छोड़ें।",
                )}
              </p>
              <div className="button-row">
                <button
                  className="button primary small"
                  disabled={busy}
                  type="submit"
                >
                  <Check size={16} />
                  {busy
                    ? t("Saving…", "सहेज रहे हैं…")
                    : t("Save name", "नाम सहेजें")}
                </button>
                <button
                  className="button ghost small"
                  disabled={busy}
                  type="button"
                  onClick={() => setEditing(false)}
                >
                  {t("Cancel", "रद्द करें")}
                </button>
              </div>
            </form>
          )}
          <details className="account-id">
            <summary>{t("Account ID", "खाता ID")}</summary>
            <code>{user.id}</code>
          </details>
          {(legacyNotebookCount > 0 || legacyProgressCount > 0) && (
            <div className="callout">
              <h3>
                {t(
                  "Older notebook on this device",
                  "इस डिवाइस की पुरानी नोटबुक",
                  "এই ডিভাইসের পুরোনো নোটবুক",
                )}
              </h3>
              <p>
                {t(
                  "Older saved checks and lesson progress have no account owner. They stay separate until you confirm they belong to you.",
                  "पुरानी सहेजी जाँच और पाठ प्रगति किसी खाते से जुड़ी नहीं हैं। आपके होने की पुष्टि तक वे अलग रहेंगी।",
                  "পুরোনো সেভ করা যাচাই ও পাঠের অগ্রগতি কোনও অ্যাকাউন্টের নয়। আপনার বলে নিশ্চিত না করা পর্যন্ত সেগুলি আলাদা থাকবে।",
                )}
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setConfirmLegacy(true)}
              >
                {t(
                  "Import my older notebook",
                  "मेरी पुरानी नोटबुक जोड़ें",
                  "আমার পুরোনো নোটবুক যোগ করুন",
                )}
              </button>
            </div>
          )}
          <div className="account-backup">
            <h3>
              {t(
                "Your notebook, backed up by you",
                "नोटबुक का बैकअप, आपकी मर्ज़ी से",
              )}
            </h3>
            <p>
              {t(
                "Backing up sends the saved messages on this device and their explanations to your private Supabase notebook. Nothing is uploaded automatically.",
                "बैकअप करने पर इस डिवाइस के सहेजे संदेश और व्याख्याएँ आपकी निजी Supabase नोटबुक में जाते हैं। कुछ भी अपने आप अपलोड नहीं होता।",
              )}
            </p>
            <div className="account-actions">
              <button
                className="button primary"
                disabled={busy || !saved.length}
                onClick={() => void cloudAction("upload")}
              >
                <Cloud size={17} />
                {t(
                  `Back up ${saved.length} saved checks`,
                  `${saved.length} सहेजी जाँच का बैकअप लें`,
                  `${saved.length}টি সেভ করা যাচাইয়ের ব্যাকআপ নিন`,
                )}
              </button>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void cloudAction("restore")}
              >
                <Download size={17} />
                {t("Restore my cloud notebook", "मेरी क्लाउड नोटबुक लाएँ")}
              </button>
            </div>
            <div className="account-secondary-actions">
              <button
                className="button ghost small"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={16} />
                {t("Delete cloud notebook", "क्लाउड नोटबुक मिटाएँ")}
              </button>
              <button
                className="button ghost small"
                disabled={busy}
                onClick={() => void signOut()}
              >
                <LogOut size={16} />
                {t("Sign out", "लॉगआउट")}
              </button>
            </div>
            <small className="muted">
              {t(
                "Saved checks stay under your account on this device. Another signed-in account has a separate notebook. Device storage is not encrypted.",
                "सहेजी जाँच इस डिवाइस पर आपके खाते में रहती हैं। दूसरे खाते की अलग नोटबुक होती है। डिवाइस का डेटा एन्क्रिप्ट नहीं है।",
                "এই ডিভাইসে সেভ করা যাচাই আপনার অ্যাকাউন্টে থাকে। অন্য অ্যাকাউন্টের আলাদা নোটবুক হয়। ডিভাইসের স্টোরেজ এনক্রিপ্ট করা নয়।",
              )}
            </small>
          </div>
        </>
      ) : (
        <PasswordAccess />
      )}
      {user && noticeNode}
      {confirmLegacy && (
        <Modal
          title={t(
            "Import this older notebook?",
            "पुरानी नोटबुक जोड़ें?",
            "এই পুরোনো নোটবুক যোগ করবেন?",
          )}
          onClose={() => setConfirmLegacy(false)}
        >
          <p>
            {t(
              `Only continue if these ${legacyNotebookCount} checks and ${legacyProgressCount} completed lessons are yours. They will be linked on this device to ${profile.email}. Nothing is uploaded.`,
              `केवल तभी जारी रखें जब ये ${legacyNotebookCount} जाँच और ${legacyProgressCount} पूरे पाठ आपके हों। इस डिवाइस पर ये ${profile.email} से जुड़ेंगे। कुछ अपलोड नहीं होगा।`,
              `এই ${displayNumber(legacyNotebookCount)}টি যাচাই ও ${displayNumber(legacyProgressCount)}টি সম্পূর্ণ পাঠ আপনার হলেই এগিয়ে যান। এই ডিভাইসে সেগুলি ${profile.email}-এর সঙ্গে যুক্ত হবে। কিছু আপলোড হবে না।`,
            )}
          </p>
          <div className="button-row">
            <button
              className="button primary"
              onClick={() => {
                try {
                  migrateLegacyNotebook();
                  setConfirmLegacy(false);
                  toast(
                    t(
                      "Older notebook imported for your account.",
                      "पुरानी नोटबुक आपके खाते में जोड़ दी गई।",
                      "পুরোনো নোটবুক আপনার অ্যাকাউন্টে যোগ হয়েছে।",
                    ),
                  );
                } catch {
                  setConfirmLegacy(false);
                  setNotice(
                    t(
                      "Import failed. Your older notebook has been kept.",
                      "जोड़ नहीं सके। पुरानी नोटबुक सुरक्षित रखी गई है।",
                      "যোগ করা যায়নি। পুরোনো নোটবুক রাখা হয়েছে।",
                    ),
                  );
                  setNoticeIsError(true);
                }
              }}
            >
              {t(
                "These are mine — import",
                "ये मेरे हैं — जोड़ें",
                "এগুলি আমার — যোগ করুন",
              )}
            </button>
            <button
              className="button secondary"
              onClick={() => setConfirmLegacy(false)}
            >
              {t("Keep separate", "अलग रखें", "আলাদা রাখুন")}
            </button>
          </div>
        </Modal>
      )}
      {confirmDelete && (
        <Modal
          title={t("Delete your cloud notebook?", "क्लाउड नोटबुक मिटाएँ?")}
          onClose={() => {
            if (!busy) setConfirmDelete(false);
          }}
        >
          <p>
            {t(
              "This deletes all saved checks in your cloud notebook. Your local notebook and sign-in account remain.",
              "क्लाउड नोटबुक की सभी जाँच मिटेंगी। स्थानीय नोटबुक और लॉगिन खाता बने रहेंगे।",
            )}
          </p>
          <div className="button-row">
            <button
              className="button danger"
              disabled={busy}
              onClick={() => void cloudAction("delete")}
            >
              {t("Delete this data", "यह डेटा मिटाएँ")}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
            >
              {t("Keep it", "रहने दें")}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
