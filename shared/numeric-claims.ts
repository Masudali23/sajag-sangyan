// These are screening calculations on the sender's numbers, never a forecast.
// 24% is a prototype review threshold, not a regulatory limit or a safe-return
// threshold. Fees/taxes, historical market reporting and examples need context.
const digitCache = new Map<string, string>();
export function normalizeDigits(value: string): string {
  return value.replace(/\p{Decimal_Number}/gu, (digit) => {
    const cached = digitCache.get(digit);
    if (cached) return cached;
    const code = digit.codePointAt(0)!;
    let start = code;
    while (/\p{Decimal_Number}/u.test(String.fromCodePoint(start - 1))) start--;
    const normalized = String((code - start) % 10);
    digitCache.set(digit, normalized);
    return normalized;
  });
}

type Period = { days: number; index: number; quantified: boolean };
export type NumericCue = {
  kind: "percentage" | "amount-ratio" | "multiplier" | "periodic-payout";
  annualizedPercent?: number;
};
const unitDays = (unit: string) =>
  /hour|ঘণ্ট|ঘন্ট|ghonta/i.test(unit)
    ? 1 / 24
    : /year|saal|साल|वर्ष|annual|सालाना|वार्षिक|বছর|বার্ষিক|bochor/i.test(unit)
      ? 365
      : /month|mahin|मही|माह|मासिक|মাস|mashe|mase|masik|\bmas\b/i.test(unit)
        ? 365 / 12
        : /week|haft|हफ्त|सप्ताह|সপ্তাহ|সাপ্তাহিক|soptah|শুক্রবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শনিবার|রবিবার/i.test(
              unit,
            )
          ? 7
          : 1;

function periods(text: string): Period[] {
  const result: Period[] = [];
  const quantified =
    /(\d+(?:\.\d+)?)\s*(days?|weeks?|months?|years?|hours?|ঘণ্টা|ঘন্টা|ghontay|ghonta|din|hafte?|mahine?|saal|दिन|हफ्ते?|महीन[ेा]|माह|साल|वर्ष|দিন|সপ্তাহ|মাস|বছর|dine|mashe|mase|bochor)/gi;
  for (const match of text.matchAll(quantified)) {
    const days = Number(match[1]) * unitDays(match[2]);
    if (days > 0) result.push({ days, index: match.index!, quantified: true });
  }
  const recurring =
    /\b(?:daily|weekly|monthly|annually|annual|yearly|tomorrow|kal|roz|roj)\b|(?:per|every|a)\s+(?:day|week|month|year)|(?:har|pichle|agle)\s*(?:din|hafte?|mahine?)|(?:हर|अगले|पिछले)\s*(?:दिन|हफ्ते?|महीने)|रोज़?|प्रतिदिन|मासिक|सालाना|वार्षिक|साप्ताहिक|कल|প্রতিদিন|রোজ|দৈনিক|প্রতি\s*(?:দিন|সপ্তাহ|মাস|বছর)(?:ে)?|প্রতি\s*(?:শুক্রবার|সোমবার|মঙ্গলবার|বুধবার|বৃহস্পতিবার|শনিবার|রবিবার)|মাসে|দিনে|সপ্তাহে|বার্ষিক|মাসিক|সাপ্তাহিক|আগামীকাল|protidin|protimashe|proti\s*(?:din|mas|soptah|bochor)/gi;
  for (const match of text.matchAll(recurring))
    result.push({
      days: unitDays(match[0]),
      index: match.index!,
      quantified: false,
    });
  return result;
}
function annualized(multiple: number, days: number) {
  if (!(multiple > 1 && days > 0)) return 0;
  // Cap before exponentiation to avoid infinity/overflow from absurd inputs.
  return (
    100 *
    Math.expm1(Math.min((Math.log(multiple) * 365) / days, Math.log(10001)))
  );
}
const investment =
  /invest|trad|returns?|profits?|earn|gain|grew|growth|pays?|deposit|scheme|platform|income|money|fund|stock|crypto|bitcoin|rewards?|stak|paisa|paise|kama|kamai|munafa|lagao|milenge|रिटर्न|मुनाफ|लाभ|कमाई|कमा|निवेश|पैसा|पैसे|रकम|भुगतान|पाना|पाइए|मिलेगा|मिलेंगे|ब्याज|क्रिप्टो|বিনিয়োগ|বিনিয়োগ|লাভ|রিটার্ন|টাকা|আয়|আয়|রোজগার|তহবিল|ট্রেড|ক্রিপ্টো|পাবেন|সুদ|taka|labh|rojgar|paben/i;
const payout =
  /\bfix(?:ed)?\b|assured|guarantee|pakka|pakki|pays?|earn|kamao|kama[ny]|milega|milenge|पक्का|पक्की|तय|निश्चित|कमाई|कमा|पाइए|নিশ্চিত|ফিক্সড|পাবেন|কামান|আয়|আয়|রোজগার|রাখলেই|paben|nischit/i;
const amountUnits = String.raw`(?:hundred|thousand|hazaar|hazar|hajar|lakh|lac|crore|million|sau|सौ|लाख|करोड़|हजार|हज़ार|লাখ|লক্ষ|কোটি|হাজার|k\b)`;
const amountPattern = new RegExp(
  String.raw`(?:₹|\bRs\.?|\bINR|\$)\s*(\d[\d,]*(?:\.\d+)?)\s*(${amountUnits})?|(\d[\d,]*(?:\.\d+)?)\s*(${amountUnits})?\s*(rupees\b|INR\b|USDT\b|BTC\b|ETH\b|रुपये|रुपए|টাকা|taka\b)|(?<![\p{L}\p{M}\d])(\d[\d,]*(?:\.\d+)?)\s*(${amountUnits})(?![\p{L}\p{M}])`,
  "giu",
);
function amounts(text: string) {
  return [...text.matchAll(amountPattern)]
    .filter((m) => {
      if (!m[6]) return true;
      const before = text.slice(Math.max(0, m.index! - 45), m.index!);
      const after = text.slice(
        m.index! + m[0].length,
        m.index! + m[0].length + 35,
      );
      // An unlabelled denomination needs an investment/payout relationship,
      // rather than a headcount, measurement or arbitrary large number.
      if (
        /^\s*(?:members?|users?|people|views?|orders?|units?|litres?|kilograms?|kg|hours?|days?)\b/iu.test(
          after,
        )
      )
        return false;
      return (
        /\b(?:invest|deposit|send|transfer|receive|get|earn|pays?)\b[^.!?;]{0,35}$/iu.test(
          before,
        ) ||
        /^\s*(?:lagao|invest|deposit|jama|joma|pays?|fix(?:ed)?|every|per|milega|milenge|पक्का|मिले|जमा|পাবেন|নিশ্চিত)/iu.test(
          after,
        )
      );
    })
    .map((m) => {
      const unit = m[2] || m[4] || m[7] || "";
      const scale = /lakh|lac|लाख|লাখ|লক্ষ/i.test(unit)
        ? 1e5
        : /crore|करोड़|কোটি/i.test(unit)
          ? 1e7
          : /million/i.test(unit)
            ? 1e6
            : /thousand|hazaar|hazar|hajar|हजार|हज़ार|হাজার|^k$/i.test(unit)
              ? 1e3
              : /hundred|sau|सौ/i.test(unit)
                ? 100
                : 1;
      return {
        value: Number((m[1] || m[3] || m[6]).replaceAll(",", "")) * scale,
        index: m.index!,
        currency: m[1]
          ? m[0].trimStart().startsWith("$")
            ? "USD"
            : "INR"
          : m[5]
            ? /rupees|INR|रुपये|रुपए/iu.test(m[5])
              ? "INR"
              : m[5].toUpperCase()
            : null,
      };
    });
}

// Exclude the measured cost/business clause, not a whole message containing
// "loan" or "revenue". A later investment offer must remain available to screen.
function withoutNonReturnMeasurements(text: string): string {
  const clauses = text.split(
    /([;—]|,\s+(?=\p{L})|\b(?:and|but|however|yet|while|lekin|magar)\b|(?:लेकिन|मगर|परंतु|और|কিন্তু|তবে|আর))/iu,
  );
  let previousWasCostOrMetric = false;
  return clauses
    .map((clause, index) => {
      if (index % 2) return clause;
      const explicitReturn =
        /\b(?:returns?|yield|roi)\b|(?:invest|deposit).{0,45}(?:earn|get|receive|profit)|(?:your|you|investors?).{0,30}(?:earn|receive|gain|make|profit)|रिटर्न|निवेश.{0,35}(?:मिल|पाइ|कमा)|রিটার্ন|বিনিয়োগ.{0,35}(?:লাভ|পাবেন|আয়)/i.test(
          clause,
        );
      const borrowingCost =
        /(?:credit\s*card|loan|borrow|debt|ऋण|कर्ज़?|लोन|उधार|क्रेडिट\s*कार्ड).{0,50}(?:interest|APR|cost|rates?|charg|ब्याज|लागत|शुल्क)|(?:interest|APR|charg|ब्याज|लागत|शुल्क).{0,45}(?:credit\s*card|loan|borrow|debt|ऋण|कर्ज़?|लोन|उधार|क्रेडिट\s*कार्ड)|interest\s+(?:is\s+)?charged|(?:ক্রেডিট\s*কার্ড|ঋণ|লোন|ধার).{0,50}(?:সুদ|খরচ|চার্জ)|(?:সুদ|চার্জ).{0,45}(?:ঋণ|লোন|কার্ড)/i.test(
          clause,
        );
      const operatingMetric =
        /(?:company|business|firm|कंपनी).{0,35}(?:revenue|sales|(?:net|operating)\s*profit|turnover|राजस्व|बिक्री|मुनाफा|लाभ)|(?:revenue|sales|(?:net|operating)\s*profit|turnover|राजस्व|बिक्री).{0,35}(?:grew|growth|rose|increase|double|बढ़|दोगुना)|(?:কোম্পানি|ব্যবসা).{0,30}(?:আয়|বিক্রি|লাভ|রাজস্ব)|(?:রাজস্ব|বিক্রি).{0,30}(?:বেড়েছে|বৃদ্ধি|দ্বিগুণ)/i.test(
          clause,
        );
      // "3.5% monthly, which is over 40% yearly" describes the same metric.
      const continuation =
        previousWasCostOrMetric &&
        /^\s*(?:which\s+(?:is|means)|that\s+(?:is|means)|equivalent\s+to|यानी|अर्थात|অর্থাৎ|মানে)/i.test(
          clause,
        );
      const nonReturn =
        !explicitReturn && (borrowingCost || operatingMetric || continuation);
      previousWasCostOrMetric = nonReturn;
      return nonReturn ? " ".repeat(clause.length) : clause;
    })
    .join("");
}

export function numericClaim(sentence: string): NumericCue | null {
  const text = withoutNonReturnMeasurements(
    normalizeDigits(sentence.normalize("NFKC")),
  );
  const times = periods(text);
  const closest = (index: number) =>
    times.reduce((a, b) =>
      Math.abs(a.index - index) <= Math.abs(b.index - index) ? a : b,
    );
  if (times.length && investment.test(text)) {
    for (const match of text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)) {
      // Accuracy/member/discount/tax percentages are not investment returns.
      const local = text.slice(
        Math.max(0, match.index! - 18),
        match.index! + match[0].length + 25,
      );
      if (
        /accurac|tax|GST|TDS|discount|expense|exit\s*load|शुल्क|टैक्स|छूट|ফি|চার্জ|(?<![\p{L}\p{M}])কর(?![\p{L}\p{M}])|ট্যাক্স|ছাড়|খরচ/iu.test(
          local,
        )
      )
        continue;
      const rate = Number(match[1]);
      const percent = annualized(1 + rate / 100, closest(match.index!).days);
      if (percent >= 24)
        return { kind: "percentage", annualizedPercent: percent };
    }
  }
  const money = amounts(text);
  if (
    times.length &&
    money.length >= 2 &&
    investment.test(text) &&
    new Set(money.map((amount) => amount.currency)).size === 1
  ) {
    const from = money[0].value,
      to = money[money.length - 1].value;
    const duration = Math.max(...times.map((t) => t.days));
    // For a stated monthly contribution, compare against all contributions,
    // not just the first deposit. This is a conservative screening bound, not IRR.
    const recurringContribution =
      /(?:har\s*mahine|हर\s*महीने|monthly|প্রতি\s*মাসে|প্রতিমাসে).{0,35}(?:do\b|दे|जमा|contribut|pay|জমা|রাখেন|রাখুন|দেন)/i.test(
        text,
      );
    const principal =
      from *
      (recurringContribution
        ? Math.max(1, Math.round(duration / (365 / 12)))
        : 1);
    const percent =
      principal > 0 && Number.isFinite(principal) && Number.isFinite(to)
        ? annualized(to / principal, duration)
        : 0;
    if (percent >= 24)
      return { kind: "amount-ratio", annualizedPercent: percent };
  }
  const multipliers =
    /(?:\b(\d+(?:\.\d+)?)\s*[x×]\b|\b(\d+(?:\.\d+)?)\s*(?:गुना|गुनी|guna|গুণ|গুন)|double|doubl(?:e|ing)|डबल|दोगुना|दुगुना|तीन\s*गुना|triple|तिगुना|দ্বিগুণ|দুগুণ|ডবল|ডাবল|তিনগুণ)/gi;
  for (const match of text.matchAll(multipliers)) {
    const multiple =
      match[1] || match[2]
        ? Number(match[1] || match[2])
        : /तीन|triple|तिगुना|তিনগুণ/i.test(match[0])
          ? 3
          : 2;
    if (!times.length) {
      if (
        multiple >= 2 &&
        (investment.test(text) || /made|earned|बना|कमाया/i.test(text))
      )
        return { kind: "multiplier" };
      continue;
    }
    const duration =
      times.find(
        (t) =>
          t.quantified &&
          t.index >= match.index! &&
          t.index - match.index! < 60,
      ) ||
      times
        .filter((t) => t.quantified)
        .sort(
          (a, b) =>
            Math.abs(a.index - match.index!) - Math.abs(b.index - match.index!),
        )[0] ||
      closest(match.index!);
    const percent = annualized(multiple, duration.days);
    if (percent >= 24)
      return { kind: "multiplier", annualizedPercent: percent };
  }
  // A payout without starting capital cannot honestly be annualised. Still
  // identify promised short-period earnings; do not invent a percentage.
  if (
    money.length &&
    investment.test(text) &&
    payout.test(text) &&
    times.some((t) => t.days <= 31)
  ) {
    if (
      !/(?:freelance|freelancing)\s*(?:work|pay|income|job|contract)|(?:hourly|daily)\s*(?:wage|work\s*pay)|(?:काम|কাজের).{0,15}(?:वेतन|मजदूरी|বেতন|মজুরি)/iu.test(
        text,
      ) &&
      !/salary|wage|take[ -]*home\s*pay|rent|pension|cost|expense|fee|budget|withdraw|tax|salary|तनख्वाह|वेतन|खर्च|किराया|पेंशन|फीस|বেতন|মাইনে|ভাড়া|পেনশন|খরচ|ফি|ট্যাক্স/i.test(
        text,
      )
    )
      return { kind: "periodic-payout" };
  }
  return null;
}
