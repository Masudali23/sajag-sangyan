import { describe, expect, it } from "vitest";
import {
  analyzeClaim,
  isSolicitingFinding,
  redactSensitive,
} from "../shared/engine";

const cautions = [
  "No one can guarantee profits from this trading plan.",
  "किसी निवेश में कोई लाभ की गारंटी नहीं दे सकता।",
  "এই বিনিয়োগে লাভের গ্যারান্টি কেউ দিতে পারে না।",
  "Koi investment return ki guarantee nahi de sakta.",
  "Kono investment er guarantee dite pare na.",
  "Never give your banking PIN to someone who calls you.",
  "अपना OTP किसी को बताइए नहीं।",
  "আপনার PIN কাউকে বলবেন না।",
  "Apna OTP kisi ko batana nahi.",
  "Banking PIN karo sathe share korben na.",
  "Our bank statement lists a card withdrawal fee of 20 rupees.",
  "The loan processing fee is a cost, not investment income.",
  "A registration fee buys the accounting course and materials.",
  "Course fee investment deposit noy, trading income er guarantee-o nei.",
  "The lesson explains why people should question guaranteed returns.",
  "The security class studies 'send your OTP to me' as a request to reject.",
];
describe("cycle7 clause-scoped context", () => {
  it.each([
    "The complaint summary says the operator demanded a deposit. It reports that demand; it does not offer paid work.",
    "Do not deposit money because someone promises guaranteed profits with no loss.",
    "Bank SMS ka OTP kisi ko mat bataiye.",
    "The newspaper reports that officials cautioned readers about guaranteed returns.",
  ])(
    "keeps attributed or negated requests separate from real offers: %s",
    (text) => {
      expect(
        analyzeClaim(text).findings.filter((f) => f.severity === "attention"),
      ).toEqual([]);
      const separate = analyzeClaim(
        `${text} Send your banking OTP to our agent now.`,
      );
      expect(
        separate.findings.some(
          (f) => f.id === "credentials" && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
  it.each([
    "Never send your password, but send your OTP to me.",
    "OTP kisi ko mat dena, lekin mujhe O T P bhej do.",
    "अपना पासवर्ड मत बताइए। पी आई एन मुझे चैट में लिख दीजिए।",
  ])(
    "does not transfer one secret's refusal to a separate secret request: %s",
    (text) => {
      expect(
        analyzeClaim(text).findings.some(
          (f) => f.id === "credentials" && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
  it.each(["ओ टी पी: 123456", "पी आई एन: 123456", "ও টি পি: ১২৩৪৫৬"])(
    "masks the corresponding spaced Indic secret value: %s",
    (text) => {
      expect(redactSensitive(text)).toContain("[secret removed]");
      expect(redactSensitive(text)).not.toMatch(/123456|১২৩৪৫৬/);
    },
  );
  it.each(cautions)(
    "keeps protection or ordinary cost unflagged: %s",
    (text) => {
      expect(
        analyzeClaim(text).findings.filter((f) => f.severity === "attention"),
      ).toEqual([]);
    },
  );
  it.each([
    [
      "credentials",
      "Never share passwords with strangers. Send your OTP to our agent.",
    ],
    [
      "credentials",
      "The lesson quotes 'send your OTP to me'. For our actual account support, send your password to me.",
    ],
    [
      "credentials",
      "Never share your PIN, but please send your OTP to our support agent.",
    ],
    [
      "guarantee",
      "Returns are not guaranteed, but our scheme offers guaranteed profit.",
    ],
    [
      "guarantee",
      "The security lesson quotes 'guaranteed returns'. Our own plan offers guaranteed monthly profit.",
    ],
    [
      "release-fee",
      "The college charges a tuition fee. Pay a separate fee first to release your withdrawal.",
    ],
    [
      "pay-to-earn",
      "The class has no joining fee. Pay an activation fee to unlock paid rating tasks.",
    ],
  ])("retains a separate %s request after safe context", (id, text) => {
    const result = analyzeClaim(text);
    const finding = result.findings.find((f) => f.id === id);
    expect(finding?.severity).toBe("attention");
    expect(isSolicitingFinding(result.input, finding!)).toBe(true);
  });
  it("does not let unrelated text lend a finding its action frame", () => {
    const text = "A private lesson. Send your OTP to our agent.";
    expect(
      isSolicitingFinding(text, {
        id: "credentials",
        excerpt: "A private lesson",
      }),
    ).toBe(false);
    expect(
      isSolicitingFinding(text, {
        id: "credentials",
        excerpt: "Send your password",
      }),
    ).toBe(false);
    expect(
      isSolicitingFinding("", { id: "credentials", excerpt: "Send your OTP" }),
    ).toBe(false);
  });
  it("rejects a taught excerpt even when another actual request follows", () => {
    const text =
      'The security lesson quotes "send your OTP to me". Send your banking password here.';
    expect(
      isSolicitingFinding(text, {
        id: "credentials",
        excerpt: "send your OTP to me",
      }),
    ).toBe(false);
    expect(
      isSolicitingFinding(text, {
        id: "credentials",
        excerpt: "Send your banking password here",
      }),
    ).toBe(true);
  });
  it.each([
    [
      "credentials",
      "This lesson explains our trading strategy: send your OTP to our agent, act now.",
    ],
    [
      "release-fee",
      "Our article explains how to join: pay the release fee to unlock your earnings.",
    ],
  ])(
    "does not let a teaching prefix erase the direct %s demand after a colon",
    (id, text) => {
      const result = analyzeClaim(text);
      const finding = result.findings.find((f) => f.id === id);
      expect(finding?.severity).toBe("attention");
      expect(isSolicitingFinding(result.input, finding!)).toBe(true);
    },
  );
  it.each(["email", "phone", "number", "ID", "secret"])(
    "treats a %s redaction placeholder as neutral",
    (label) => {
      const excerpt = "Send your OTP to our agent, act now";
      expect(
        isSolicitingFinding(`[${label} removed] ${excerpt}`, {
          id: "credentials",
          excerpt,
        }),
      ).toBe(true);
    },
  );
});

describe("coercive financial pressure, not casual insults", () => {
  it.each([
    "Pay 3000 rupees now or I will leak your private photos to your family.",
    "अभी पैसे भेजो वरना तुम्हारी फोटो परिवार में फैला देंगे।",
    "এখন টাকা পাঠান না হলে আপনার ছবি সবার কাছে ছড়িয়ে দেব।",
    "Paisa bhejo warna tumhe badnam karunga.",
    "Taka pathao nahole tomar chobi choriye debo.",
  ])("recognises actual financial coercion: %s", (text) => {
    const result = analyzeClaim(text);
    const finding = result.findings.find((f) => f.id === "abusive-pressure");
    expect(finding?.severity).toBe("attention");
    expect(isSolicitingFinding(result.input, finding!)).toBe(true);
  });
  it.each([
    "I am angry; this stupid game is a waste of time.",
    "Please repay the loan instalment listed in your statement.",
    "We will never share private photos or humiliate a borrower who needs help.",
    'The safety lesson quotes "pay 3000 rupees or I will leak your private photos". Do not follow that request.',
    "ধার শোধের হিসাব রাখুন। কাউকে হুমকি দেবেন না।",
  ])("keeps ordinary anger or protection unflagged: %s", (text) => {
    expect(
      analyzeClaim(text).findings.filter((f) => f.severity === "attention"),
    ).toEqual([]);
  });
});

describe("final clause and spelling safety contrasts", () => {
  it.each([
    "पासवर्ड मत भेजें, अपना OTP यहाँ बताएँ।",
    "पासवर्ड मत भेजें, अपना OTP यहाँ बताएं।",
    "Password mat bhejo, OTP yahan batao.",
    "পাসওয়ার্ড দেবেন না, আপনার OTP এখানে পাঠান।",
    "Password deben na kintu OTP ekhane pathan.",
    "Open this link and enter your net-banking username and password.",
    "Reply with the bank username and password that funded the account.",
  ])("keeps the actual credential request: %s", (text) => {
    const result = analyzeClaim(text);
    const finding = result.findings.find((f) => f.id === "credentials");
    expect(finding?.severity).toBe("attention");
    expect(isSolicitingFinding(result.input, finding!)).toBe(true);
  });
  it.each([
    "अपना OTP किसी को बताएँ नहीं।",
    "अपना OTP यहाँ मत बताएँ।",
    "अपना OTP किसी को बताएं नहीं।",
    "Never enter your net-banking username and password through a message link.",
  ])("preserves the corresponding protective clause: %s", (text) => {
    expect(
      analyzeClaim(text).findings.filter((f) => f.severity === "attention"),
    ).toEqual([]);
  });
  it.each([
    [
      "guarantee",
      "The phrase guаranteed profit uses a look-alike letter. Pakka profit, zero risk is still only a claim; do not send an investment deposit because a private plan says no questions are needed.",
      "Our plan offers guaranteed investment profits.",
    ],
    [
      "insider",
      "साले, हर चर्चा में “अंदर की खबर” बोलना बंद कर। मुझे इस बदतमीज़ बहस से चिढ़ है; मैं किसी से फीस, शेयर खरीद या पैसा भेजने को नहीं कह रहा।",
      "हमारे पास अंदर की खबर है। अभी शेयर खरीदो।",
    ],
    [
      "insider",
      "Stop saying ‘insider information’ in every argument.",
      "Our insider information tells you which shares to buy.",
    ],
  ])(
    "scopes quoted wording rejection without erasing a later %s offer",
    (id, context, request) => {
      expect(
        analyzeClaim(context).findings.filter(
          (f) => f.severity === "attention",
        ),
      ).toEqual([]);
      expect(
        analyzeClaim(`${context} ${request}`).findings.some(
          (f) => f.id === id && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
});
