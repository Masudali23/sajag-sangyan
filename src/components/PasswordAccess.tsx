import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Cloud, Mail } from "lucide-react";
import { useAuth } from "../lib/auth";
import { useApp } from "../lib/preferences";
import {
  supabase,
  createPasswordRecoveryClient,
  requireEmailConfirmation,
} from "../lib/supabase";
import { hasConfirmedEmail } from "../lib/auth-verification";
import { validEmailCode } from "../lib/profile";
import { getRecoveryLinkTokens } from "../lib/password-recovery-link";
import {
  validatePassword,
  signUpWithPassword,
  signInWithPassword,
  resendSignup,
  sendPasswordRecovery,
  completePasswordRecovery,
  completePasswordRecoverySession,
} from "../lib/password-auth";

type Mode = "signin" | "signup" | "recover";

export function PasswordAccess() {
  const { t, prefs, toast } = useApp();
  const { passwordRecovery, passwordRecoverySession, finishPasswordRecovery } =
    useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [invalid, setInvalid] = useState("");
  const emailInput = useRef<HTMLInputElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const mounted = useRef(true);
  const recoveryToken = useRef<string | undefined>(undefined);
  const authRevision = useRef(0);
  const recoveryActive = useRef(passwordRecovery);
  recoveryActive.current = passwordRecovery;
  const number = (value: number) =>
    value.toLocaleString(
      prefs.language === "bn"
        ? "bn-IN"
        : prefs.language === "hi"
          ? "hi-IN"
          : "en-IN",
    );
  const redirect = Capacitor.isNativePlatform()
    ? "https://sajag-ashen.vercel.app/settings"
    : `${window.location.origin}/settings`;

  useEffect(() => {
    mounted.current = true;
    const subscription = supabase?.auth.onAuthStateChange((_event, session) => {
      authRevision.current++;
      recoveryToken.current = session?.access_token;
    });
    return () => {
      mounted.current = false;
      subscription?.data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (passwordRecovery) {
      setMode("recover");
      setSentTo("");
      setPassword("");
      setConfirmation("");
      setCode("");
    }
  }, [passwordRecovery]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    if (sentTo) codeInput.current?.focus();
  }, [sentTo]);
  useEffect(() => {
    if (notice)
      noticeRef.current?.scrollIntoView({
        block: "center",
        behavior: "instant",
      });
  }, [notice]);

  function message(text: string, error = true, field = "") {
    setNotice(text);
    setNoticeIsError(error);
    setInvalid(field);
  }
  function clearSecrets() {
    setPassword("");
    setConfirmation("");
    setCode("");
  }
  function choose(next: Mode) {
    if (busy) return;
    setMode(next);
    setSentTo("");
    clearSecrets();
    message("", false);
  }
  function validAddress() {
    const address = email.trim();
    if (
      !address ||
      address.length > 254 ||
      !emailInput.current?.validity.valid
    ) {
      message(
        t(
          "Enter a valid email address, such as name@example.com.",
          "सही ईमेल पता लिखें, जैसे name@example.com।",
          "সঠিক ইমেল ঠিকানা লিখুন, যেমন name@example.com।",
        ),
        true,
        "email",
      );
      emailInput.current?.focus({ preventScroll: true });
      return null;
    }
    return address;
  }
  function validNewPassword() {
    const problem = validatePassword(password, confirmation);
    if (!problem) return true;
    message(
      problem === "too-short"
        ? t(
            "Use at least 8 characters for your Sajag password.",
            "Sajag पासवर्ड में कम से कम 8 अक्षर रखें।",
            "সজাগ পাসওয়ার্ডে অন্তত ৮টি অক্ষর রাখুন।",
          )
        : t(
            "The passwords do not match. Enter the same password twice.",
            "पासवर्ड मेल नहीं खाते। दोनों जगह एक ही पासवर्ड लिखें।",
            "পাসওয়ার্ড মেলেনি। দুই জায়গায় একই পাসওয়ার্ড লিখুন।",
          ),
      true,
      problem === "too-short" ? "password" : "confirmation",
    );
    passwordInput.current?.focus({ preventScroll: true });
    return false;
  }
  function emailSent(address: string) {
    setSentTo(address);
    setCooldown(60);
    clearSecrets();
    message(
      t(
        "If this email can receive Sajag verification emails, check its inbox and spam folder.",
        "यदि इस ईमेल पर Sajag के पुष्टि ईमेल मिल सकते हैं, तो इनबॉक्स और स्पैम फ़ोल्डर देखें।",
        "এই ইমেলে সজাগের যাচাইয়ের ইমেল পাওয়া গেলে ইনবক্স ও স্প্যাম ফোল্ডার দেখুন।",
      ),
      false,
    );
  }
  async function submitAccount() {
    if (!supabase || busy) return;
    const address = validAddress();
    if (!address) return;
    if (mode !== "signin" && cooldown) return;
    if (mode === "signup" && !validNewPassword()) return;
    if (mode === "signin" && !password) {
      message(
        t(
          "Enter your Sajag password.",
          "अपना Sajag पासवर्ड लिखें।",
          "আপনার সজাগ পাসওয়ার্ড লিখুন।",
        ),
        true,
        "password",
      );
      passwordInput.current?.focus();
      return;
    }
    setBusy(true);
    message("", false);
    try {
      if (mode === "recover") {
        await sendPasswordRecovery(
          createPasswordRecoveryClient,
          address,
          `${redirect}?recovery=1`,
        );
        if (mounted.current) emailSent(address);
      } else if (mode === "signup") {
        await requireEmailConfirmation();
        if (!mounted.current) return;
        const result = await signUpWithPassword(
          supabase,
          address,
          password,
          confirmation,
          redirect,
        );
        if (!mounted.current) return;
        if (result.status === "confirmation-required") emailSent(address);
        else clearSecrets();
      } else {
        await signInWithPassword(supabase, address, password);
        if (mounted.current) clearSecrets();
      }
    } catch (error) {
      if (!mounted.current) return;
      clearSecrets();
      if (
        mode === "signin" &&
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "email_not_confirmed"
      ) {
        setMode("signup");
        setSentTo(address);
        setCooldown(0);
        message(
          t(
            "Verify your email before signing in. Enter your confirmation code, or choose Resend code.",
            "लॉगिन से पहले ईमेल की पुष्टि करें। पुष्टि कोड लिखें या कोड फिर भेजें चुनें।",
            "সাইন ইনের আগে ইমেল যাচাই করুন। নিশ্চিতকরণের কোড লিখুন বা আবার কোড পাঠান বেছে নিন।",
          ),
        );
      } else
        message(
          mode === "signin"
            ? t(
                "Could not sign in. Check your email and password, or use Set or reset password if you previously used email codes.",
                "लॉगिन नहीं हो सका। ईमेल और पासवर्ड जाँचें। पहले ईमेल कोड इस्तेमाल करते थे तो पासवर्ड बनाएँ या बदलें चुनें।",
                "সাইন ইন হয়নি। ইমেল ও পাসওয়ার্ড দেখুন। আগে ইমেল কোড ব্যবহার করলে পাসওয়ার্ড সেট বা রিসেট করুন।",
              )
            : t(
                "We could not send the email or create the account. Check your connection and try again later. Your password must meet the account service's requirements.",
                "ईमेल भेजने या खाता बनाने में समस्या हुई। कनेक्शन जाँचें और बाद में कोशिश करें। पासवर्ड को खाता सेवा की शर्तें पूरी करनी होंगी।",
                "ইমেল পাঠানো বা অ্যাকাউন্ট তৈরি করা যায়নি। সংযোগ দেখুন ও পরে চেষ্টা করুন। পাসওয়ার্ডকে অ্যাকাউন্ট পরিষেবার শর্ত মানতে হবে।",
              ),
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function resend() {
    if (!supabase || busy || cooldown || !sentTo) return;
    setBusy(true);
    message("", false);
    try {
      if (mode === "recover")
        await sendPasswordRecovery(
          createPasswordRecoveryClient,
          sentTo,
          `${redirect}?recovery=1`,
        );
      else await resendSignup(supabase, sentTo, redirect);
      if (mounted.current) emailSent(sentTo);
    } catch {
      if (mounted.current)
        message(
          t(
            "We could not send the email. Check your connection and try again later.",
            "ईमेल नहीं भेज सके। कनेक्शन जाँचें और कुछ देर बाद कोशिश करें।",
            "ইমেল পাঠানো যায়নি। সংযোগ দেখুন ও কিছুক্ষণ পরে চেষ্টা করুন।",
          ),
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function verify() {
    if (!supabase || busy || (!sentTo && !passwordRecovery)) return;
    const recovering = mode === "recover";
    if (!passwordRecovery && !validEmailCode(code)) {
      message(
        t(
          "Enter the 6–10 digit Sajag code from your email.",
          "ईमेल में आया 6–10 अंकों का Sajag कोड लिखें।",
          "ইমেলে আসা ৬–১০ অঙ্কের সজাগ কোড লিখুন।",
        ),
        true,
        "code",
      );
      return;
    }
    if (recovering && !validNewPassword()) return;
    setBusy(true);
    message("", false);
    try {
      if (recovering) {
        const revision = authRevision.current;
        const current = () =>
          mounted.current && authRevision.current === revision;
        if (passwordRecovery) {
          const before = await supabase.auth.getSession();
          if (before.error || !current()) throw new Error("Account changed");
          const expectedMainToken = before.data.session?.access_token || null;
          const link = getRecoveryLinkTokens();
          if (link) {
            const isolated = createPasswordRecoveryClient();
            try {
              const { data, error } = await isolated.auth.setSession(link);
              if (error || !data.session)
                throw new Error("Recovery session missing");
              await completePasswordRecoverySession(
                createPasswordRecoveryClient,
                data.session,
                password,
                confirmation,
                () =>
                  current() &&
                  recoveryActive.current &&
                  getRecoveryLinkTokens() === link,
              );
            } finally {
              await isolated.auth.dispose();
            }
            if (!current()) throw new Error("Account changed");
            await finishPasswordRecovery(expectedMainToken);
          } else {
            const { data, error } = await supabase.auth.getSession();
            if (
              error ||
              !data.session ||
              !passwordRecoverySession ||
              data.session.access_token !== passwordRecoverySession.access_token
            )
              throw new Error("Recovery session missing");
            const snapshot = data.session;
            recoveryToken.current ||= snapshot.access_token;
            await completePasswordRecoverySession(
              createPasswordRecoveryClient,
              snapshot,
              password,
              confirmation,
              () =>
                current() &&
                recoveryActive.current &&
                recoveryToken.current === snapshot.access_token,
            );
            await finishPasswordRecovery(snapshot.access_token);
          }
        } else
          await completePasswordRecovery(
            createPasswordRecoveryClient,
            sentTo,
            code,
            password,
            confirmation,
            current,
          );
        if (!mounted.current) return;
        setEmail(sentTo || email);
        setMode("signin");
        setSentTo("");
        clearSecrets();
        message(
          t(
            "Password updated. Sign in with your email and new password.",
            "पासवर्ड बदल गया। ईमेल और नए पासवर्ड से लॉगिन करें।",
            "পাসওয়ার্ড বদলেছে। ইমেল ও নতুন পাসওয়ার্ড দিয়ে সাইন ইন করুন।",
          ),
          false,
        );
      } else {
        const { data, error } = await supabase.auth.verifyOtp({
          email: sentTo,
          token: code.trim(),
          type: "email",
        });
        if (
          error ||
          !data.session ||
          !hasConfirmedEmail(data.user) ||
          data.session.user.id !== data.user.id ||
          data.user.email?.toLowerCase() !== sentTo.toLowerCase()
        )
          throw error || new Error("No verified session");
        if (mounted.current) {
          clearSecrets();
          toast(
            t(
              "Email verified. You're signed in to Sajag.",
              "ईमेल की पुष्टि हुई। आप Sajag में लॉगिन हो गए हैं।",
              "ইমেল যাচাই হয়েছে। আপনি সজাগে সাইন ইন করেছেন।",
            ),
          );
        }
      }
    } catch {
      if (mounted.current) {
        clearSecrets();
        message(
          t(
            "That code or reset could not be verified. Check the latest email and enter your details again, or request a new code after a short wait.",
            "कोड या पासवर्ड बदलने की पुष्टि नहीं हो सकी। सबसे नया ईमेल देखें और जानकारी फिर लिखें, या थोड़ी देर बाद नया कोड मँगाएँ।",
            "কোড বা রিসেট যাচাই করা যায়নি। নতুন ইমেল দেখে আবার তথ্য লিখুন বা কিছুক্ষণ পরে নতুন কোড চান।",
          ),
        );
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function cancelRecovery() {
    if (busy) return;
    setBusy(true);
    try {
      const revision = authRevision.current;
      const before = await supabase!.auth.getSession();
      if (before.error || !mounted.current || authRevision.current !== revision)
        throw new Error("Account changed");
      await finishPasswordRecovery(before.data.session?.access_token || null);
      if (!mounted.current) return;
      setMode("signin");
      setSentTo("");
      clearSecrets();
      message("", false);
    } catch {
      if (mounted.current)
        message(
          t(
            "Could not close recovery. Try again when connected.",
            "पासवर्ड बदलने की प्रक्रिया बंद नहीं हुई। कनेक्शन मिलने पर फिर कोशिश करें।",
            "রিসেট বন্ধ করা যায়নি। সংযোগ পেলে আবার চেষ্টা করুন।",
          ),
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const feedback = notice ? (
    <p
      id="account-feedback"
      ref={noticeRef}
      className="callout account-notice"
      role={noticeIsError ? "alert" : "status"}
    >
      {notice}
    </p>
  ) : null;
  const passwordFields = (reset = false) => (
    <>
      <label
        className="input-label"
        htmlFor={reset ? "new-password" : "password"}
      >
        {reset
          ? t("New Sajag password", "नया Sajag पासवर्ड", "নতুন সজাগ পাসওয়ার্ড")
          : t("Sajag password", "Sajag पासवर्ड", "সজাগ পাসওয়ার্ড")}
      </label>
      <input
        ref={passwordInput}
        id={reset ? "new-password" : "password"}
        className="account-input"
        type="password"
        autoComplete={mode === "signin" ? "current-password" : "new-password"}
        required
        disabled={busy}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        aria-describedby="password-purpose account-feedback"
        aria-invalid={invalid === "password"}
      />
      {(mode === "signup" || reset) && (
        <>
          <label
            className="input-label"
            htmlFor={reset ? "confirm-new-password" : "confirm-password"}
          >
            {t(
              "Confirm password",
              "पासवर्ड फिर लिखें",
              "পাসওয়ার্ড নিশ্চিত করুন",
            )}
          </label>
          <input
            id={reset ? "confirm-new-password" : "confirm-password"}
            className="account-input"
            type="password"
            autoComplete="new-password"
            required
            disabled={busy}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            aria-describedby="password-purpose account-feedback"
            aria-invalid={invalid === "confirmation"}
          />
        </>
      )}
      <p id="password-purpose" className="small-text muted">
        {mode === "signin"
          ? t(
              "Use the password you created for Sajag. No email code is needed for normal sign-in.",
              "Sajag के लिए बनाया पासवर्ड इस्तेमाल करें। सामान्य लॉगिन में ईमेल कोड नहीं चाहिए।",
              "সজাগের জন্য তৈরি পাসওয়ার্ড ব্যবহার করুন। সাধারণ সাইন ইনে ইমেল কোড লাগে না।",
            )
          : t(
              "Use at least 8 characters and a password you do not use for your bank or other accounts.",
              "कम से कम 8 अक्षर रखें। बैंक या दूसरे खाते का पासवर्ड इस्तेमाल न करें।",
              "অন্তত ৮টি অক্ষর রাখুন। ব্যাংক বা অন্য অ্যাকাউন্টের পাসওয়ার্ড ব্যবহার করবেন না।",
            )}
      </p>
    </>
  );
  const codeStep = Boolean(sentTo || passwordRecovery);
  const lostRecovery =
    passwordRecovery && !getRecoveryLinkTokens() && !passwordRecoverySession;
  return (
    <div className="account-signin">
      <div className="account-intro">
        <span className="profile-avatar large" aria-hidden="true">
          <Cloud size={27} />
        </span>
        <h3>
          {t(
            "A home for your learning",
            "आपकी सीख, आपके साथ",
            "আপনার শেখার ঠিকানা",
          )}
        </h3>
        <p>
          {t(
            "Create a password and verify your email once. Then sign in with your email and password. Your saved checks stay with your account on this device; cloud backup is your choice.",
            "पासवर्ड बनाएँ और पहली बार ईमेल की पुष्टि करें। फिर ईमेल और पासवर्ड से लॉगिन करें। सहेजी जाँच इस डिवाइस पर आपके खाते में रहती हैं; क्लाउड बैकअप आपकी मर्ज़ी है।",
            "পাসওয়ার্ড তৈরি করে প্রথমবার ইমেল যাচাই করুন। পরে ইমেল ও পাসওয়ার্ড দিয়ে সাইন ইন করুন। সেভ করা যাচাই এই ডিভাইসে আপনার অ্যাকাউন্টে থাকে; ক্লাউড ব্যাকআপ আপনার পছন্দ।",
          )}
        </p>
      </div>
      {!codeStep && (
        <div
          className="button-row"
          role="group"
          aria-label={t("Account access", "खाता प्रवेश", "অ্যাকাউন্টে প্রবেশ")}
        >
          <button
            type="button"
            className={`button ${mode === "signin" ? "primary" : "secondary"}`}
            aria-pressed={mode === "signin"}
            disabled={busy}
            onClick={() => choose("signin")}
          >
            {t("Sign in", "लॉगिन करें", "সাইন ইন করুন")}
          </button>
          <button
            type="button"
            className={`button ${mode === "signup" ? "primary" : "secondary"}`}
            aria-pressed={mode === "signup"}
            disabled={busy}
            onClick={() => choose("signup")}
          >
            {t("Sign up", "खाता बनाएँ", "অ্যাকাউন্ট খুলুন")}
          </button>
        </div>
      )}
      {!codeStep ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submitAccount();
          }}
        >
          <label className="input-label" htmlFor="email">
            {t("Your email", "आपका ईमेल", "আপনার ইমেল")}
          </label>
          <div className="search-input">
            <Mail size={17} />
            <input
              ref={emailInput}
              id="email"
              type="email"
              maxLength={254}
              required
              autoComplete="email"
              disabled={busy}
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
              aria-describedby={
                notice ? "email-purpose account-feedback" : "email-purpose"
              }
              aria-invalid={invalid === "email"}
            />
          </div>
          <p id="email-purpose" className="small-text muted">
            {mode === "recover"
              ? t(
                  "Previously used email codes, or forgot your password? Verify your email to set a password. Your account and saved checks stay the same.",
                  "पहले ईमेल कोड इस्तेमाल करते थे या पासवर्ड भूल गए? पासवर्ड बनाने के लिए ईमेल की पुष्टि करें। खाता और सहेजी जाँच वही रहेंगी।",
                  "আগে ইমেল কোড ব্যবহার করতেন বা পাসওয়ার্ড ভুলেছেন? পাসওয়ার্ড সেট করতে ইমেল যাচাই করুন। অ্যাকাউন্ট ও সেভ করা যাচাই একই থাকবে।",
                )
              : t(
                  "Your email and Sajag password go to Supabase Auth for account access. Only first-time sign-up needs email confirmation.",
                  "खाते में प्रवेश के लिए ईमेल और Sajag पासवर्ड Supabase Auth को जाते हैं। पहली बार खाता बनाने पर ईमेल की पुष्टि चाहिए।",
                  "অ্যাকাউন্টে প্রবেশের জন্য ইমেল ও সজাগ পাসওয়ার্ড Supabase Auth-এ যায়। প্রথমবার অ্যাকাউন্ট খুললে ইমেল যাচাই লাগে।",
                )}
          </p>
          {mode !== "recover" && passwordFields()}
          {feedback}
          <button
            className="button primary full"
            type="submit"
            disabled={busy || (mode !== "signin" && cooldown > 0)}
          >
            {busy
              ? t("Please wait…", "कृपया रुकें…", "অপেক্ষা করুন…")
              : mode !== "signin" && cooldown
                ? t(
                    `Try again in ${cooldown}s`,
                    `${cooldown} सेकंड बाद कोशिश करें`,
                    `${number(cooldown)} সেকেন্ড পরে চেষ্টা করুন`,
                  )
                : mode === "signup"
                  ? t(
                      "Create account",
                      "खाता बनाएँ और कोड भेजें",
                      "অ্যাকাউন্ট তৈরি করুন",
                    )
                  : mode === "recover"
                    ? t(
                        "Send reset code",
                        "पासवर्ड बदलने का कोड भेजें",
                        "রিসেট কোড পাঠান",
                      )
                    : t("Sign in", "लॉगिन करें", "সাইন ইন করুন")}
          </button>
          {mode !== "recover" && (
            <button
              className="button ghost small"
              type="button"
              disabled={busy}
              onClick={() => choose("recover")}
            >
              {t(
                "Set or reset password",
                "पासवर्ड बनाएँ या बदलें",
                "পাসওয়ার্ড সেট বা রিসেট করুন",
              )}
            </button>
          )}
        </form>
      ) : (
        <form
          className="email-code-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <p className="code-recipient">
            {passwordRecovery
              ? t(
                  "Choose a new Sajag password",
                  "नया Sajag पासवर्ड चुनें",
                  "নতুন সজাগ পাসওয়ার্ড বেছে নিন",
                )
              : t("Check your email", "अपना ईमेल देखें", "আপনার ইমেল দেখুন")}
            <strong>{sentTo}</strong>
          </p>
          {lostRecovery && (
            <p className="callout" role="alert">
              {t(
                "This reset link is expired, incomplete or was reloaded. Return to sign in and request a new reset code.",
                "यह पासवर्ड लिंक समाप्त, अधूरा या फिर लोड हुआ है। लॉगिन पर लौटकर नया पासवर्ड कोड मँगाएँ।",
                "এই রিসেট লিঙ্কের মেয়াদ শেষ, অসম্পূর্ণ বা আবার লোড হয়েছে। সাইন ইনে ফিরে নতুন রিসেট কোড চান।",
              )}
            </p>
          )}
          {!passwordRecovery && (
            <>
              <label className="input-label" htmlFor="email-code">
                {t(
                  "Enter the code from your email",
                  "ईमेल में आया कोड लिखें",
                  "ইমেলের কোড লিখুন",
                )}
              </label>
              <input
                ref={codeInput}
                id="email-code"
                className="account-input code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={10}
                pattern="[0-9]{6,10}"
                required
                disabled={busy}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-describedby="code-purpose account-feedback"
                aria-invalid={invalid === "code"}
              />
              <p id="code-purpose" className="small-text">
                {t(
                  "Only enter the Sajag verification or reset code you requested. Never enter a bank, card or UPI OTP here.",
                  "केवल आपके मँगाए Sajag पुष्टि या पासवर्ड कोड को लिखें। बैंक, कार्ड या UPI का OTP यहाँ कभी न लिखें।",
                  "শুধু আপনার চাওয়া সজাগ যাচাই বা রিসেট কোড লিখুন। ব্যাংক, কার্ড বা UPI OTP এখানে দেবেন না।",
                )}
              </p>
            </>
          )}
          {mode === "recover" && !lostRecovery && passwordFields(true)}
          {feedback}
          <button
            type="submit"
            className="button primary full"
            disabled={busy || lostRecovery}
          >
            {busy
              ? t("Verifying…", "जाँच रहे हैं…", "যাচাই হচ্ছে…")
              : mode === "recover"
                ? t("Reset password", "पासवर्ड बदलें", "পাসওয়ার্ড রিসেট করুন")
                : t(
                    "Verify email and sign in",
                    "ईमेल जाँचें और लॉगिन करें",
                    "ইমেল যাচাই করে সাইন ইন করুন",
                  )}
          </button>
          <div className="button-row">
            {!passwordRecovery && (
              <button
                type="button"
                className="button ghost small"
                disabled={busy || cooldown > 0}
                onClick={() => void resend()}
              >
                {cooldown
                  ? t(
                      `Resend in ${cooldown}s`,
                      `${cooldown} सेकंड बाद फिर भेजें`,
                      `${number(cooldown)} সেকেন্ড পরে আবার পাঠান`,
                    )
                  : t("Resend code", "कोड फिर भेजें", "আবার কোড পাঠান")}
              </button>
            )}
            <button
              type="button"
              className="button ghost small"
              disabled={busy}
              onClick={() => {
                if (passwordRecovery) {
                  void cancelRecovery();
                } else {
                  setEmail(sentTo);
                  setSentTo("");
                  clearSecrets();
                  message("", false);
                }
              }}
            >
              {passwordRecovery
                ? t("Back to sign in", "लॉगिन पर लौटें", "সাইন ইনে ফিরুন")
                : t("Change email", "ईमेल बदलें", "ইমেল বদলান")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
