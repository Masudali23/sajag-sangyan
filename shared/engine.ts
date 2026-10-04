import type {
  ClaimAnalysis,
  ConceptId,
  Finding,
  Language,
  Localized,
} from "./types.ts";
import { normalizeDigits, numericClaim } from "./numeric-claims.ts";
import {
  abusivePressurePattern,
  paymentEarningContinuation,
  offerPaymentContinuation,
  releasePaymentContinuation,
  rejectedClaimClause,
  solicitingClaimClause,
} from "./claim-context.ts";
import { bengaliEngineCopy } from "./bengali-engine-copy.ts";
import {
  bengaliPatterns,
  bengaliContexts,
  bengaliCaution,
} from "./bengali-patterns.ts";
const l = (en: string, hi: string): Localized => ({
  en,
  hi,
  bn: bengaliEngineCopy[en] ?? en,
});
export const MAX_CLAIM_LENGTH = 6000;
export const RULE_IDS = [
  "credentials",
  "account-threat",
  "authority-threat",
  "release-fee",
  "off-exchange",
  "coordinated-pump",
  "guarantee",
  "urgency",
  "registration",
  "outsized",
  "promotion",
  "nav",
  "tip",
  "insider",
  "impersonation",
  "periodic",
  "pay-to-earn",
  "off-platform",
  "social-proof",
  "secrecy",
  "borrow",
  "abusive-pressure",
] as const;
export type RuleId = (typeof RULE_IDS)[number];
const latinLookalikes: Record<string, string> = {
  а: "a",
  А: "A",
  е: "e",
  Е: "E",
  о: "o",
  О: "O",
  ο: "o",
  Ο: "O",
  р: "p",
  Р: "P",
  Ρ: "P",
  ρ: "p",
  с: "c",
  С: "C",
  υ: "u",
  Υ: "Y",
  Α: "A",
  Β: "B",
  Ε: "E",
  Η: "H",
  Ι: "I",
  Κ: "K",
  Μ: "M",
  Ν: "N",
  Τ: "T",
  Χ: "X",
  і: "i",
  І: "I",
  х: "x",
  Х: "X",
  у: "y",
  У: "Y",
  ѕ: "s",
  Ѕ: "S",
  к: "k",
  К: "K",
  м: "m",
  М: "M",
  т: "t",
  Т: "T",
  В: "B",
  Н: "H",
};
// Bound reconstruction to short Latin fragments, known acronyms and digit
// runs. Complete boundary words retain a separator ("Never🔥share your OTP").
// Arbitrary long fragments remain separated rather than inventing a word.
const spacedAcronyms = new Set([
  "OTP",
  "UPI",
  "PIN",
  "CVV",
  "KYC",
  "NAV",
  "GST",
  "SEBI",
]);
const boundaryWords = new Set(
  "a an the to of for in on at by from with without and or but if then than as is are was were be been being it this that these those our your my their his her its us we you i me they he she do does did not no never yes now today send share give pay join invest avoid beware please claim check message otp pin cvv upi kyc nav sebi gst rbi bank account support agent anyone return returns profit profits guarantee guaranteed risk money daily weekly monthly amount fee charge release withdrawal safe verify".split(
    " ",
  ),
);
function internalEmoji(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (
    /^\p{Decimal_Number}+$/u.test(left) &&
    /^\p{Decimal_Number}+$/u.test(right)
  )
    return true;
  if (spacedAcronyms.has((left + right).toUpperCase())) return true;
  return (
    Math.min(left.length, right.length) <= 2 &&
    !(
      boundaryWords.has(left.toLowerCase()) &&
      boundaryWords.has(right.toLowerCase())
    )
  );
}
function normalizeEmojiSeparators(text: string): string {
  return text.replace(
    /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}]+/gu,
    (_emoji, offset: number) => {
      const left =
        text.slice(0, offset).match(/[a-z\p{Decimal_Number}]+$/iu)?.[0] ?? "";
      const right =
        text
          .slice(offset + _emoji.length)
          .match(/^[a-z\p{Decimal_Number}]+/iu)?.[0] ?? "";
      return internalEmoji(left, right) ? "" : " ";
    },
  );
}

export function redactSensitive(text: string): string {
  // Recognize formatting-obfuscated values in a shadow string, then mask the
  // corresponding original spans. Public wording, line breaks and negation
  // outside the masked value remain exactly as supplied to this function.
  let shadow = "",
    offset = 0;
  const starts: number[] = [],
    ends: number[] = [];
  for (const character of text) {
    const start = offset;
    offset += character.length;
    if (
      /\p{Default_Ignorable_Code_Point}/u.test(character) ||
      (character === "\u20e3" && /[\p{Decimal_Number}#*]$/u.test(shadow))
    ) {
      if (ends.length) ends[ends.length - 1] = offset;
      continue;
    }
    if (
      /[\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}]/u.test(
        character,
      )
    ) {
      const left = shadow.match(/[a-z\p{Decimal_Number}]+$/iu)?.[0] ?? "";
      const next = text
        .slice(offset)
        .normalize("NFKC")
        .replace(
          /^[\p{Default_Ignorable_Code_Point}\p{Extended_Pictographic}\p{Emoji_Modifier}\p{Regional_Indicator}]+/u,
          "",
        );
      const foldedNext = [...next].map((c) => latinLookalikes[c] ?? c).join("");
      const right = foldedNext.match(/^[a-z\p{Decimal_Number}]+/iu)?.[0] ?? "";
      if (internalEmoji(left, right)) {
        if (ends.length) ends[ends.length - 1] = offset;
        continue;
      }
    }
    const normalized = /\s/u.test(character)
      ? " "
      : [...character.normalize("NFKC")]
          .map((c) => latinLookalikes[c] ?? c)
          .join("");
    shadow += normalized;
    for (let i = 0; i < normalized.length; i++) {
      starts.push(start);
      ends.push(offset);
    }
  }
  const ranges: { start: number; end: number; replacement: string }[] = [];
  function mask(pattern: RegExp, replacement: string, prefixGroup = false) {
    for (const match of shadow.matchAll(pattern)) {
      const index = match.index! + (prefixGroup ? match[1].length : 0);
      const length = prefixGroup ? match[2].length : match[0].length;
      if (length)
        ranges.push({
          start: starts[index],
          end: ends[index + length - 1],
          replacement,
        });
    }
  }
  mask(
    /((?:\bC\s*V\s*V\b|सीवीवी|সিভিভি)\s*(?:is|হল|है|[:=])?\s*)([\p{N}]{3,4})(?![\p{N}])/giu,
    "[secret removed]",
    true,
  );
  mask(
    /((?:\b(?:O\s*T\s*P|P\s*I\s*N|one[ -]time\s*(?:password|code)|(?:login|verification|security)\s*code)\b|ओ\s*टी\s*पी|पी\s*आई\s*एन|पिन|लॉगिन\s*कोड|ও\s*টি\s*পি|পি\s*আই\s*এন|পিন|লগইন\s*কোড)[^.!?]{0,64}?)([\p{N}]{4,8})(?![\p{N}])/giu,
    "[secret removed]",
    true,
  );
  mask(
    /((?:\b(?:password|passcode)\b|पासवर्ड|পাসওয়ার্ড|পাসওয়ার্ড)\s*(?:is\b|है|হল|হলো|[:=：-])\s*)([\p{L}\p{M}\p{N}!@#$%*._+-]+)/giu,
    "[secret removed]",
    true,
  );
  mask(
    /((?:\b(?:account|card)\s*(?:number|no\.?)|खाता\s*(?:संख्या|नंबर)|(?:অ্যাকাউন্ট|কার্ড)\s*(?:নম্বর|নং))\s*(?:is|है)?\s*[:=：-]?\s*)([\p{N}][\p{N} -]{5,24}[\p{N}])/giu,
    "[number removed]",
    true,
  );
  mask(
    /(?<![\p{L}\p{N}])[A-Z]{5}[0-9]{4}[A-Z](?![\p{L}\p{N}])/giu,
    "[ID removed]",
  );
  mask(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, "[email removed]");
  mask(/(?:\+91[ -]?)?\b[6-9]\d{4}[ -]?\d{5}\b/g, "[phone removed]");
  mask(
    /(?<![\p{N}])[\p{N}]{4}[ -]?[\p{N}]{4}[ -]?[\p{N}]{4}(?:[ -]?[\p{N}]{4})?(?![\p{N}])/gu,
    "[number removed]",
  );
  const merged: typeof ranges = [];
  for (const range of ranges.sort(
    (a, b) => a.start - b.start || b.end - a.end,
  )) {
    const previous = merged.at(-1);
    if (previous && range.start < previous.end)
      previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  let result = "",
    cursor = 0;
  for (const range of merged) {
    result += text.slice(cursor, range.start) + range.replacement;
    cursor = range.end;
  }
  return result + text.slice(cursor);
}

type Rule = {
  id: RuleId;
  pattern: RegExp;
  contextPattern?: RegExp;
  title: Localized;
  explanation: Localized;
  sourceIds: string[];
  concept: ConceptId;
  severity: Finding["severity"];
};
const rules: Rule[] = [
  {
    id: "abusive-pressure",
    pattern: abusivePressurePattern,
    contextPattern:
      /money|pay|loan|debt|repay|amount|account|₹|rupees|taka|paisa|OTP|PIN|password|पैस|राशि|ऋण|कर्ज|खात|টাকা|ঋণ|ধার|অ্যাকাউন্ট|ওটিপি|পিন/iu,
    title: l(
      "Threats or humiliation are being used to demand payment",
      "धमकी या अपमान से भुगतान का दबाव बनाया जा रहा है",
    ),
    explanation: l(
      "Threats to harm, humiliate someone or expose private information while demanding money or account access are coercive pressure. A genuine debt does not make harassment acceptable. Save the message and contact the institution or official complaint channels independently. Sajag has not verified the debt, sender or threat.",
      "पैसे या खाते की पहुँच माँगते हुए नुकसान, अपमान या निजी जानकारी फैलाने की धमकी दबाव का संकेत है। असली कर्ज़ होने पर भी उत्पीड़न स्वीकार्य नहीं है। संदेश सुरक्षित रखें और संस्था या आधिकारिक शिकायत माध्यम से स्वतंत्र रूप से संपर्क करें। सजग ने कर्ज़, भेजने वाले या धमकी का सत्यापन नहीं किया है।",
    ),
    sourceIds: ["rbi-recovery-conduct", "cybercrime"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "credentials",
    pattern:
      /(?:share|send|tell|give|disclose|provide).{0,55}(?:OTP|PIN|password|login|credentials)|(?:OTP|PIN|password|login).{0,40}(?:batao|bhejo|de\s*do|share|send|हमें.{0,12}बताइए|बताओ|भेजें|दे\s*दो)|(?:अपना|अपने).{0,20}(?:ओटीपी|पिन|पासवर्ड|পাসওয়ার্ড|পাসওয়ার্ড).{0,25}(?:बताएं|बताइए|भेजें)|manage.{0,20}(?:your|aapka).{0,15}demat\s*account|(?:install|open|allow|enable).{0,35}(?:AnyDesk|TeamViewer|remote\s*access|screen\s*shar)/i,
    title: l(
      "A request for account access or private details",
      "खाते की पहुँच या निजी जानकारी माँगी जा रही है",
    ),
    explanation: l(
      "Passwords, OTPs, card details, identity documents and remote screen control can be misused when shared through an unverified request. Do not disclose secret codes to a sender or account handler. Contact your institution through a number or app you independently know is official. Entering a code in an official app you opened yourself is different; Sajag has not authenticated this request.",
      "बिना जाँचे अनुरोध पर पासवर्ड, OTP, कार्ड की जानकारी, पहचान के दस्तावेज़ या स्क्रीन का नियंत्रण देने से उनका दुरुपयोग हो सकता है। भेजने वाले को गुप्त कोड न बताएँ। संस्था का आधिकारिक नंबर या ऐप खुद खोजकर संपर्क करें। खुद खोले गए आधिकारिक ऐप में कोड दर्ज करना अलग बात है; सजग ने इस अनुरोध की पहचान सत्यापित नहीं की है।",
    ),
    sourceIds: ["rbi-kyc", "sebi-account-handling"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "account-threat",
    pattern:
      /(?:account|holdings?|demat).{0,55}(?:block|suspend|freez|frozen|clos)|(?:pending|expired).{0,12}KYC|KYC.{0,20}(?:pending|expired)|(?:खाता|पेंशन).{0,25}बंद|account.{0,25}band\s*ho/i,
    contextPattern:
      /https?:|[a-z0-9-]+\.(?:in|com|net|org)\b|update\s*now|OTP|password|link|लिंक|अपडेट|बताइए|batao|warna/i,
    title: l(
      "An account or service restriction is pushing a request",
      "खाता या सेवा बंद होने की धमकी देकर अनुरोध किया जा रहा है",
    ),
    explanation: l(
      "An account, card or service restriction combined with a link, callback or request for private details deserves an independent check. Open the institution's official app or contact its published support yourself. Genuine notices exist; this message alone does not authenticate one.",
      "खाता, कार्ड या सेवा बंद होने की बात के साथ लिंक, फोन करने या निजी जानकारी देने को कहा जाए तो स्वतंत्र जाँच करें। संस्था का आधिकारिक ऐप खुद खोलें या उसके प्रकाशित सहायता नंबर पर संपर्क करें। असली सूचनाएँ भी होती हैं; केवल यह संदेश उनकी प्रामाणिकता साबित नहीं करता।",
    ),
    sourceIds: ["rbi-kyc"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "authority-threat",
    pattern:
      /digital\s*arrest|डिजिटल\s*अरेस्ट|(?:CBI|ED\b|police|customs|cyber\s*cell|RBI|सीबीआई|पुलिस).{0,180}(?:arrest|warrant|launder|गिरफ्तार|गिरफ़्तार|मनी\s*लॉन्ड्रिंग)|(?:arrest|launder|warrant).{0,180}(?:safe\s*account|transfer|send\s*money)|safe\s*account.{0,35}(?:transfer|paisa|verification)/i,
    title: l(
      "Official authority is being used to pressure payment",
      "अधिकारी होने का दावा करके भुगतान का दबाव",
    ),
    explanation: l(
      "Threats of arrest or a criminal case combined with demands for money or continuous video contact are described in official cybercrime alerts. A caller's claimed title is not identity proof. Seek help through independently obtained official contacts; suspected financial cyber fraud can be reported on 1930.",
      "गिरफ्तारी या मुकदमे की धमकी के साथ पैसा या लगातार वीडियो संपर्क माँगने का तरीका सरकारी साइबर अपराध चेतावनियों में बताया गया है। पद बताना पहचान का प्रमाण नहीं है। आधिकारिक संपर्क खुद खोजकर मदद लें; संदिग्ध वित्तीय साइबर धोखाधड़ी की सूचना 1930 पर दे सकते हैं।",
    ),
    sourceIds: ["mha-cyber-impersonation", "cybercrime"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "release-fee",
    pattern:
      /(?:\bpay\w*\b|\bdeposit\b|\bsend\b|\btransfer\b|\bjama\b|\bbharo\b).{0,60}(?:processing|advance|security|tax|GST|TDS|release|recovery|refundable).{0,20}(?:fee|amount|charge|deposit)?|(?:भरें|भेजें|जमा).{0,35}(?:टैक्स|जीएसटी|शुल्क|सुरक्षा\s*राशि)|(?:processing|recovery|advance).{0,12}(?:fee|charge)/i,
    contextPattern:
      /recover|lost\s*money|release|unfreeze|unlock|withdraw|payout|on\s*hold|unclaimed|profits?|funds|निकासी|रुकी|वापस|पैसा\s*निकाल/i,
    title: l(
      "An extra payment is tied to releasing or recovering money",
      "पैसा छुड़ाने या वापस दिलाने के लिए अलग भुगतान",
    ),
    explanation: l(
      "A demand for tax, a deposit or an advance fee before receiving a prize or releasing or recovering money needs independent verification of both the payee and the obligation. Do not use the sender's contact details as the only check. Legitimate fees and taxes exist; Sajag has not established that this demand is valid or fraudulent.",
      "इनाम देने, पैसा छुड़ाने या वापस दिलाने से पहले टैक्स, जमा राशि या अग्रिम फीस माँगी जाए तो लेने वाले और भुगतान की वजह दोनों स्वतंत्र रूप से जाँचें। केवल भेजने वाले के दिए संपर्क से जाँच पूरी न मानें। असली शुल्क और टैक्स भी होते हैं; सजग ने इस माँग को सही या धोखाधड़ी साबित नहीं किया है।",
    ),
    sourceIds: ["rbi-impersonation-fees", "sebi-fake-apps"],
    concept: "fees",
    severity: "attention",
  },
  {
    id: "off-exchange",
    pattern:
      /\bdabba\b|डब्बा|डब्बा\s*ट्रेडिंग|trad\w*.{0,35}without\s*(?:a\s*)?demat|no\s*brokerage.{0,25}no\s*tax|forex.{0,70}(?:profit|return|guarantee|munafa)|फॉरेक्स.{0,35}(?:मुनाफ|रिटर्न)/i,
    title: l(
      "Check the trading venue and permitted activity",
      "ट्रेडिंग कहाँ होगी और उसकी अनुमति जाँचें",
    ),
    explanation: l(
      "An offer of off-exchange securities trading or forex profits needs checks of the exact entity, venue and permitted activity. Dabba arrangements can leave users outside exchange protection. Absence from an alert list does not establish authorization. Sajag has not performed a live registration check.",
      "एक्सचेंज के बाहर शेयर ट्रेडिंग या फॉरेक्स मुनाफे के ऑफ़र में सही संस्था, ट्रेडिंग की जगह और अनुमति जाँचें। डब्बा व्यवस्था में एक्सचेंज की सुरक्षा नहीं मिल सकती। चेतावनी सूची में नाम न होना अनुमति का प्रमाण नहीं है। सजग ने लाइव पंजीकरण नहीं जाँचा है।",
    ),
    sourceIds: ["sebi-dabba", "rbi-forex", "sebi-registry"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "coordinated-pump",
    pattern:
      /(?:everyone|all\s*of\s*us|together).{0,20}buy|buy\s*together|(?:we|group).{0,25}(?:push|pump|tak\w*).{0,20}(?:up|to\s*\d)|pump\s*(?:alert|and\s*dump|it|this)|सब.{0,15}(?:खरीदो|खरीदें).{0,30}(?:भाव|कीमत)|milkar.{0,20}(?:price|daam).{0,15}badha/i,
    title: l(
      "Coordinated buying and an exit are being proposed",
      "मिलकर खरीदने और फिर निकलने की योजना",
    ),
    explanation: l(
      "Messages coordinating purchases to push a price and then exit resemble the mechanism described in pump-and-dump warnings. Later participants may bear losses when others sell. Do not treat group coordination as evidence of value; Sajag has not established anyone's intent or verified a trade.",
      "भाव बढ़ाने के लिए मिलकर खरीदने और फिर निकलने वाले संदेश, पंप-एंड-डंप चेतावनियों में बताए तरीके जैसे हैं। दूसरों के बेचने पर बाद में जुड़ने वालों को नुकसान हो सकता है। समूह की योजना शेयर के मूल्य का प्रमाण नहीं है; सजग ने किसी की मंशा या सौदे की जाँच नहीं की है।",
    ),
    sourceIds: ["sebi-pump"],
    concept: "volatility",
    severity: "attention",
  },
  {
    id: "guarantee",
    pattern:
      /guaranteed?\s+(?:\w+\s+){0,2}(?:returns?|profits?|income)|assured\s+returns?|(?:zero|no|without)[ -]?risk|risk[ -]?free|100\s*%\s*(?:safe|returns?|profit)|गारंटीड|गारंटी.{0,16}(?:रिटर्न|मुनाफा)|शून्य\s*जोखिम|बिना\s*(?:किसी\s*)?जोखिम|पक्का\s*(?:मुनाफा|रिटर्न)|guaranteed?\s*(?:munafa|return)|pakka\s*(?:munafa|profit)|bina\s*risk|zero\s*loss|no\s*loss|loss\s*hua.{0,18}paisa\s*wapas|bilkul\s*safe|koi\s*risk\s*nahi|बिल्कुल\s*सुरक्षित|सरकारी\s*गारंटी|पक्की\s*कमाई|pakka\s*kamao|sure[ -]*shot\s*calls?/i,
    title: l("A promise that needs evidence", "इस वादे का प्रमाण चाहिए"),
    explanation: l(
      "This wording presents certainty about returns or risk. Ask for the exact guarantee, its conditions and the entity responsible. The message alone does not establish that the promise is valid.",
      "यह भाषा रिटर्न या जोखिम के बारे में निश्चितता दिखाती है। गारंटी, उसकी शर्तों और ज़िम्मेदार संस्था का आधिकारिक प्रमाण माँगें। केवल संदेश से वादा साबित नहीं होता।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "urgency",
    pattern:
      /(?:only|last)\s*\d*\s*(?:spots?|seats?|places)|act\s*now|(?:join|invest|pay|dm|message)\s*(?:us\s*)?(?:now|today|immediately)|limited[ -](?:time|slots?|seats?)|before\s*(?:midnight|it.s too late)|अभी\s*(?:जुड़ें|निवेश|भुगतान|संपर्क)|सिर्फ\s*\d*\s*(?:जगह|सीट)|आज\s*ही|jaldi\s*(?:karo|join)|abhi\s*join|sirf\s*\d+\s*seats|(?:register|update)\s*now|spots?\s*(?:are\s*)?limited|limited\s*period|sirf\s*aaj|aaj\s*raat.{0,25}tak|don.t\s*miss|baad\s*mein\s*pachtaoge/i,
    title: l("Pressure to act quickly", "जल्दी करने का दबाव"),
    explanation: l(
      "Urgency can reduce the time available to examine a claim. A deadline is a persuasion signal, not evidence that an opportunity is genuine or fraudulent.",
      "जल्दी करने का दबाव दावे को जाँचने का समय घटा सकता है। समय-सीमा आपको जल्दी राज़ी करने का तरीका हो सकती है; यह असलियत या धोखाधड़ी का प्रमाण नहीं है।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "registration",
    pattern:
      /(?:SEBI|सेबी).{0,24}(?:register|approv|certif|पंजीकृत|मान्यता|अनुमोदित)|(?:register|approv|पंजीकृत).{0,24}(?:SEBI|सेबी)/i,
    title: l("Registration is a separate question", "पंजीकरण अलग से जाँचें"),
    explanation: l(
      "A registration claim needs an independent check of the exact legal name and permitted activity in the official registry. Even valid registration does not assure returns. Sajag has not checked this person or entity.",
      "आधिकारिक रजिस्टर में सही कानूनी नाम और अनुमति प्राप्त गतिविधि जाँचें। वैध पंजीकरण भी रिटर्न की गारंटी नहीं है। Sajag ने इस व्यक्ति या संस्था का पंजीकरण नहीं जाँचा है।",
    ),
    sourceIds: ["sebi-registry", "sebi-adviser"],
    concept: "risk",
    severity: "context",
  },
  {
    id: "outsized",
    pattern:
      /(?:\d+(?:\.\d+)?\s*%).{0,30}(?:daily|every\s*day|per\s*day)|(?:daily|every\s*day|हर\s*दिन|रोज़?|प्रतिदिन).{0,16}\d+\s*%|double\s*(?:your\s*)?money|money\s*(?:will\s*)?double|(?:bitcoin|crypto|BTC|money).{0,15}doubl|\b2\s*[x×].{0,18}(?:hours?|days?|weeks?)|send\s+[\d.]+\s*(?:BTC|ETH|USDT).{0,20}get\s+[\d.]+\s*(?:BTC|ETH|USDT)|पैस[ेा].{0,12}दोगुन[ाे]|दोगुन[ाे].{0,12}पैस[ेा]|(?:बिटकॉइन|क्रिप्टो).{0,15}दोगुन|paisa\s*double|(?:paisa|paise|bitcoin|crypto).{0,15}(?:dugna|doguna)|\d+\s*din.{0,15}double/i,
    title: l(
      "Check the return numbers and time period",
      "रिटर्न के आँकड़े और अवधि जाँचें",
    ),
    explanation: l(
      "These numbers describe a strong return, multiplier or repeated payout claim. Ask for the starting amount, time period, losses, fees and independently checkable records. Arithmetic on the sender's numbers is not a forecast or proof that anyone can earn that amount.",
      "इन आँकड़ों में ऊँचे रिटर्न, पैसा कई गुना होने या बार-बार कमाई मिलने का दावा है। शुरुआती रकम, अवधि, नुकसान, शुल्क और स्वतंत्र रूप से जाँचने योग्य रिकॉर्ड माँगें। भेजने वाले के आँकड़ों पर गणना कोई भविष्यवाणी या इतनी कमाई होने का प्रमाण नहीं है।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "compounding",
    severity: "attention",
  },
  {
    id: "promotion",
    pattern:
      /referral|affiliate|promo\s*code|paid\s*(?:course|group|channel)|vip\s*(?:group|whatsapp|telegram)|join\s*(?:my|our)\s*(?:group|course)|DM\s*(?:me|us|now)|रेफरल|पेड\s*(?:कोर्स|ग्रुप)|(?:मेरा|मेरे|हमारा|हमारे)\s*(?:कोर्स|पेड\s*ग्रुप)|premium\s*(?:plan|telegram|group|channel)|subscribe\s*to\s*(?:our|my)|link\s*in\s*bio|stock\s*picks|course\s*fee|cashback|कैशबैक|सदस्य.{0,25}जोड़ने.{0,25}कमीशन/i,
    title: l(
      "There may be a selling incentive",
      "इसमें भेजने वाले का आर्थिक फ़ायदा जुड़ा हो सकता है",
    ),
    explanation: l(
      "A course, referral or private group can give the creator a financial incentive. Educational information and promotion can appear together. Ask who benefits and whether the relationship is disclosed.",
      "कोर्स, रेफरल या निजी ग्रुप से क्रिएटर को आर्थिक लाभ हो सकता है। शिक्षा और प्रचार साथ हो सकते हैं। पूछें कि किसे लाभ होगा और क्या यह बताया गया है।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "fees",
    severity: "context",
  },
  {
    id: "nav",
    pattern:
      /(?:low(?:er)?|cheap).{0,15}NAV|NAV.{0,35}(?:cheap|better|best|return)|कम\s*NAV|NAV.{0,25}(?:सस्ता|बेहतर|रिटर्न)/i,
    title: l(
      "A lower unit value is not evidence of value",
      "कम यूनिट मूल्य बेहतर होने का प्रमाण नहीं",
    ),
    explanation: l(
      "NAV describes the value per unit. By itself, it cannot establish that one fund is cheaper, better or likely to earn more. Underlying assets, risks and costs need separate consideration.",
      "NAV एक यूनिट का मूल्य बताता है। अकेले इससे फंड सस्ता, बेहतर या ज़्यादा रिटर्न वाला साबित नहीं होता। संपत्तियाँ, जोखिम और खर्च अलग से समझने होते हैं।",
    ),
    sourceIds: ["sebi-mutual"],
    concept: "nav",
    severity: "context",
  },
  {
    id: "tip",
    pattern:
      /\b(?:buy|sell|accumulate)\s+(?:now|today|this\s+(?:stock|share)|[A-Z][\w.-]*\s+(?:at|@|below|above))|\btarget\s*(?:price\s*)?[:=₹]?\s*\d|multibagger|(?:kal|tomorrow|will).{0,18}upper\s*circuit|upper\s*circuit.{0,18}(?:lagega|tomorrow|guaranteed)|\bBTST\b|100\s*%\s*accurate\s*calls?|(?:खरीदो|खरीदें|बेचो|बेचें)(?![\p{L}\p{M}]).{0,18}(?:शेयर|स्टॉक)|(?:शेयर|स्टॉक).{0,18}(?:खरीदो|खरीदें|बेचो|बेचें)(?![\p{L}\p{M}])|[A-Z][\w.-]*\s*(?:खरीदें|बेचें)|टारगेट\s*₹?\s*\d|(?:कल|लगेगा).{0,18}अपर\s*सर्किट|अपर\s*सर्किट.{0,18}(?:लगेगा|पक्का)|मल्टीबैगर|(?:share|stock).{0,15}(?:kharido|becho)|(?:share|stock).{0,45}(?:upar\s*jayega|kharid\s*lo)|(?:शेयर|स्टॉक).{0,30}(?:पक्का\s*ऊपर|खरीदो)|jackpot\s*stock|sure[ -]*shot\s*(?:calls?|listing\s*gain)|will\s*list\s*at.{0,15}%\s*premium|(?:small\s*cap|stock|share).{0,30}will\s*be\s*the\s*next/iu,
    title: l(
      "A trading tip is not supporting evidence",
      "ट्रेडिंग टिप अपने आप में प्रमाण नहीं",
    ),
    explanation: l(
      "A price target or confident buy/sell call is a prediction by the sender, not evidence that it will happen. Ask for the basis, the risks and any selling incentive. Sajag has not checked the security or the sender and does not endorse the call.",
      "लक्ष्य भाव या भरोसे से दी गई खरीदने-बेचने की टिप भेजने वाले का अनुमान है, नतीजे का प्रमाण नहीं। उसका आधार, जोखिम और आर्थिक हित पूछें। Sajag ने शेयर या प्रतिभूति और भेजने वाले की जाँच नहीं की है और टिप का समर्थन नहीं करता।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "insider",
    pattern:
      /insider\s*(?:tip|news|information|access)|inside\s*(?:news|information)|operator\s*(?:ne|tip|call|news|said)|अंदर\s*की\s*(?:खबर|जानकारी)|इनसाइडर\s*(?:टिप|खबर)|ऑपरेटर\s*(?:ने|की)|andar\s*ki\s*(?:khabar|news|jaankari)|inside\s*data/i,
    title: l(
      "A claim of privileged information",
      "खास अंदरूनी जानकारी का दावा",
    ),
    explanation: l(
      "An alleged insider or operator tip relies on authority you cannot establish from this message. Look for publicly available company or exchange disclosures. Neither claimed access nor secrecy verifies the information.",
      "इनसाइडर या ऑपरेटर की टिप ऐसी खास पहुँच का दावा करती है जो इस संदेश से साबित नहीं होती। कंपनी या एक्सचेंज की सार्वजनिक सूचना देखें। खास पहुँच का दावा या राज़ रखने की बात जानकारी का प्रमाण नहीं है।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "impersonation",
    pattern:
      /(?:finance\s*minister|prime\s*minister|RBI|SEBI|government|celebrity).{0,75}(?:launch|approv|recommend|endors|backed|scheme)|(?:approved|endorsed|launched|backed)\s*by.{0,25}(?:minister|RBI|SEBI|government|celebrity)|(?:वित्त\s*मंत्री|प्रधानमंत्री|सरकार|आरबीआई|सेबी|अभिनेता).{0,60}(?:लॉन्च|शुरू|मंजूर|समर्थन|योजना)|(?:sarkar|mantri).{0,60}(?:launch|shuru|manzoor|yojana)|(?:Ambani|Tata|अंबानी|टाटा).{0,35}(?:new|नई).{0,25}(?:investment|निवेश)|(?:NSE|BSE|NSDL|CDSL).{0,45}(?:approv|endors|launch)/i,
    contextPattern:
      /trad|invest|returns?|profit|app|platform|निवेश|ट्रेडिंग|मुनाफ|ऐप|kamao|lagao/i,
    title: l(
      "An endorsement needs independent confirmation",
      "समर्थन के दावे की स्वतंत्र पुष्टि चाहिए",
    ),
    explanation: l(
      "A public figure's name or an official-looking endorsement does not authenticate an app or offer. Find the announcement on that institution's own site, reached independently. Sajag has not authenticated the endorsement, app or registration.",
      "किसी प्रसिद्ध व्यक्ति का नाम या सरकारी दिखने वाला समर्थन ऐप या ऑफ़र की पहचान साबित नहीं करता। संस्था की वेबसाइट खुद खोलकर मूल घोषणा खोजें। Sajag ने समर्थन, ऐप या पंजीकरण की प्रामाणिकता नहीं जाँची है।",
    ),
    sourceIds: ["sebi-scams", "sebi-social-media", "sebi-registry"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "periodic",
    pattern:
      /(?:fixed|assured|guaranteed?|pakka|fix).{0,25}[\d.]+\s*%.{0,25}(?:month|week|har\s*(?:mahine|hafte))|[\d.]+\s*%.{0,15}(?:fixed|assured|pakka|fix).{0,15}(?:month|week|mahine|hafte)|(?:mahine|hafte)\s*(?:ka|mein).{0,15}[\d.]+\s*%.{0,15}(?:fixed|pakka|fix)|(?:monthly|weekly).{0,15}(?:fixed|assured).{0,12}\d+\s*%|(?:हर\s*महीने|हर\s*हफ्ते|मासिक|साप्ताहिक).{0,20}[\d०-९.]+\s*%.{0,15}(?:पक्का|तय|फिक्स|गारंटी)|(?:फिक्स|पक्का|तय|निश्चित).{0,20}[\d०-९.]+\s*%.{0,20}(?:महीने|माह|मासिक|हफ्ते|साप्ताहिक)|(?:har\s*(?:mahine|hafte)).{0,20}\d+\s*%.{0,15}(?:fixed|pakka)/i,
    title: l(
      "A fixed periodic return is being promised",
      "नियमित तय रिटर्न का वादा",
    ),
    explanation: l(
      "A fixed monthly or weekly return claim needs the official terms, the provider's identity and an explanation of how payments are funded. Some products have conditional guarantees; this wording does not establish one or prove that payments will continue.",
      "हर महीने या हफ्ते तय रिटर्न के दावे के लिए आधिकारिक शर्तें, देने वाले की पहचान और भुगतान के स्रोत को जाँचें। कुछ उत्पादों में शर्तों वाली गारंटी होती है; यह भाषा ऐसी गारंटी या लगातार भुगतान का प्रमाण नहीं है।",
    ),
    sourceIds: ["sebi-scams", "sebi-adviser"],
    concept: "compounding",
    severity: "attention",
  },
  {
    id: "pay-to-earn",
    pattern:
      /(?:pay|send|deposit).{0,30}(?:registration|withdrawal|activation|unlock).{0,12}(?:fee|charge)|(?:registration|withdrawal|activation)\s*(?:fee|charge).{0,20}(?:pay|UPI)|bonus\s*(?:on|for)\s*(?:a\s*)?deposit|deposit\s*bonus|(?:भुगतान|भेजें|दो|दें).{0,25}(?:रजिस्ट्रेशन|पंजीकरण|निकासी|एक्टिवेशन)\s*(?:फीस|शुल्क)|(?:रजिस्ट्रेशन|पंजीकरण|निकासी).{0,12}(?:फीस|शुल्क).{0,15}(?:दें|भेजें|दो)|जमा.{0,15}बोनस|(?:registration|withdrawal)\s*(?:fees?|charge).{0,20}(?:do|bhejo|bharo)/i,
    contextPattern:
      /earn|income|profit|withdraw|bonus|task|कमा|कमाई|निकासी|बोनस|kamai|kamao|kamane/i,
    title: l(
      "Payment is tied to promised earnings",
      "कमाई के वादे से जुड़ा भुगतान",
    ),
    explanation: l(
      "An upfront fee to earn or unlock money, or a deposit bonus, deserves a pause. Verify the provider and written conditions through independent channels before sharing payment details. A fee or bonus alone does not prove fraud; Sajag has not verified this offer.",
      "अगर कमाई शुरू करने या पैसा निकालने से पहले फीस माँगी जाए, या पैसा जमा करने पर बोनस का वादा हो, तो रुककर जाँचें। भुगतान की जानकारी देने से पहले स्वतंत्र माध्यम से संस्था और लिखित शर्तें जाँचें। अकेली फीस या बोनस धोखाधड़ी का प्रमाण नहीं है; Sajag ने ऑफ़र सत्यापित नहीं किया है।",
    ),
    sourceIds: ["sebi-scams", "sebi-fake-apps", "cybercrime"],
    concept: "fees",
    severity: "attention",
  },
  {
    id: "off-platform",
    pattern:
      /(?:download|install).{0,60}\bAPK\b|not\s*(?:available\s*)?on\s*(?:the\s*)?(?:Play\s*Store|App\s*Store)|pre[ -]?IPO\s*(?:shares?\s*)?(?:at\s*)?discount|guaranteed\s*allotment|institutional\s*account|(?:प्ले\s*स्टोर|ऐप\s*स्टोर).{0,15}नहीं|(?:डाउनलोड|इंस्टॉल).{0,40}(?:APK|एपीके)|प्री[ -]?आईपीओ.{0,20}(?:छूट|सस्ते)|गारंटीड\s*आवंटन|संस्थागत\s*खात|(?:play\s*store).{0,12}(?:par\s*)?nahi|pakka\s*allotment|HNI\s*quota|arranged\s*allotment|institutional\s*partner|block\s*deal.{0,30}discount|आवंटन.{0,20}पक्का|अपने\s*कोटे/i,
    title: l(
      "Check the app and claimed special access",
      "ऐप और खास पहुँच के दावे को जाँचें",
    ),
    explanation: l(
      "An app outside an official store or an offer of special allotment/account access needs independent checks of the provider, permissions and offer documents. Store presence alone also does not prove safety. Sajag has not opened the link or checked anyone's registration.",
      "आधिकारिक स्टोर के बाहर ऐप या खास आवंटन/खाते की पहुँच के लिए संस्था, अनुमतियाँ और दस्तावेज़ स्वतंत्र रूप से जाँचें। स्टोर में होना भी सुरक्षा का प्रमाण नहीं है। Sajag ने लिंक नहीं खोला और किसी का पंजीकरण नहीं जाँचा है।",
    ),
    sourceIds: [
      "sebi-scams",
      "sebi-fake-apps",
      "sebi-fpi-schemes",
      "sebi-registry",
    ],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "social-proof",
    pattern:
      /(?:profit|earning|return)\s*screenshots?|(?:turned|grew).{0,30}(?:₹|Rs\.?|INR).{0,25}into.{0,20}(?:₹|Rs\.?|INR)|\d[\d,.]*\s*(?:lakh|crore|million|k)?\+?\s*(?:members|followers)|(?:मुनाफे?|कमाई|प्रॉफिट).{0,12}स्क्रीनशॉट|[\d०-९]+\s*(?:लाख|हज़ार|हजार)?\+?\s*(?:सदस्य|लोग).{0,15}(?:भरोसा|जुड़)|munafe?\s*ke\s*screenshots?|\d+\s*lakh\s*log.{0,15}bharosa/i,
    title: l(
      "Popularity and screenshots are not verification",
      "लोकप्रियता और स्क्रीनशॉट सत्यापन नहीं हैं",
    ),
    explanation: l(
      "Member counts, personal success stories and profit screenshots may leave out losses, costs and the full period. Ask for independently checkable records. These persuasion cues neither establish typical results nor prove that the sender is dishonest.",
      "सदस्यों की संख्या, निजी सफलता की कहानी और मुनाफे के स्क्रीनशॉट में नुकसान, खर्च और पूरी अवधि छिप सकते हैं। स्वतंत्र रूप से जाँचने योग्य रिकॉर्ड माँगें। ये संकेत न सामान्य नतीजे साबित करते हैं, न भेजने वाले को बेईमान साबित करते हैं।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "risk",
    severity: "context",
  },
  {
    id: "secrecy",
    pattern:
      /don.t\s*tell\s*anyone|keep.{0,40}(?:secret|between\s*us)|secret\s*(?:strategy|tip|method)|(?:किसी\s*को|किसी\s*से).{0,10}(?:मत\s*बताना|न\s*बताएं)|गुप्त\s*(?:रणनीति|टिप|तरीका)|kisi\s*ko\s*mat\s*batana|secret\s*(?:tarika|tareeka)/i,
    contextPattern:
      /invest|trad|return|profit|strategy|tip|money|member|निवेश|मुनाफ|कमाई|पैस|टिप|रणनीति|रिटर्न|munafa|paisa|paise|kamai/i,
    title: l(
      "Secrecy can obstruct an independent check",
      "राज़ रखने को कहना स्वतंत्र जाँच में रुकावट बन सकता है",
    ),
    explanation: l(
      "Sajag treats secrecy around an investment offer as a reason to seek a second opinion. Ask for public, independently checkable evidence and take time to consult someone you trust. This is a caution based on the wording; secrecy alone does not establish fraud.",
      "Sajag निवेश के ऑफ़र को गुप्त रखने की बात को दूसरी राय लेने का कारण मानता है। सार्वजनिक और स्वतंत्र रूप से जाँचने योग्य प्रमाण माँगें और भरोसेमंद व्यक्ति से बात करने का समय लें। यह भाषा पर आधारित सावधानी है; केवल राज़ रखने की बात धोखाधड़ी साबित नहीं करती।",
    ),
    sourceIds: ["sebi-scams"],
    concept: "risk",
    severity: "attention",
  },
  {
    id: "borrow",
    pattern:
      /borrow.{0,25}(?:invest|trad)|loan.{0,25}(?:invest|trad)|leverage|margin\s*(?:trad|fund)|कर्ज.{0,20}निवेश|उधार.{0,20}(?:निवेश|ट्रेड)|लीवरेज/i,
    title: l("Borrowing can magnify a loss", "उधार से नुकसान बढ़ सकता है"),
    explanation: l(
      "Borrowed exposure can amplify changes in your own money while the debt remains payable. The simulator uses fictional tokens to explain this mechanism; it does not recommend a strategy.",
      "उधार लिया पैसा अपने पैसे के नुकसान को बढ़ा सकता है, और कर्ज़ फिर भी चुकाना पड़ता है। सिम्युलेटर काल्पनिक टोकन से यह समझाता है; कोई रणनीति नहीं सुझाता।",
    ),
    sourceIds: ["sebi-investing"],
    concept: "volatility",
    severity: "attention",
  },
];
// Development examples exposed missing request verbs and account nouns. These
// extensions describe observable wording, not the publisher's spam/scam label.
const requestPatterns: Partial<Record<RuleId, RegExp>> = {
  credentials:
    /(?:OTP|PIN|password|CVV).{0,20}(?:submit|darj)\s*(?:karo|karna)|(?:submit|enter|type|fill|confirm).{0,35}(?:password|passcode|OTP|PIN\b|CVV)|(?:send|share|provide).{0,35}(?:CVV|card\s*(?:details|information))|(?:update|submit|upload|verify|send).{0,35}(?:PAN\s*(?:card|number)|Aadhaar|KYC\s*documents?).{0,55}(?:link|click|https?:)|(?:link|click|https?:).{0,50}(?:update|submit|upload|verify).{0,25}(?:PAN\s*(?:card|number)|Aadhaar|KYC\s*documents?)|(?:लिंक|यहाँ).{0,35}(?:पासवर्ड|ओटीपी|पिन|आधार|पैन).{0,25}(?:भरें|डालें|लिखें|दर्ज)|(?:पासवर्ड|ओटीपी|पिन).{0,30}(?:सबमिट|दर्ज\s*करें)|(?:bhejo|batao|submit|darj\s*karo).{0,30}(?:password|OTP|PIN|CVV)/i,
  "account-threat":
    /(?:\b(?:a\/c|cards?|sim)\b|खात[ाे]|कार्ड|सिम).{0,65}(?:block|suspe[\s,.-]*nd|deactivat|restrict|lock|clos|बंद|ब्लॉक|निलंबित)|(?:account|demat).{0,55}(?:deactivat|restrict|lock|suspension)|(?:blocked|suspended|deactivated).{0,20}(?:account|card|sim)|(?:incomplete|pending|expired).{0,15}(?:e?KYC)|e?KYC.{0,25}(?:incomplete|expired)|(?:खात[ाे]|कार्ड|सिम).{0,25}(?:बंद|ब्लॉक).{0,15}(?:हो|कर)|(?:card|sim|khata).{0,35}(?:band|block|deactivate)/i,
  "release-fee":
    /(?:registration|processing|transfer|claim).{0,15}(?:charge|fee).{0,25}(?:deposit|pay|send)|(?:pay|deposit|send).{0,25}(?:registration|claim).{0,15}(?:fee|charge)|(?:इनाम|लॉटरी|पुरस्कार).{0,75}(?:फीस|शुल्क|जमा)|(?:inaam|inam|lottery|prize).{0,70}(?:fees?|charge|jama)/i,
};
const requestContexts: Partial<Record<RuleId, RegExp>> = {
  "account-threat":
    /call|contact|reactivat|activat|update|click|verify|कॉल|संपर्क|अपडेट|दर्ज|फोन|sampark|karo/i,
  "release-fee":
    /prize|lottery|winnings?|इनाम|लॉटरी|पुरस्कार|inaam|inam|(?:SEBI|RBI|सेबी|आरबीआई).{0,100}(?:protection|verification|compliance|आवंटन)|cashout|security\s*deposit|(?:मंजूरी|आवंटन|कोटा).{0,80}(?:शुल्क|फीस).{0,30}(?:मेरे|मेरी|निजी)|(?:approval|allocation|quota).{0,70}(?:fee|charge).{0,30}(?:personal|my)/i,
};
for (const rule of rules) {
  const extension = requestPatterns[rule.id];
  if (extension)
    rule.pattern = new RegExp(
      `(?:${rule.pattern.source})|(?:${extension.source})`,
      "iu",
    );
  const context = requestContexts[rule.id];
  if (context && rule.contextPattern)
    rule.contextPattern = new RegExp(
      `(?:${rule.contextPattern.source})|(?:${context.source})`,
      "iu",
    );
}

// Visible development v2 vocabulary: polite imperatives, reversed payment
// order, code aliases and common romanised wording. IDs and evidence stay fixed.
const developmentPatterns: Partial<Record<RuleId, RegExp>> = {
  credentials:
    /(?:login|verification|security|sign[ -]?in)\s*code.{0,80}(?:send|give|forward|share|bhej(?:o|iye)|bata|path(?:an|iye)|din)|(?:send|give|forward).{0,50}(?:login|verification|security)\s*code|(?:लॉगिन|सत्यापन|सुरक्षा)\s*कोड.{0,80}(?:भेजिए|भेजें|बताइए|बताएं|दीजिए|दें)/iu,
  "account-threat":
    /(?:khata|account|card|sim).{0,45}(?:suspend|band|sthogito|restricted)/iu,
  "release-fee":
    /(?:pay|deposit|send).{0,40}(?:clearance|unlocking|verification).{0,15}(?:fee|charge)|(?:clearance|release|recovery|unlocking).{0,20}(?:fee|charge).{0,45}(?:pay|deposit|jama|joma)|(?:निकासी|रुके|वापस).{0,70}(?:शुल्क|फीस|चार्ज).{0,25}(?:जमा|भर|दे|दीजिए)|(?:क्लीयरेंस|निकासी|वापसी).{0,20}(?:शुल्क|फीस|चार्ज)/iu,
  "coordinated-pump":
    /(?:sab|saare).{0,20}milkar.{0,35}(?:kharid|buy)|(?:daam|price).{0,25}(?:chadha|badha).{0,35}(?:bech|sell)/iu,
  guarantee:
    /(?:no|without).{0,18}(?:possibility|chance|risk)\s*of\s*(?:loss|losing)|निश्चित\s*(?:मुनाफा|लाभ|रिटर्न)|(?:रिटर्न|मुनाफा|लाभ).{0,15}गारंटी|(?:कोई|बिल्कुल)\s*जोखिम\s*नहीं|(?:नुकसान|घाटे).{0,20}(?:संभावना\s*नहीं|नहीं\s*होगा)|(?:nishchit|nischit)\s*(?:munafa|profit|return)|(?:loss|nuksan).{0,15}sambhavna\s*nahi|koi\s*(?:bhi\s*)?risk\s*nahi/iu,
  urgency:
    /aaj\s*hi\s*(?:invest|join|pay|jama)|(?:only|last|sirf|bas)\s*(?:three|five|ten|teen|paanch|das)\s*(?:places|seats|spots|jagah)|\binvest\b[^.!?;]{0,45}\b(?:now|today|immediately)\b/iu,
  nav: /(?:kam|low)\s*NAV|NAV.{0,30}(?:sasta|behtar)/iu,
  tip: /(?:शेयर|स्टॉक).{0,25}(?:खरीदिए|बेचिए)|(?:खरीदिए|बेचिए).{0,25}(?:शेयर|स्टॉक)|(?:share|stock).{0,30}(?:kharid(?:iye|o|na)|bech(?:iye|o))/iu,
  insider:
    /andar\s*ki\s*(?:jankari|jaankari)|operator.{0,35}(?:khabar|jankari|news|tip)/iu,
  impersonation:
    /(?:vitt|finance)\s*mantri.{0,90}(?:support|endorse|launch|shuru|platform)|orthomontri.{0,65}(?:somorthon|app|platform)/iu,
  periodic:
    /(?:हर\s*महीने|हर\s*हफ्ते).{0,20}(?:तय|निश्चित|फिक्स).{0,12}\d+(?:\.\d+)?\s*%|(?:har\s*mahine|har\s*hafte|proti\s*mashe).{0,20}(?:tay|fixed|pakka).{0,12}\d+(?:\.\d+)?\s*%/iu,
  "pay-to-earn":
    /(?:activation|joining|registration)\s*(?:fees?|charge).{0,20}(?:dijiye|dena|jama|din|joma)|(?:एक्टिवेशन|रजिस्ट्रेशन|पंजीकरण).{0,15}(?:फीस|शुल्क).{0,18}(?:दीजिए|दें|जमा)/iu,
  "off-platform":
    /\bAPK\b.{0,85}(?:install|download)|(?:APK|एपीके).{0,80}(?:इंस्टॉल|डाउनलोड)/iu,
  borrow:
    /(?:invest(?:ing|ment)?|trad(?:e|ing))\b.{0,65}(?:take\s*(?:a\s*)?(?:personal\s*)?loan|borrow|loan\s*(?:lo|lein|lijiye|nin))|(?:निवेश|ट्रेडिंग).{0,65}(?:कर्ज़?|ऋण|उधार).{0,20}(?:लीजिए|लें|लो)/iu,
};
for (const rule of rules) {
  const extension = developmentPatterns[rule.id];
  if (extension)
    rule.pattern = new RegExp(
      `(?:${rule.pattern.source})|(?:${extension.source})`,
      "iu",
    );
}

// Separate external-development phase: request wording, never publisher labels.
const externalDevelopmentPatterns: Partial<Record<RuleId, RegExp>> = {
  // Trailing certainty has the same meaning as an adjective before the return.

  periodic:
    /(?:get|earn|receive).{0,25}guaranteed?\s*\d+(?:\.\d+)?\s*%.{0,20}(?:day|week|month)|(?:har\s*)?(?:month|week).{0,20}\d+(?:\.\d+)?\s*%.{0,15}fixed/iu,
  credentials:
    /\b(?:reply|paste|forward|submit)\b.{0,55}(?:\bOTP\b|\bpassword\b|recovery\s*phrase|seed\s*phrase|password.reset\s*link)|(?:\bOTP\b|\bPIN\b|\bpassword\b|\bCVV\b|ओटीपी|पिन|पासवर्ड|सीवीवी).{0,65}(?:भरें|बताइए|लिखें|भेज\s*दें|भेजें|डालें|forward|type\s*koro|\bdao\b|reply)|(?:छह|छय|six)[ -]*(?:digit|अंक).{0,12}(?:code|कोड).{0,45}(?:send|भेज)/iu,
  guarantee:
    /\bguarantee(?:d|s)?\b.{0,65}(?:₹|rupees|return|profit|income|earning|payout|recovery|deposit|back)|(?:earning|income|return|profit|payout).{0,60}\bguarantee(?:d|s)?\b|(?:principal|capital).{0,25}(?:fully\s*)?(?:safe|protected|never\s*(?:fall|reduce))|(?:लाभ|मुनाफा).{0,18}(?:निश्चित|पक्का)|मूलधन.{0,20}सुरक्षित|(?:bank|likh\s*kar|note).{0,15}guarantee|(?:principal|capital).{0,20}(?:kam\s*nahi|loss\s*zero)|zero\s*drawdown|\d+(?:\.\d+)?\s*%.{0,30}(?:day|daily|week|month).{0,25}guaranteed?/iu,
  "release-fee":
    /(?:tax[ -]*validation\s*stamp|release\s*ticket)|(?:सत्यापन|क्लीयरेंस|सुरक्षा).{0,20}(?:शुल्क|फीस|जमा)|(?:कर|टैक्स|जीएसटी).{0,65}(?:जमा|भेज|भर)|(?:clearance|liquidity|security).{0,20}(?:fee|charge|deposit).{0,45}(?:bhejo|bharo|pay|pathao)|(?:fee|charge).{0,35}(?:bhejo|pathao|\bdao\b)|(?:शुल्क|फीस|fee).{0,25}(?:देते|दें|भेजें|भेजिए)/iu,
  "coordinated-pump":
    /(?:सब|टोली|समूह).{0,30}(?:एक\s*साथ|मिलकर).{0,45}(?:खरीद|भाव)|(?:टोली|समूह).{0,30}भाव.{0,20}(?:चढ़ा|बढ़ा)/iu,
  tip: /upper[ -]*circuit.{0,15}(?:list|tips)|(?:विकल्प|ऑप्शन).{0,15}टिप.{0,30}(?:लगाओ|खरीद)/iu,
  "pay-to-earn":
    /(?:activation|registration|joining)\s*deposit|(?:task|ad.view|rating).{0,60}(?:recharge|deposit|jama)|(?:income|kamai).{0,25}unlock.{0,45}(?:package|pay|jama)/iu,
  "off-platform":
    /(?:offer|trading).{0,35}(?:hata\s*diya|removed).{0,70}(?:private|personal)|(?:personal|private).{0,25}(?:UPI|wallet).{0,45}(?:capital|invest)/iu,
  borrow:
    /mortgage.{0,60}(?:options|invest|trading|pool)|(?:कर्ज|ऋण).{0,20}(?:लेकर|लेके).{0,45}(?:योजना|निवेश)/iu,
};
for (const rule of rules) {
  const extra = externalDevelopmentPatterns[rule.id];
  if (extra)
    rule.pattern = new RegExp(
      `(?:${rule.pattern.source})|(?:${extra.source})`,
      "iu",
    );
}

// Keep every locale on the same reviewed categories, explanations and sources.
for (const rule of rules) {
  const extra = bengaliPatterns[rule.id];
  if (extra)
    rule.pattern = new RegExp(
      `(?:${rule.pattern.source})|(?:${extra.source})`,
      "iu",
    );
  const context = bengaliContexts[rule.id];
  if (context && rule.contextPattern)
    rule.contextPattern = new RegExp(
      `(?:${rule.contextPattern.source})|(?:${context.source})`,
      "iu",
    );
}
export const aiCategoryDescriptions = rules.map((rule) => ({
  category: rule.id,
  description: rule.title.en,
}));

// A Latin credential alias is a token: PIN inside "keeping" is not a PIN,
// and the Banglish request "din" is not the middle of "trading".
for (const rule of rules) {
  if (rule.id === "credentials")
    rule.pattern = new RegExp(
      rule.pattern.source.replace(
        /\b(?:OTP|PIN|CVV|password|login|credentials|din)\b/g,
        (token) => `(?<![a-z])${token}(?![a-z])`,
      ),
      "iu",
    );
}

function contentTypeFor(
  input: string,
  findings: Finding[],
): ClaimAnalysis["contentType"] {
  const hasPromotion = findings.some((f) =>
    ["promotion", "urgency", "tip", "pay-to-earn", "social-proof"].includes(
      f.id,
    ),
  );
  const hasEducation =
    /means|refers\s*to|defined\s*as|understand|for\s*example|\bmatlab\b|kya\s*hota\s*hai|teaches.{0,20}how\s*to|cannot\s*(?:remove|eliminate)|मतलब|समझें|उदाहरण|नहीं\s*होता|नहीं\s*होती|মানে|বলতে\s*বোঝায়|বুঝুন|উদাহরণ|হয়\s*না|hoy\s*na|bojhay/i.test(
      input,
    );
  return hasPromotion
    ? hasEducation
      ? "mixed"
      : "promotional"
    : hasEducation
      ? "educational"
      : "unclear";
}
function summaryFor(findings: Finding[]): Localized {
  return findings.some((f) => f.severity === "attention")
    ? l(
        "Pause. Some claims need a closer look.",
        "रुकें। कुछ दावों को ध्यान से जाँचना ज़रूरी है।",
      )
    : findings.length
      ? l("There is more context to consider.", "कुछ और बातें समझना ज़रूरी है।")
      : l(
          "There is not enough evidence to assess this claim.",
          "इस दावे का आकलन करने के लिए पर्याप्त प्रमाण नहीं है।",
        );
}

// Adds reviewed library entries only. It cannot remove, edit, downgrade or
// replace a deterministic finding, source, explanation or previously seen cue.
export function addAiFindings(
  analysis: ClaimAnalysis,
  candidates: { category: RuleId; excerpt: string }[],
): ClaimAnalysis {
  const findings = [...analysis.findings];
  const concepts = new Set(analysis.lessonIds);
  for (const candidate of candidates.slice(0, 6)) {
    if (findings.some((f) => f.id === candidate.category)) continue;
    if (
      candidate.excerpt.trim().length < 6 ||
      candidate.excerpt.length > 300 ||
      !analysis.input.includes(candidate.excerpt)
    )
      continue;
    const rule = rules.find((r) => r.id === candidate.category);
    if (!rule) continue;
    findings.push({
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
      explanation: rule.explanation,
      sourceIds: rule.sourceIds,
      excerpt: candidate.excerpt,
      origin: "ai",
    });
    concepts.add(rule.concept);
  }
  return {
    ...analysis,
    findings,
    aiAssisted: true,
    status: findings.some((f) => f.severity === "attention")
      ? "attention"
      : "context",
    contentType: contentTypeFor(analysis.input, findings),
    summary: summaryFor(findings),
    sourceIds: [...new Set(findings.flatMap((f) => f.sourceIds))],
    lessonIds: [...concepts].slice(0, 5),
  };
}

export function unsupportedLanguageNotice(text: string): Localized | undefined {
  if (
    /[\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}\p{Script=Gujarati}\p{Script=Gurmukhi}\p{Script=Oriya}]/u.test(
      text,
    ) ||
    /गुंतव|गुंतवा|मिळवा|मिळेल|हमी/.test(text)
  )
    return l(
      "This message appears to include a language we have not validated yet. Sajag currently supports English, Hindi, Bengali (beta), Hinglish and Banglish; warning signs may be missed. Any findings below are partial, not a safety verdict.",
      "इस संदेश में ऐसी भाषा के संकेत हैं जिसकी हमने अभी जाँच नहीं की है। सजग अभी अंग्रेज़ी, हिन्दी, बांग्ला (बीटा), हिंग्लिश और बांग्लिश के लिए है; चेतावनी के संकेत छूट सकते हैं। नीचे मिली बातें अधूरी हो सकती हैं और सुरक्षा का फैसला नहीं हैं।",
    );
  return undefined;
}
// Shopping/data-plan deadlines are persuasion context, not an investor-risk
// alert. A financial return, credentials, restriction or pay-to-release request
// in the same message keeps the stronger interpretation.
function ordinaryRetailPromotion(text: string): boolean {
  return (
    /\b(?:GB|MB)\b|\d\s*(?:GB|MB)|shopping|gadget|grocer|restaurant|clothing|shirts?|library|workshop|school|fish|fruits?|food|produce|apples?|bananas?|vegetables?|home\s*delivery|জিবি|গ্যাজেট|ডাটা|কেনাকাটা|মাছ|সবজি|ফল|পোশাক|जीबी|खरीदारी|कपड़|कमीज|पुस्तकालय|सब्जी|किराना|फल|kapdon|shirt|poshak|dokan|workshop|পাঠাগার/i.test(
      text,
    ) &&
    !/invest|profit|returns?|trading|crypto|stock|demat|KYC|password|OTP|\bPIN\b|withdraw|release|lottery|prize|AnyDesk|TeamViewer|remote\s*access|screen\s*shar|arrest|warrant|account.{0,30}(?:block|suspend)|निवेश|मुनाफ|रिटर्न|पासवर्ड|निकासी|বিনিয়োগ|বিনিয়োগ|লাভ|রিটার্ন|পাসওয়ার্ড|পাসওয়ার্ড|ওটিপি|অ্যাকাউন্ট.{0,25}(?:বন্ধ|ব্লক)/i.test(
      text,
    )
  );
}

// A due date on an ordinary expense does not become an investment warning.
// Evaluate the clause itself so a nearby bill cannot hide a separate offer.
function ordinaryFinancialDeadline(text: string): boolean {
  return (
    /\b(?:bill|invoice|rent|repay(?:ment)?|instalment|installment|EMI|tuition|utility|electricity|water\s*bill|card\s*(?:payment|balance)|annual\s*fee|late\s*(?:fee|charge))\b|बिल|किस्त|किराया|स्कूल\s*फीस|बिजली|বকেয়া|বকেয়া|বিল|কিস্তি|ভাড়া|স্কুলের\s*ফি|\b(?:kist|kisti|kiraya|bhara)\b/iu.test(
      text,
    ) &&
    !/invest|trad|crypto|stock|shares?|profits?|returns?|earnings?|prize|lottery|(?:withdraw|release|unlock).{0,35}(?:money|balance|fund)|OTP|\bPIN\b|password|remote\s*access|निवेश|ट्रेड|मुनाफ|रिटर्न|कमाई|ओटीपी|पासवर्ड|पुरस्कार|लॉटरी|বিনিয়োগ|বিনিয়োগ|লাভ|রিটার্ন|আয়|ওটিপি|পিন|পাসওয়ার্ড|পুরস্কার|লটারি|munaf[ae]|kamai|rojgar/iu.test(
      text,
    )
  );
}

function ordinaryRetailDeadline(
  text: string,
  previous: string,
  next: string,
): boolean {
  if (ordinaryRetailPromotion(text)) return true;
  // A shop/data offer may put its deadline on a separate short sentence. Use
  // only the immediate neighbours; independent risk actions are still screened.
  return (
    previous.length <= 300 &&
    text.length <= 300 &&
    next.length <= 300 &&
    (ordinaryRetailPromotion(`${previous} ${text}`) ||
      ordinaryRetailPromotion(`${text} ${next}`))
  );
}

// Group purchases of ordinary goods are not coordinated securities trading.
// Require the collective action and market/price-manipulation frame together.
function coordinatedTradingCue(text: string): boolean {
  const collective =
    /\b(?:everyone|together|group|we|all\s*of\s*us|sab|saare|milkar|saath|sobai|amra|eksathe|ekshathe)\b|सब|मिलकर|समूह|একসঙ্গে|একসাথে|সবাই|আমরা|গ্রুপ/iu;
  const market =
    /\b(?:stocks?|shares?|securities|token|coins?|crypto|pump)\b|शेयर|शेयरों|स्टॉक|टोकन|क्रिप्टो|शेअर्स|শেয়ার|শেয়ার|স্টক|টোকেন|ক্রিপ্টো/iu;
  const raisingPrice =
    /(?:push|pump|drive|raise|inflate|take|force).{0,35}(?:price|up)|(?:price|daam|dam|भाव|कीमत|দাম|দর).{0,30}(?:badha|chadha|barab|baran|barie|tul|बढ़|चढ़|বাড়া|বাড়া|বাড়ি|বাড়ি|তুল)|(?:price|daam|dam).{0,15}(?:up|upar).{0,20}(?:karo|koro|korbo|le\s*ja)|(?:ऊँच|বেশি).{0,20}(?:कीमत|দাম)/iu;
  const engineeredExit =
    /(?:sell|exit|dump).{0,15}(?:after|when).{0,30}(?:outsiders|new\s*buyers|late\s*buyers)|(?:outsiders|new\s*buyers).{0,20}(?:arrive|join|enter).{0,30}(?:sell|exit|dump)|\bpump(?:ing)?\b/iu;
  return (
    collective.test(text) &&
    (engineeredExit.test(text) || raisingPrice.test(text)) &&
    (market.test(text) ||
      (raisingPrice.test(text) && !ordinaryRetailPromotion(text)))
  );
}

function coordinatedTradingContinuation(first: string, next: string): boolean {
  return (
    first.length <= 300 &&
    next.length <= 300 &&
    /\b(?:buy|kharid\w*|kinbo|kinun|kine)\b|खरीद|কিনব|কিনুন|কিনে/iu.test(
      `${first} ${next}`,
    ) &&
    coordinatedTradingCue(`${first} ${next}`) &&
    !rejectedClaimClause(first, "coordinated-pump") &&
    !rejectedClaimClause(next, "coordinated-pump")
  );
}

function accountRestrictionContinuation(first: string, next: string): boolean {
  const restriction = rules.find((rule) => rule.id === "account-threat")!;
  return (
    first.length <= 300 &&
    next.length <= 300 &&
    restriction.pattern.test(first) &&
    solicitingClaimClause(next, "account-threat") &&
    !rejectedClaimClause(first, "account-threat") &&
    !rejectedClaimClause(next, "account-threat")
  );
}

function authorityPaymentCue(text: string): boolean {
  // A title may occur earlier; legal action attached to a payment request is
  // still a warning cue. Ordinary payment costs do not contain this threat.
  return (
    /arrest|warrant|criminal\s*case|गिरफ्तार|गिरफ़्तार|गिरफ्तारी|गिरफ़्तारी|গ্রেপ্তার|গ্রেফতার|জেলে|মামলা/iu.test(
      text,
    ) &&
    /(?:\b(?:pay|send|transfer|deposit|bhej\w*|jama)\b|जमा|भेज|পাঠা|জমা).{0,100}(?:money|amount|account|address|settlement|पैस|रकम|राशि|खात|भुगतान|টাকা|হিসাব|অ্যাকাউন্ট)|(?:money|amount|account|settlement|payment|पैस|रकम|राशि|खात|भुगतान|টাকা|হিসাব).{0,100}(?:\b(?:pay|send|transfer|deposit|bhej\w*|jama)\b|जमा|भेज|পাঠা|জমা)/iu.test(
      text,
    ) &&
    /\b(?:or|otherwise|unless|to\s*avoid|warna|nahi\s*to)\b|नहीं\s*तो|वरना|वर्ना|ना\s*हुआ|না\s*(?:হলে|দিলে)|নইলে|গ্রেপ্তার.{0,20}এড়াতে|(?:arrest|गिरफ्तारी).{0,20}(?:avoid|रोकने)/iu.test(
      text,
    ) &&
    !rejectedClaimClause(text, "authority-threat")
  );
}

// A payment demand and its explicit "otherwise" threat may occupy adjacent
// sentences. Link that dependency, never arbitrary financial and angry prose.
function coercivePaymentContinuation(first: string, next: string): boolean {
  return (
    first.length <= 300 &&
    next.length <= 300 &&
    /\b(?:pay|repay|send|transfer|deposit|bhejo|bharo|pathao|pathan|dao)\b|payment\s*(?:karo|koro)|भेज|भुगतान|पैसे\s*द|পাঠা|টাকা\s*(?:দিন|দাও)/iu.test(
      first,
    ) &&
    /money|rupees|taka|amount|₹|\d|पैस|रुपय|राशि|টাকা|taka|paisa/iu.test(
      first,
    ) &&
    /^\s*(?:otherwise|or\b|if\s*not|unless|अगर.{0,25}नहीं|वरना|वर्ना|नहीं\s*तो|না\s*(?:হলে|দিলে)|নইলে|নতুবা|warna|nahi\s*(?:to|kiya)|nahole|noile|na\s*(?:hole|dile))/iu.test(
      next,
    ) &&
    abusivePressurePattern.test(next) &&
    !rejectedClaimClause(first, "abusive-pressure") &&
    !rejectedClaimClause(next, "abusive-pressure")
  );
}

function isCautionaryContext(sentence: string, rule: Rule): boolean {
  if (rejectedClaimClause(sentence, rule.id)) return true;
  if (
    rule.id === "release-fee" &&
    /(?:money|taka|payment).{0,25}(?:lagbe\s*na|lage\s*na)|(?:शुल्क|फीस).{0,60}न\s*भेजें/iu.test(
      sentence,
    )
  )
    return true;
  // Explicit refusal/definition is scoped to the current clause. Independent
  // offers are split before these checks; educational nouns alone never exempt it.
  if (
    rule.id === "credentials" &&
    /(?:does?\s*not|never)\s*(?:require|need|ask).{0,60}(?:OTP|PIN|password)|(?:hide|mask|remove).{0,45}(?:OTP|PIN|account\s*numbers?)|(?:password|OTP|PIN).{0,70}(?:zaroorat\s*nahi|dorkar\s*nei)|(?:PIN|OTP).{0,35}मांगे.{0,15}रुकें/iu.test(
      sentence,
    )
  )
    return true;
  if (
    rule.id === "account-threat" &&
    /(?:if|when)\s*(?:a|any)\s*message\s*claims.{0,70}(?:contact|call).{0,30}(?:support|bank)|(?:fake|sample)\s*(?:bank\s*)?(?:SMS|message)/iu.test(
      sentence,
    )
  )
    return true;
  if (
    ["release-fee", "pay-to-earn"].includes(rule.id) &&
    /not\s*an?\s*(?:instruction|request).{0,65}(?:pay|fee)|\bno\s+(?:joining|registration|activation)\s*fee\b/iu.test(
      sentence,
    )
  )
    return true;
  if (
    rule.id === "borrow" &&
    /(?:do\s*not\s*want|does\s*not\s*ask).{0,65}(?:loan|borrow)|borrowing\s*cost.{0,25}not\s*an?\s*investment|ধার\s*নিয়ে.{0,50}বলা\s*হচ্ছে\s*না/iu.test(
      sentence,
    )
  )
    return true;
  if (
    ["guarantee", "periodic", "outsized"].includes(rule.id) &&
    /(?:कोई).{0,65}(?:assured\s*return|गारंटी).{0,40}नहीं|(?:নিশ্চিত\s*আয়|নিশ্চিত\s*আয়).{0,25}বাজেট\s*করিনি|(?:guaranteed\s*extra\s*profit).{0,30}invitation\s*নেই/iu.test(
      sentence,
    )
  )
    return true;

  if (
    rule.id === "credentials" &&
    /(?:OTP|PIN|login\s*code|password|लॉगिन\s*कोड|पिन|ओटीपी).{0,65}(?:न\s*(?:भेजें|बताएं|दें)|साझा\s*न\s*करें|mat\s*(?:bhejo|batao|karna|karo)|na\s*(?:bhejo|batao))/iu.test(
      sentence,
    )
  )
    return true;
  if (
    rule.id === "borrow" &&
    /(?:can|may)\s*(?:magnify|amplify|increase)\s*loss|नुकसान.{0,20}बढ़\s*सकता|nuksan.{0,20}badh\s*sakta|khoti.{0,20}barte\s*pare/iu.test(
      sentence,
    ) &&
    !/(?:take|borrow|join)\s+(?:our|my)|हमारे.{0,25}(?:निवेश|जुड़ें)|hamar[aei].{0,25}(?:invest|join)|amader.{0,25}(?:invest|join)/iu.test(
      sentence,
    )
  )
    return true;
  if (
    rule.id === "off-platform" &&
    /(?:APK|एपीके|এপিকে).{0,65}(?:installation\s*file|install\w*\s*file|इंस्टॉल.{0,20}फाइल|ইনস্টল.{0,20}ফাইল)/iu.test(
      sentence,
    ) &&
    !/(?:download|install)\s*(?:our|this)|हमारा|আমাদের|amader|hamara/iu.test(
      sentence,
    )
  )
    return true;
  // Independent entry is checked by rejectedClaimClause with both the action
  // and destination. An "official app" mention cannot clear a caller or link.
  if (
    ["registration", "impersonation"].includes(rule.id) &&
    /(?:not|never)\s+(?:(?:ever|actually|officially|been|be)\s+){0,2}(?:approv|launch|recommend|endors|register)|(?:मंजूरी|मान्यता|पंजीकरण|लॉन्च|समर्थन).{0,15}नहीं/i.test(
      sentence,
    )
  )
    return true;
  if (
    rule.id === "tip" &&
    /how\s*to\s*(?:buy|sell)|कैसे\s*(?:खरीदें|बेचें)/i.test(sentence)
  )
    return true;
  if (rule.id === "nav")
    return /(?:does\s*not|doesn.t|does\s*n't|cannot)\s*(?:mean|make|prove|indicate)|not\s+(?:necessarily\s+)?(?:cheaper|better)|(?:सस्ता|बेहतर|रिटर्न).{0,25}नहीं\s*(?:होता|होती|है|हैं)|(?:sasta|behtar).{0,15}nahi/i.test(
      sentence,
    );
  if (
    ["tip", "insider", "off-platform", "social-proof", "secrecy"].includes(
      rule.id,
    ) &&
    /\bmeans\b|refers\s*to|defined\s*as|what\s*is\b|क्या\s*है|का\s*मतलब/i.test(
      sentence,
    ) &&
    !/buy\s*now|join\s*(?:our|my)|हमारे.{0,15}जुड़ें/i.test(sentence)
  )
    return true;
  if (
    ["periodic", "outsized"].includes(rule.id) &&
    /(?:not|never)\s*(?:guaranteed|assured)|गारंटी\s*नहीं|गारंटीड\s*नहीं|pakka\s*nahi/i.test(
      sentence,
    )
  )
    return true;
  if (rule.id === "guarantee")
    return /(?:not|never|no|cannot|can.t|don.t|doesn.t|isn.t|aren.t)\s+(?:(?:ever|really|actually|legitimately|possibly|be|been|being|a|financial|investment)\s+){0,3}guarantee|returns?\s+(?:are\s+)?not\s+guaranteed|no investment is risk.?free|not\s+(?:risk.?free|without\s+risk)|गारंटी\s*नहीं|गारंटीड\s*नहीं|बिना\s*जोखिम\s*नहीं|guarantee\s*nahi/i.test(
      sentence,
    );
  return false;
}
function cautionsAboutClaims(sentence: string, rule: Rule): boolean {
  if (/no\s*red\s*flags?|without\s*warning\s*signs?/i.test(sentence))
    return false;
  const index = sentence.search(rule.pattern);
  const prefix = sentence.slice(0, index);
  const suffix = sentence.slice(index);
  if (
    rule.id !== "secrecy" &&
    /\b(?:never|do\s*not|don.t)\s+(?:(?:ever|again|blindly|simply|under\s+any\s+circumstances)\s+){0,3}$/i.test(
      prefix,
    )
  )
    return true;
  if (
    /(?:is|are|do|does)\s*(?:not|never)\s*(?:\w+\s+){0,2}(?:proof|evidence|guarantee)|(?:प्रमाण|सबूत|गारंटी)\s*नहीं/i.test(
      suffix,
    )
  )
    return true;
  if (
    /(?:we|our\s+\w+)\s+(?:offer|promise|guarantee)|join\s+(?:our|my)/i.test(
      prefix,
    )
  )
    return false;
  if (
    /\b(?:warns?|cautions?|cautioned|advised).{0,65}(?:against|not\s*to)|(?:निवेश|भुगतान|भरोसा|विश्वास).{0,15}(?:न\s*करें|मत\s*करें)|सलाह\s*दी\s*जाती.{0,90}न\s*करें|bharosa\s*(?:na\s*karein|mat\s*karo)|(?:vaad[eo]|claims?|schemes?).{0,25}se\s*bachein|fraud\s*ho\s*sakta|scam\s*ho\s*sakta|ऐसे\s*(?:संदेशों|दावों|वादों)\s*से\s*सावधान|(?:दावों|वादों|संदेशों|योजनाओं).{0,15}से\s*सावधान|(?:vaad(?:on|o|e)|claims?|schemes?|offers?).{0,20}se\s*(?:savdhan|saavdhan|satark)/i.test(
      sentence,
    )
  )
    return true;
  return (
    /beware|watch\s*out|warning\s*(?:sign|about)|(?:avoid|spot|recognise|recognize).{0,20}scams?|(?:don.t|never|do\s*not)\s*(?:trust|believe|follow)|झाँसा|झांसा|सावधान|savdhan|saavdhan|satark|ऐसे\s*वादों\s*से\s*बचें|bharosa\s*mat\s*karo/i.test(
      prefix,
    ) ||
    /(?:is|are|as)\s+(?:a\s+)?(?:red\s*flags?|warning\s*signs?)/i.test(
      sentence.slice(index),
    )
  );
}
export function relatedConcepts(text: string): ConceptId[] {
  const matchers: [ConceptId, RegExp][] = [
    ["nav", /\bNAV\b|এনএভি|नेट\s*एसेट|নেট\s*অ্যাসেট/i],
    [
      "diversification",
      /diversif|basket|विविधीकरण|टोकरी|বৈচিত্র্য|ঝুড়ি|ঝুঁড়ি|বিভিন্ন/i,
    ],
    [
      "volatility",
      /volatil|fluctuat|crash|leverag|उतार|अस्थिरता|गिरावट|लीवरेज|ওঠানামা|অস্থিরতা|পতন|লিভারেজ/i,
    ],
    ["compounding", /compound|double|चक्रवृद्धि|दोगुन|চক্রবৃদ্ধি|দ্বিগুণ|ডবল/i],
    ["fees", /fees?|expense|charge|शुल्क|खर्च|ফি|চার্জ|খরচ/i],
    ["nomination", /nomin|nominee|नामांकन|नामित|নমিনি|মনোনয়ন/i],
    ["risk", /risk|guarantee|जोखिम|गारंटी|गारंटीड|ঝুঁকি|গ্যারান্টি/i],
  ];
  return matchers.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
}
export function detectionTextFor(text: string): string {
  const numberWords: Record<string, string> = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
    eleven: "11",
    twelve: "12",
    thirty: "30",
    forty: "40",
    fifteen: "15",
    twenty: "20",
    ninety: "90",
    tees: "30",
    tirish: "30",
    pandrah: "15",
    तीस: "30",
    नब्बे: "90",
    পনেরো: "15",
    তিরিশ: "30",
    एक: "1",
    दो: "2",
    तीन: "3",
    चार: "4",
    पाँच: "5",
    पांच: "5",
    छह: "6",
    सात: "7",
    आठ: "8",
    नौ: "9",
    दस: "10",
    बारह: "12",
    এক: "1",
    দুই: "2",
    তিন: "3",
    চার: "4",
    পাঁচ: "5",
    ছয়: "6",
    ছয়: "6",
    সাত: "7",
    আট: "8",
    নয়: "9",
    দশ: "10",
    বারো: "12",
    ek: "1",
    do: "2",
    teen: "3",
    char: "4",
    panch: "5",
    paanch: "5",
    chhe: "6",
    chhah: "6",
    chhoy: "6",
    choy: "6",
    sat: "7",
    saat: "7",
    ath: "8",
    aat: "8",
    nau: "9",
    noy: "9",
    das: "10",
    dosh: "10",
    barah: "12",
    baro: "12",
    चालीस: "40",
    दोशो: "200",
    দুইশো: "200",
    কুড়ি: "20",
    কুড়ি: "20",
    pach: "5",
    dui: "2",
    hajar: "1000",
  };
  return normalizeDigits(
    normalizeEmojiSeparators(
      text
        .replace(
          /\[(?:email|phone|number|ID|secret) removed\]/g,
          (placeholder) => " ".repeat(placeholder.length),
        )
        .normalize("NFKC")
        .replace(/([\p{Decimal_Number}#*])\ufe0f?\u20e3/gu, "$1")
        .replace(/\p{Default_Ignorable_Code_Point}/gu, "")
        .replace(/[\p{L}\p{M}\d]+/gu, (token) => {
          // Only mixed Latin tokens, or tokens entirely made of these lookalikes,
          // are transliterated. Hindi/Bengali and unrelated scripts are untouched.
          return /[a-z]/i.test(token) ||
            [...token].every((c) => c in latinLookalikes)
            ? [...token].map((c) => latinLookalikes[c] ?? c).join("")
            : token;
        }),
    )
      .replace(
        /(?<![a-z])(?:O\s+T\s+P|U\s+P\s+I|P\s+I\s+N|C\s+V\s+V|K\s+Y\s+C|N\s+A\s+V|G\s+S\s+T|S\s+E\s+B\s+I)(?![a-z])/giu,
        (token) => token.replace(/\s/g, ""),
      )
      .replace(/\bpr0fit\b/gi, "profit")
      .replace(/\b(\d+)O(?=\s*%)/g, "$10")
      .replace(/ओ\s*टी\s*पी|ও\s*টি\s*পি/gu, "OTP")
      .replace(/पी\s*आई\s*एन|পি\s*আই\s*এন/gu, "PIN")
      .replace(/\s+/gu, " "),
  )
    .replace(
      /(?<![\p{L}\p{M}])([\p{L}\p{M}]+)(?=\s+(?:days?|weeks?|months?|years?|hours?|percent|rupees|hundred|thousand|lakh|sau|सौ|हजार|हज़ार|लाख|टাকা|হাজার|লাখ|টাকা|hajar|hazaar|lakh|दिन|दिनों|हफ्ते?|महीने|साल|प्रतिशत|गुना|गुनी|भुगतान|দিন|সপ্তাহ|মাস|বছর|শতাংশ|din|hafte?|mahine?|saal|mashe|bochor|guna)(?![\p{L}\p{M}]))/giu,
      (word) => numberWords[word.toLowerCase()] ?? word,
    )
    .replace(/(?<=\d)\s*(?:percent|प्रतिशत|শতাংশ)(?![\p{L}\p{M}])/giu, "%");
}

// Remove only a quoted example whose surrounding prose explicitly identifies
// and rejects it. Offsets stay aligned with the untouched public message. A later
// independent promise/request remains available for detection.
function reportedExampleMask(text: string): string {
  const frame =
    /awareness\s*poster|poster\s*reproduces|काल्पनिक\s*संदेश|(?:security|safety)\s*(?:class|lesson|exercise|poster|specimen)|सुरक्षा\s*कक्षा|নিরাপত্তা\s*ক্লাস|(?:fake|sample)\s*(?:bank\s*)?(?:SMS|message)|(?:message|invitation)\s*(?:reads|says)|words\s*such\s*as|কেউ\s*যদি\s*বলে|নমুনা|নিরাপত্তা\s*ক্লাস|quoted\s*attack|worksheet|सर्वे\s*प्रश्न|debrief|article|(?:trainer|teacher|शिक्षक|শিক্ষক|workshop|कार्यशाला|কর্মশালা|awareness\s*note|news\s*discussion|book\s*club|handout|जागरूकता\s*पोस्ट|সাক্ষরতার\s*আলোচনা|वित्तीय\s*साक्षरता|चर्चा)/iu;
  const rejection =
    /do\s*not\s*(?:treat|enter|send)|never\s*follow|(?:do\s*not|don.t)\s*(?:follow|share)|quote.{0,25}(?:explain|risk)|OTP\s*kabhi\s*share\s*na|quote\s*par\s*action\s*nahi|বিশ্বাস\s*করবেন\s*না|নির্দেশটি\s*মানবেন\s*না|আমাদের\s*নির্দেশ\s*নয়|দেবেন\s*না|कभी\s*share\s*न|उद्धरण.{0,60}निमंत्रण\s*नहीं/iu;
  return text.replace(
    /"[^"\n]{1,700}"|“[^”\n]{1,700}”|‘[^’\n]{1,700}’|(?<![\p{L}\p{M}])'[^'\n]{1,700}'/gu,
    (quote, offset: number) => {
      // A command to stop saying a quoted claim rejects that quoted wording,
      // not a later independent offer. Match the speech verb attached to this
      // quote rather than a message-wide caution or an unrelated insult.
      const afterQuote = detectionTextFor(text.slice(offset + quote.length));
      if (
        /^\s*(?:(?:कहना|बोलना|दोहराना)\s*(?:बंद\s*कर|छोड़)|(?:বলা|বলতে)\s*বন্ধ\s*কর|(?:বলা|বলতে)\s*থাম)/iu.test(
          afterQuote,
        )
      )
        return " ".repeat(quote.length);
      const beforeQuote = detectionTextFor(text.slice(0, offset));
      if (
        /(?:\bstop\s*(?:saying|claiming|repeating)|(?:मत|न)\s*(?:कहिए|बोलिए|दोहराइए))\s*$/iu.test(
          beforeQuote,
        )
      )
        return " ".repeat(quote.length);
      // Attribute this quote from its own preceding sentence/clause. A safety
      // lesson elsewhere cannot turn a later quoted solicitation into a lesson.
      const preceding = text.slice(0, offset);
      const boundary = Math.max(
        ...[...preceding.matchAll(/[.!?।;\n]/gu)].map((m) => m.index!),
        -1,
      );
      const introduction = preceding.slice(boundary + 1);
      const normalizedIntroduction = detectionTextFor(introduction);
      if (!frame.test(normalizedIntroduction)) return quote;
      const explicitlyTaught =
        /(?:security|safety)\s*(?:class|lesson|exercise|poster|specimen)|सुरक्षा\s*कक्षा|নিরাপত্তা\s*ক্লাস|awareness\s*poster.{0,45}(?:reproduces|quotes|shows)|(?:कक्षा|पाठ).{0,65}काल्पनिक\s*संदेश|(?:নিরাপত্তা\s*ক্লাস).{0,40}নমুনা|worksheet.{0,65}(?:fake|sample).{0,35}(?:quote|example)|सर्वे\s*प्रश्न.{0,55}(?:कथन|उदाहरण)|debrief.{0,35}(?:ছাত্র|student)|(?:fictional|fake).{0,30}(?:fraud|scam).{0,35}(?:SMS|line|quote)|जागरूकता\s*पोस्ट|awareness\s*note/iu.test(
          normalizedIntroduction,
        );
      // Rejection belongs to this example: inspect only its attribution or
      // immediately attached following sentence, never an earlier/later warning
      // elsewhere in the message. Ignore punctuation closing the quoted sentence.
      const following = text
        .slice(offset + quote.length)
        .replace(/^[\s.!?।;]+/u, "");
      const attachedFollowing = detectionTextFor(
        following.split(/[.!?।;\n]/u, 1)[0],
      );
      const rejectedInAttribution =
        /(?:never|do\s*not|don.t)\s*(?:follow|trust|believe).{0,45}(?:message|invitation|claim)|(?:quoted|sample).{0,25}(?:attack|scam)/iu.test(
          normalizedIntroduction,
        );
      const rejectedAfterQuote =
        rejection.test(attachedFollowing) ||
        /(?:\bneed\s*context\b|^[^.!?।]{0,65}থামুন)|(?:कथन|चेतावनी).{0,30}पहचान|(?:कখনও|টাকা)\s*দেবেন\s*না|কথাটা\s*বিশ্লেষণ|(?:phrase|words?).{0,35}(?:niye\s*lekha|being\s*studied)|(?:example|illustration)\s*of\s*(?:a\s*)?(?:misleading|false|deceptive)|(?:abusive|अपमानजनक|অপমানজনক).{0,45}(?:threat|धमकी|হুমকি|dhamki|humkir)|भ्रामक.{0,45}उदाहरण|(?:bhul|gumrah).{0,70}(?:udahoron|misaal)|(?:claim|pitch|দাবির|দাবির|दावे).{0,35}(?:udahoron|উদাহরণ|उदाहरण)|(?:quote|उद्धरण).{0,65}(?:নিমন্ত্রণ\s*নয়|निमंत्रण\s*नहीं|warning|request\s*nahi)|(?:quoted|reported)\s*claims|বর্ণন|समझाया\s*गया|বিভ্রান্তিকর.{0,30}উদাহরণ|gumrah.{0,40}misaal/iu.test(
          attachedFollowing,
        );
      if (!explicitlyTaught && !rejectedInAttribution && !rejectedAfterQuote)
        return quote;
      if (
        /(?:but|however|yet|लेकिन|मगर|কিন্তু|তবে).{0,80}(?:our|my|we|please|send|pay|हमारे|আমাদের)|(?:our|my)\s+(?:own|actual)\s*(?:plan|offer|support)|(?:now|instead)\s*(?:please\s*)?(?:send|pay|join)/iu.test(
          normalizedIntroduction,
        )
      )
        return quote;
      return " ".repeat(quote.length);
    },
  );
}

// Shared scope construction keeps Strong qualification and local findings on
// the same clause. Only an explicit switch to another request/offer splits a
// conjunction; ordinary commas and advisory prefixes remain attached.
function scopedClauses(original: string) {
  const masked = reportedExampleMask(original);
  let cursor = 0;
  const clauses = original
    .split(/(?<=[!?।;])\s*|\.(?=\s|$)/u)
    .flatMap((sentence) =>
      sentence.split(
        /(?:,\s*|\s+(?:but|however|yet|lekin|magar|लेकिन|मगर|परंतु|and|और|কিন্তু|তবে|আর|kintu)\s+)(?=(?:(?:(?:please|now)\s*)?(?:we\b|our\b|my\b|join\s+(?:our|my)\b|send\s|submit\s|pay\s|invest\s|transfer\s)|(?:OTP|PIN|password|ओटीपी|পাসওয়ার্ড|পাসওয়ার্ড|পিন|ওটিপি)\b(?=[^.!?।;\n]{0,65}(?:\b(?:send|share|give|tell|batao|bataiye|bhejo|likh|pathan|pathao|bolun|dao|din)\b|बताए[ंँ]|बताओ|भेजें|दीजिए|পাঠান|বলুন|লিখুন))|हमारे|हमारा|हमारी|हम\s|hamare|hamara|hamari|हमने|আমাদের|আমার|আমরা|amader|amar|mujhe|amake|मुझे|আমাকে|আপনার.{0,15}(?:OTP|PIN|ওটিপি|পিন)|अपना.{0,15}(?:OTP|PIN|ओटीपी|पिन)))/iu,
      ),
    )
    .filter(Boolean)
    .map((sentence) => {
      const start = original.indexOf(sentence, cursor);
      cursor = start + sentence.length;
      return {
        original: sentence,
        detection: masked.slice(start, cursor),
        start,
        end: cursor,
      };
    });
  return clauses.map((clause, index) => {
    const next = clauses[index + 1];
    const previous = clauses[index - 1];
    if (
      previous &&
      accountRestrictionContinuation(
        detectionTextFor(clause.detection),
        detectionTextFor(previous.detection),
      )
    )
      return {
        original: original.slice(previous.start, clause.end),
        detection: masked.slice(previous.start, clause.end),
        start: previous.start,
        end: clause.end,
      };
    if (
      next &&
      (releasePaymentContinuation(
        detectionTextFor(clause.detection),
        detectionTextFor(next.detection),
      ) ||
        paymentEarningContinuation(
          detectionTextFor(clause.detection),
          detectionTextFor(next.detection),
        ) ||
        offerPaymentContinuation(
          detectionTextFor(clause.detection),
          detectionTextFor(next.detection),
        ) ||
        accountRestrictionContinuation(
          detectionTextFor(clause.detection),
          detectionTextFor(next.detection),
        ) ||
        coordinatedTradingContinuation(
          detectionTextFor(clause.detection),
          detectionTextFor(next.detection),
        ) ||
        coercivePaymentContinuation(
          detectionTextFor(clause.detection),
          detectionTextFor(next.detection),
        ))
    )
      return {
        original: original.slice(clause.start, next.end),
        detection: masked.slice(clause.start, next.end),
        start: clause.start,
        end: next.end,
      };
    return clause;
  });
}

const scopedActionFamilies = new Set([
  "guarantee",
  "credentials",
  "release-fee",
  "pay-to-earn",
  "borrow",
  "abusive-pressure",
  "coordinated-pump",
  "account-threat",
  "authority-threat",
]);
function matchesRuleCue(text: string, rule: Rule): boolean {
  if (rule.id === "outsized") return numericClaim(text) !== null;
  if (rule.id === "account-threat")
    return rule.pattern.test(text) && solicitingClaimClause(text, rule.id);
  if (rule.id === "coordinated-pump") return coordinatedTradingCue(text);
  if (rule.id === "authority-threat")
    return rule.pattern.test(text) || authorityPaymentCue(text);
  if (["release-fee", "pay-to-earn", "abusive-pressure"].includes(rule.id))
    return solicitingClaimClause(text, rule.id);
  return (
    rule.pattern.test(text) ||
    (["guarantee", "credentials"].includes(rule.id) &&
      solicitingClaimClause(text, rule.id))
  );
}

/** Qualify a cue only where its exact excerpt occurs in the current input.
 * A finding supplied without a supported, active clause cannot elevate Strong.
 * No input/excerpt normalization is used to invent an exact-text match.
 */
export function isSolicitingFinding(
  input: string,
  finding: Pick<Finding, "id" | "excerpt">,
): boolean {
  if (!input || !finding.excerpt?.trim()) return false;
  const rule = rules.find((candidate) => candidate.id === finding.id);
  if (!rule) return false;
  const excerpt = finding.excerpt;
  const excerptCue = detectionTextFor(reportedExampleMask(excerpt));
  if (!matchesRuleCue(excerptCue, rule)) return false;
  const clauses = scopedClauses(input);
  let index = input.indexOf(excerpt);
  while (index >= 0) {
    const end = index + excerpt.length;
    for (const clause of clauses) {
      if (clause.end <= index || clause.start >= end) continue;
      const text = detectionTextFor(clause.detection);
      const cue = matchesRuleCue(text, rule);
      if (
        cue &&
        !bengaliCaution(text, rule.id) &&
        !isCautionaryContext(text, rule) &&
        !cautionsAboutClaims(text, rule) &&
        solicitingClaimClause(text, rule.id)
      )
        return true;
    }
    index = input.indexOf(excerpt, index + 1);
  }
  return false;
}

export function analyzeClaim(
  raw: string,
  language: Language = "en",
): ClaimAnalysis {
  const original = raw.normalize("NFKC").trim().slice(0, MAX_CLAIM_LENGTH);
  const input = redactSensitive(original).slice(0, MAX_CLAIM_LENGTH);
  const sentences = scopedClauses(original);
  const findings: Finding[] = [];
  const conceptIds = new Set<ConceptId>(relatedConcepts(original));
  for (const rule of rules) {
    if (
      rule.contextPattern &&
      !scopedActionFamilies.has(rule.id) &&
      !rule.contextPattern.test(detectionTextFor(original))
    )
      continue;
    const matchedSentences = sentences.filter((s) => {
      // Match numerals consistently while preserving the original Hindi quote.
      const detectionText = detectionTextFor(s.detection);
      if (
        /^\s*a\s*friend\s*suggested/iu.test(detectionText) &&
        /I\s*declined/iu.test(detectionTextFor(original))
      )
        return false;
      return (
        matchesRuleCue(detectionText, rule) &&
        !bengaliCaution(detectionText, rule.id) &&
        !isCautionaryContext(detectionText, rule) &&
        !cautionsAboutClaims(detectionText, rule)
      );
    });
    const contextualDeadline = (candidate: (typeof sentences)[number]) => {
      const index = sentences.indexOf(candidate);
      const text = detectionTextFor(candidate.detection);
      return (
        ordinaryFinancialDeadline(text) ||
        ordinaryRetailDeadline(
          text,
          detectionTextFor(sentences[index - 1]?.detection ?? ""),
          detectionTextFor(sentences[index + 1]?.detection ?? ""),
        )
      );
    };
    const sentence =
      rule.id === "urgency"
        ? (matchedSentences.find((s) => !contextualDeadline(s)) ??
          matchedSentences[0])
        : scopedActionFamilies.has(rule.id)
          ? (matchedSentences.find((s) =>
              solicitingClaimClause(detectionTextFor(s.detection), rule.id),
            ) ?? matchedSentences[0])
          : matchedSentences[0];
    if (sentence) {
      findings.push({
        id: rule.id,
        severity:
          (rule.id === "urgency" && contextualDeadline(sentence)) ||
          (scopedActionFamilies.has(rule.id) &&
            !solicitingClaimClause(
              detectionTextFor(sentence.detection),
              rule.id,
            ))
            ? "context"
            : rule.severity,
        title: rule.title,
        explanation: rule.explanation,
        excerpt: redactSensitive(sentence.original).slice(0, 400),
        sourceIds: rule.sourceIds,
      });
      conceptIds.add(rule.concept);
    }
  }
  const contentType = contentTypeFor(original, findings);
  const attention = findings.some((f) => f.severity === "attention");
  if (!conceptIds.size) conceptIds.add("risk");
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    input,
    language,
    status: attention ? "attention" : "context",
    contentType,
    summary: summaryFor(findings),
    languageNotice: unsupportedLanguageNotice(original),
    findings,
    sourceIds: [...new Set(findings.flatMap((f) => f.sourceIds))],
    lessonIds: [...conceptIds].slice(0, 3),
    mode: "local",
    aiAssisted: false,
    limitations: l(
      "This is a language-pattern check against a small educational reference library. It has not verified the sender, opened links, checked a live registry, or established the truth of the claim. Missing a warning sign does not mean a message is safe.",
      "यह सीमित शैक्षिक संदर्भों के आधार पर भाषा के संकेत पहचानता है। भेजने वाले, लिंक या लाइव पंजीकरण की जाँच नहीं हुई है और दावे की सच्चाई स्थापित नहीं हुई है। चेतावनी न मिलना सुरक्षा का प्रमाण नहीं है।",
    ),
  };
}
export function calculateScenario(
  start: number,
  changePercent: number,
  leverage: number,
  feePercent: number,
) {
  if (
    ![start, changePercent, leverage, feePercent].every(Number.isFinite) ||
    start <= 0 ||
    changePercent < -100 ||
    changePercent > 100 ||
    leverage < 1 ||
    leverage > 3 ||
    feePercent < 0 ||
    feePercent > 5
  )
    throw new Error("Invalid fictional scenario");
  const exposure = start * leverage;
  const debt = exposure - start;
  const assetValue = exposure * (1 + changePercent / 100);
  const fee = (exposure * feePercent) / 100;
  const remaining = assetValue - debt - fee;
  return {
    exposure,
    debt,
    assetValue,
    fee,
    remaining,
    loss: start - remaining,
    change: (remaining / start - 1) * 100,
    recoveryPercent:
      remaining > 0 && remaining < start ? (start / remaining - 1) * 100 : null,
  };
}
