import { describe, expect, it } from "vitest";
import {
  rejectedClaimClause,
  solicitingClaimClause,
} from "../shared/claim-context";
import { analyzeClaim } from "../shared/engine";
import type { Language } from "../shared/types";

describe("cycle8 credential action and destination", () => {
  const entryCases = [
    [
      "en",
      "Enter your PIN in the official app you opened yourself to authorize the payment.",
      "Send your PIN to our agent to authorize the payment.",
    ],
    [
      "hi",
      "खुद खोले हुए आधिकारिक ऐप में भुगतान के लिए अपना पिन दर्ज करें।",
      "भुगतान के लिए अपना पिन हमारे एजेंट को भेजें।",
    ],
    [
      "bn",
      "নিজে খোলা অফিসিয়াল অ্যাপে পেমেন্টের জন্য পিন লিখুন।",
      "পেমেন্টের জন্য আপনার পিন আমাদের এজেন্টকে পাঠান।",
    ],
    [
      "hi",
      "Khud khole official app mein payment ke liye PIN likho.",
      "Payment ke liye PIN hamare agent ko bhejo.",
    ],
    [
      "bn",
      "Nije khola official app e payment er jonno PIN likhun.",
      "Payment er jonno PIN amader agent ke pathan.",
    ],
  ] as const;
  it.each(entryCases)(
    "distinguishes local entry from disclosure in %s: %s",
    (language, entry, disclosure) => {
      expect(solicitingClaimClause(entry, "credentials")).toBe(false);
      expect(solicitingClaimClause(disclosure, "credentials")).toBe(true);
      expect(
        analyzeClaim(entry, language).findings.filter(
          (f) => f.severity === "attention",
        ),
      ).toEqual([]);
    },
  );
  it.each([
    "Enter your PIN at an ATM keypad to withdraw cash.",
    "एटीएम कीपैड में अपना पिन दर्ज करें।",
    "এটিএম কিপ্যাডে পিন লিখুন।",
  ])("distinguishes use on a payment terminal: %s", (text) => {
    expect(solicitingClaimClause(text, "credentials")).toBe(false);
  });
  it.each([
    "Open this link and enter your PIN in the official app you opened yourself.",
    "Share your PIN after entering it in the official app you opened yourself.",
    "Enter your PIN while the agent watches your official app on screen sharing.",
    "खुद खोले आधिकारिक ऐप का पिन इस लिंक में दर्ज करें।",
    "নিজে খোলা অফিসিয়াল অ্যাপের পিন এই লিংকে লিখুন।",
  ])(
    "keeps link, disclosure and remote-control requests eligible: %s",
    (text) => {
      expect(rejectedClaimClause(text, "credentials")).toBe(false);
      expect(solicitingClaimClause(text, "credentials")).toBe(true);
    },
  );
});

describe("cycle8 grammatical reporting and active requests", () => {
  it.each([
    [
      "en",
      "The police report described how a caller demanded an OTP to unlock the victim's payment.",
    ],
    [
      "hi",
      "पुलिस रिपोर्ट में दर्ज है कि कॉलर ने रुके पैसे खोलने के लिए ओटीपी भेजने को कहा था।",
    ],
    [
      "bn",
      "প্রতিবেদনে বর্ণনা করা হয়েছে যে কলার টাকা ফেরানোর নামে পিন পাঠাতে বলেছিল।",
    ],
    ["hi", "Akhbar ki report mein bataya ki caller ne OTP bhejne ko kaha tha."],
    ["bn", "Potrika bornona korechhe je caller PIN pathate bolechhilo."],
  ] as const)("recognizes attributed evidence in %s: %s", (_, text) => {
    expect(rejectedClaimClause(text, "credentials")).toBe(true);
  });
  it.each([
    "The agent says send your OTP to him so he can unlock your payment.",
    "हमारा एजेंट कहता है अपना ओटीपी उसे भेजें।",
    "আমাদের এজেন্ট বলছে আপনার পিন তাকে পাঠান।",
    "Hamare agent ko apna OTP bhejo.",
    "Amader agent ke PIN pathan.",
    "The newspaper explains our offer: send your OTP to our agent.",
  ])("does not exempt a live forwarded request: %s", (text) => {
    expect(rejectedClaimClause(text, "credentials")).toBe(false);
    expect(solicitingClaimClause(text, "credentials")).toBe(true);
  });
  it.each([
    [
      "en",
      "The police report described how a caller demanded an OTP. Send your OTP to our agent now.",
    ],
    ["hi", "पुलिस रिपोर्ट में ओटीपी की माँग दर्ज है। अपना ओटीपी हमें भेजें।"],
    ["bn", "প্রতিবেদনে পিন চাওয়ার বর্ণনা আছে। আপনার পিন আমাদের পাঠান।"],
  ] as const)(
    "retains an independent request after reportage in %s",
    (language, text) => {
      expect(
        analyzeClaim(text, language as Language).findings.some(
          (f) => f.id === "credentials" && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
});

describe("cycle8 negation belongs to the action it denies", () => {
  it.each([
    "No one can guarantee investment profits.",
    "Our investment returns are not guaranteed.",
    "Do not ever deposit money because someone guarantees profits.",
  ])("preserves actual financial rejection: %s", (text) => {
    expect(rejectedClaimClause(text, "guarantee")).toBe(true);
  });
  it.each([
    "Do not hesitate, guaranteed investment profits await you.",
    "Do not delay your deposit for our guaranteed investment returns.",
    "Never hesitate to invest in our guaranteed profit plan.",
  ])(
    "does not transfer an unrelated negation to guaranteed profit: %s",
    (text) => {
      expect(rejectedClaimClause(text, "guarantee")).toBe(false);
      expect(solicitingClaimClause(text, "guarantee")).toBe(true);
    },
  );
  it.each([
    "Never share your OTP with a caller.",
    "You must not ever give your PIN to our agent.",
    "Do not under any circumstances send your banking password.",
  ])("preserves actual disclosure rejection: %s", (text) => {
    expect(rejectedClaimClause(text, "credentials")).toBe(true);
  });
  it.each([
    "Never hesitate to send your OTP to our agent.",
    "Send your OTP, not your password, to our support agent.",
  ])("keeps an unnegated disclosure request: %s", (text) => {
    expect(rejectedClaimClause(text, "credentials")).toBe(false);
    expect(solicitingClaimClause(text, "credentials")).toBe(true);
  });
  it.each([
    "Never pay a release fee to unlock your withdrawal.",
    "Do not ever deposit an activation fee to unlock paid tasks.",
    "Don't under any circumstances send a fee to release a prize.",
  ])("preserves a prohibition on an advance fee: %s", (text) => {
    expect(solicitingClaimClause(text, "release-fee")).toBe(false);
    expect(solicitingClaimClause(text, "pay-to-earn")).toBe(false);
  });
  it.each([
    [
      "release-fee",
      "Never hesitate to pay the release fee to unlock your withdrawal.",
    ],
    ["release-fee", "Do not delay, send a fee first to release your prize."],
    [
      "pay-to-earn",
      "Don't hesitate to deposit an activation fee to unlock paid rating tasks.",
    ],
  ] as const)(
    "retains an affirmative %s demand after discouraging delay",
    (id, text) => {
      expect(rejectedClaimClause(text, id)).toBe(false);
      expect(solicitingClaimClause(text, id)).toBe(true);
      expect(
        analyzeClaim(text).findings.some(
          (f) => f.id === id && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
  it.each([
    "We will never share a borrower's private photos or humiliate them.",
    "Do not ever threaten someone over a loan payment.",
    "You must not under any circumstances publish private photos over a repayment.",
  ])("preserves a prohibition on financial coercion: %s", (text) => {
    expect(rejectedClaimClause(text, "abusive-pressure")).toBe(true);
    expect(solicitingClaimClause(text, "abusive-pressure")).toBe(false);
  });
  it.each([
    "Never hesitate, send 5000 rupees or we will publish your private photos.",
    "Do not delay, pay 3000 rupees or I will leak your private pictures.",
    "Pay the loan now or we will not hesitate to share your private photos.",
  ])("keeps an affirmative threat after an unrelated negation: %s", (text) => {
    expect(rejectedClaimClause(text, "abusive-pressure")).toBe(false);
    expect(solicitingClaimClause(text, "abusive-pressure")).toBe(true);
    expect(
      analyzeClaim(text).findings.some(
        (f) => f.id === "abusive-pressure" && f.severity === "attention",
      ),
    ).toBe(true);
  });
});

describe("cycle8 financial action across languages", () => {
  it.each([
    "Pay an approval fee to release the loan amount.",
    "ऋण की राशि पाने से पहले मेरे पास अलग मंज़ूरी शुल्क भेजें।",
    "ऋण राशि मिलने से पहले अलग शुल्क जमा करें।",
    "Withdraw korte hole tax payment dile balance release hobe.",
    "Locked payout er jonno fresh top-up korte hobe, payment korle release hobe.",
  ])("recognizes a required payment to release funds: %s", (text) => {
    expect(solicitingClaimClause(text, "release-fee")).toBe(true);
  });
  it.each([
    "The bank statement lists the loan processing fee and repayment schedule.",
    "बैंक विवरण में ऋण के शुल्क और ब्याज दर्ज हैं।",
    "ব্যাংক স্টেটমেন্টে ঋণের ফি ও সুদ লেখা আছে।",
  ])("keeps a cost description distinct from an advance demand: %s", (text) => {
    expect(solicitingClaimClause(text, "release-fee")).toBe(false);
  });
  it("recognizes rupee-denominated coercion without a separate money synonym", () => {
    expect(
      solicitingClaimClause(
        "अभी 6000 रुपये भेजें नहीं तो आपकी तस्वीरें परिवार में फैला दूँगा।",
        "abusive-pressure",
      ),
    ).toBe(true);
  });
  it.each([
    "We will push the token price up together.",
    "सब साथ मिलकर टोकन की कीमत चढ़ाएँगे।",
    "আমরা সবাই মিলে টোকেনের দাম বাড়াব।",
    "Sab ek saath token kharido aur price upar karo.",
    "Amra eksathe token kinbo ar dam barabo.",
  ])("recognizes collective price action: %s", (text) => {
    expect(solicitingClaimClause(text, "coordinated-pump")).toBe(true);
  });
});

describe("cycle8 described speech preserves current requests", () => {
  it.each([
    [
      "en",
      "credentials",
      "The instructor in our security class described a caller asking customers to send a login code.",
      "Send your login code to me.",
    ],
    [
      "hi",
      "guarantee",
      "प्रशिक्षक ने निवेश में लाभ की गारंटी वाले उदाहरण समझाए।",
      "हमारी योजना में लाभ की गारंटी है।",
    ],
    [
      "bn",
      "guarantee",
      "প্রশিক্ষক নিশ্চিত লাভের দাবির উদাহরণ ব্যাখ্যা করেছেন।",
      "আমাদের স্কিমে নিশ্চিত লাভ পাবেন।",
    ],
    [
      "hi",
      "guarantee",
      "Trainer ne guaranteed investment profit ke examples dikhaye.",
      "Hamare plan mein guaranteed profit milega.",
    ],
    [
      "bn",
      "coordinated-pump",
      "Study group e purono share kena ar dam baranor chat dekhechhi.",
      "Amra ekshathe share kinbo ar dam barabo.",
    ],
  ] as const)(
    "keeps described speech separate from a current %s offer: %s",
    (language, id, description, request) => {
      expect(rejectedClaimClause(description, id)).toBe(true);
      expect(solicitingClaimClause(description, id)).toBe(false);
      expect(solicitingClaimClause(request, id)).toBe(true);
      expect(
        analyzeClaim(`${description} ${request}`, language).findings.some(
          (f) => f.id === id && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
  it.each([
    "The lesson explains the scheme, but our plan guarantees investment profits.",
    "The training example describes a login-code request, but send your OTP to our agent.",
    "प्रशिक्षक ने उदाहरण समझाए, लेकिन हमारी योजना में लाभ की गारंटी है।",
    "Trainer ne old advertisements ke examples dikhaye lekin hamare plan mein guaranteed profit hai.",
    "প্রশিক্ষক উদাহরণ ব্যাখ্যা করেছেন, কিন্তু আমাদের স্কিমে নিশ্চিত লাভ পাবেন।",
  ])("retains a mixed-clause current offer: %s", (text) => {
    const id = /OTP/u.test(text) ? "credentials" : "guarantee";
    expect(rejectedClaimClause(text, id)).toBe(false);
    expect(solicitingClaimClause(text, id)).toBe(true);
  });
  it.each([
    [
      "en",
      "I once borrowed to invest and paid interest after losing the savings.",
    ],
    ["hi", "मैंने उधार लेकर निवेश किया था और नुकसान हुआ।"],
    ["bn", "আমি ঋণ নিয়ে বিনিয়োগ করেছিলাম এবং লোকসান হয়েছিল।"],
    ["hi", "Maine loan lekar invest kiya tha aur loss hua."],
    ["bn", "Ami loan niye invest korechhilam ar loss hoyechhilo."],
  ] as const)(
    "distinguishes a past experience in %s: %s",
    (language, experience) => {
      expect(rejectedClaimClause(experience, "borrow")).toBe(true);
      expect(solicitingClaimClause(experience, "borrow")).toBe(false);
      const request = "Borrow money to invest in our trading fund.";
      expect(
        analyzeClaim(`${experience} ${request}`, language).findings.some(
          (f) => f.id === "borrow" && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
  it.each([
    ["borrow", "मैं किसी को कर्ज लेकर निवेश करने के लिए नहीं कह रहा।"],
    ["borrow", "Loan lekar invest karne ka suggestion nahi hai."],
    [
      "coordinated-pump",
      "यह समूह में खरीदने और कीमत चढ़ाने के जोखिम का वर्णन है, खरीदने या समूह में जुड़ने की सलाह नहीं।",
    ],
    [
      "coordinated-pump",
      "Group ke share buy order ya group joining nahi maangi.",
    ],
    [
      "coordinated-pump",
      "দলের শেয়ার কেনার নির্দেশ দিতে নয়, ক্ষতির কারণ বোঝানোর আলোচনা।",
    ],
  ] as const)("recognizes a scoped denial of %s action: %s", (id, text) => {
    expect(rejectedClaimClause(text, id)).toBe(true);
    expect(solicitingClaimClause(text, id)).toBe(false);
  });
});

describe("cycle8 current reward, work and coercion commands", () => {
  it.each([
    [
      "credentials",
      "Read the sign-in code from your bank SMS to me on this call.",
    ],
    ["credentials", "Bank ka login code mujhe padhkar bata do."],
    [
      "release-fee",
      "छात्रवृत्ति जारी करने से पहले हमारे खाते में सत्यापन शुल्क जमा करना होगा।",
    ],
    [
      "release-fee",
      "পুরস্কারের টাকা ছাড়ার আগে আমাদের হিসাবে অনুমোদন ফি পাঠাতে হবে।",
    ],
    [
      "release-fee",
      "Contest reward release se pehle collection wallet mein charge bhejna hoga.",
    ],
    ["pay-to-earn", "काम खुलवाने के लिए मेरे खाते में सुरक्षा रकम भेजिए।"],
    [
      "authority-threat",
      "मेरे निजी खाते में समझौते की रकम जमा करो, नहीं तो गिरफ्तारी होगी।",
    ],
    ["coordinated-pump", "আমরা সবাই একসঙ্গে ওই শেয়ারটি কিনব।"],
    ["account-threat", "Reactivation ke liye 2400 abhi bhejo."],
  ] as const)("recognizes a grammatical %s command: %s", (id, text) => {
    expect(solicitingClaimClause(text, id)).toBe(true);
  });
  it.each([
    "Transfer it tonight or I will send your private account records to your employer.",
    "मेरे खाते में पैसा भेजो। भुगतान नहीं किया तो निजी तस्वीरें समूह में डाल दूँगा।",
    "Account mein payment karo. Nahi kiya to private bank statement colleagues ko bhej dunga.",
    "Taka dao. Na dile private loan papers office e pathabo.",
  ])("recognizes threats to expose private financial records: %s", (text) => {
    expect(solicitingClaimClause(text, "abusive-pressure")).toBe(true);
  });
  it.each([
    "My card is locked; I will open the bank app myself to review replacement charges.",
    "এই নোটে কাউকে পাসওয়ার্ড পাঠাতে বলা হচ্ছে না।",
    "Ei note e kauke password ba code dite bola nei.",
  ])(
    "keeps self-service and denied restoration demands distinct: %s",
    (text) => {
      expect(solicitingClaimClause(text, "account-threat")).toBe(false);
    },
  );
});

describe("cycle8 administrative fees and reader-directed continuations", () => {
  it.each([
    "पेंशन का बकाया तैयार है। प्रोसेसिंग रकम पहले हमारे एजेंट को भेजिए, तभी बकाया जारी होगा।",
    "सत्यापन रकम मेरे खाते में भेजें ताकि छात्रवृत्ति जारी हो।",
  ])(
    "recognizes an administrative payment demanded before payout: %s",
    (text) => {
      expect(solicitingClaimClause(text, "release-fee")).toBe(true);
    },
  );
  it.each([
    "कूरियर सेवा की प्रोसेसिंग रकम रसीद में दर्ज है।",
    "बैंक विवरण में ऋण के लिए प्रोसेसिंग रकम और ब्याज दिखाया गया है।",
    "अपनी खरीद का भुगतान करने के लिए रकम भेजें।",
  ])(
    "does not treat an ordinary amount or service cost as a payout fee: %s",
    (text) => {
      expect(solicitingClaimClause(text, "release-fee")).toBe(false);
      expect(solicitingClaimClause(text, "pay-to-earn")).toBe(false);
    },
  );
  it.each([
    "The lesson described OTP theft; you must send your OTP to our agent.",
    "The training example explained passwords while our agent now asks you to send your PIN.",
    "प्रशिक्षक ने कोड के खतरे समझाए अपना OTP मुझे बताओ।",
    "প্রশিক্ষক কোডের ঝুঁকি ব্যাখ্যা করেছেন আপনার পিন এখানে পাঠান।",
    "Trainer ne code ke examples dikhaye apna OTP mujhe bata do.",
    "Study group e code er chat dekhechhi apnar PIN ekhane pathan.",
  ])(
    "retains a reader-directed request after a descriptive prefix: %s",
    (text) => {
      expect(rejectedClaimClause(text, "credentials")).toBe(false);
      expect(solicitingClaimClause(text, "credentials")).toBe(true);
    },
  );
  it.each([
    "प्रशिक्षक ने निवेश लाभ की गारंटी के उदाहरण समझाए अपना OTP किसी को मत बताओ।",
    "প্রশিক্ষক নিশ্চিত লাভের দাবি ব্যাখ্যা করেছেন আপনার পিন কাউকে বলুন না।",
  ])(
    "keeps a protection instruction within described financial speech: %s",
    (text) => {
      expect(rejectedClaimClause(text, "guarantee")).toBe(true);
    },
  );
});

describe("cycle8 current passive requests after historical speech", () => {
  it.each([
    [
      "credentials",
      "At our security session we explained OTP handling and your OTP must be sent to me now.",
    ],
    [
      "guarantee",
      "The newspaper reported an investment fraud and your capital will earn guaranteed returns in our fund now.",
    ],
    [
      "credentials",
      "I previously invested in trading but now your OTP should be sent to my agent.",
    ],
    [
      "credentials",
      "The class discussed codes, your PIN needs to be shared with our support team.",
    ],
  ] as const)(
    "retains a current %s request within described speech",
    (id, text) => {
      expect(rejectedClaimClause(text, id)).toBe(false);
      expect(solicitingClaimClause(text, id)).toBe(true);
      expect(
        analyzeClaim(text).findings.some(
          (f) => f.id === id && f.severity === "attention",
        ),
      ).toBe(true);
    },
  );
  it.each([
    "The class explained why your PIN must never be sent to a caller.",
    "At our security session we discussed a complaint where an OTP was sent to an agent.",
    "The lesson described why your password should not be shared with support.",
    "The newspaper described a pitch claiming their capital would earn guaranteed returns in a fund.",
  ])("preserves negative or past passive described speech: %s", (text) => {
    const id = /capital/iu.test(text) ? "guarantee" : "credentials";
    expect(rejectedClaimClause(text, id)).toBe(true);
    expect(solicitingClaimClause(text, id)).toBe(false);
  });
});

describe("cycle8 account restriction callbacks", () => {
  it.each([
    ["en", "Your debit card has been restricted. Call us to reactivate it."],
    ["hi", "आपका सिम बंद हो जाएगा, इसे चालू करने के लिए कॉल करें।"],
    ["hi", "Apka card band hoga, abhi call karo."],
  ] as const)("retains the current callback in %s: %s", (language, text) => {
    expect(solicitingClaimClause(text, "account-threat")).toBe(true);
    expect(
      analyzeClaim(text, language).findings.some(
        (f) => f.id === "account-threat" && f.severity === "attention",
      ),
    ).toBe(true);
  });
  it.each([
    "I previously called the bank after my debit card was restricted.",
    "Do not call that number to reactivate your card.",
  ])("keeps a historical or prohibited callback distinct: %s", (text) => {
    expect(solicitingClaimClause(text, "account-threat")).toBe(false);
  });
});
