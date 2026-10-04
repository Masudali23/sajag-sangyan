// Bengali/Banglish language cues extend the same reviewed warning families.
// These identify wording, not truth, identity, authorization or future returns.
export const bengaliPatterns: Record<string, RegExp> = {
  credentials:
    /(?:OTP|ওটিপি|ওটিপি কোড|পিন|PIN|পাসওয়ার্ড|পাসওয়ার্ড|password|লগইন|login).{0,35}(?:বলুন|জানান|পাঠান|দিন|শেয়ার|শেয়ার|pathan|din|bolun|share\s*kor)|(?:শেয়ার|শেয়ার|পাঠান|জানান|share\s*korun|pathan).{0,30}(?:OTP|পিন|পাসওয়ার্ড|পাসওয়ার্ড|password|লগইন)|(?:ডিম্যাট|demat).{0,25}(?:আমরা|আমাদের).{0,20}(?:চালাব|সামলাব)|(?:AnyDesk|TeamViewer).{0,30}(?:খুলুন|ইনস্টল|চালু)/i,
  "account-threat":
    /(?:অ্যাকাউন্ট|একাউন্ট|খাতা|account).{0,30}(?:বন্ধ|ব্লক|স্থগিত|আটকে|bondho|block)|(?:KYC|কেওয়াইসি).{0,25}(?:বাকি|মেয়াদ|মেয়াদ|হয়নি|হয়নি|baki)/i,
  "authority-threat":
    /ডিজিটাল\s*(?:অ্যারেস্ট|অ্যারেস্ট|এরেস্ট|গ্রেপ্তার)|digital\s*arrest|(?:পুলিশ|সিবিআই|সিবিআই|CBI|RBI|আরবিআই).{0,100}(?:গ্রেপ্তার|গ্রেফতার|মামলা|জেলে)|(?:গ্রেপ্তার|মামলা).{0,70}(?:টাকা|জমা|পাঠান|ট্রান্সফার)|নিরাপদ\s*অ্যাকাউন্ট.{0,35}(?:টাকা|পাঠান)/i,
  "release-fee":
    /(?:টাকা|লাভ|তহবিল|taka|profit).{0,30}(?:তুলতে|ছাড়াতে|ছাড়াতে|ফেরত|আটকে|তোলা|tulte|ferot).{0,50}(?:ফি|ট্যাক্স|কর|জমা|GST|fee|tax)|(?:ফি|ট্যাক্স|GST|সিকিউরিটি\s*ডিপোজিট).{0,50}(?:টাকা|লাভ).{0,20}(?:ছাড়|ছাড়|তুল|ফেরত)|(?:রিকভারি|প্রসেসিং|অগ্রিম).{0,15}(?:ফি|চার্জ)/i,
  "off-exchange":
    /ডাব্বা|ডব্বা|ডিম্যাট\s*ছাড়া.{0,25}(?:ট্রেড|শেয়ার|শেয়ার)|(?:ফরেক্স|ফরেক্স ট্রেডিং|forex).{0,45}(?:লাভ|রিটার্ন|আয়|আয়|labh|ay)|(?:লাভ|রিটার্ন).{0,30}ফরেক্স/i,
  "coordinated-pump":
    /(?:সবাই|একসঙ্গে|একসাথে|আমরা|গ্রুপ).{0,35}(?:কিনব|কিনুন|কিনে).{0,45}(?:দাম|বেচ|বিক্রি|পাম্প)|(?:দাম|দর).{0,20}বাড়িয়ে.{0,25}(?:বেচ|বিক্রি)|(?:sobai|eksathe).{0,30}(?:kinbo|kinun).{0,35}(?:dam|bech)/i,
  guarantee:
    /গ্যারান্টি|গ্যারান্টিড|নিশ্চিত\s*(?:লাভ|রিটার্ন|আয়|আয়)|ঝুঁকি\s*(?:ছাড়া|ছাড়া|নেই)|ঝুঁকিমুক্ত|লোকসান\s*(?:নেই|হবে\s*না)|(?:nishchit|nischit)\s*(?:labh|return)|jhuki\s*(?:nei|chara)|loss\s*hobe\s*na/i,
  urgency:
    /এখনই|এক্ষুনি|আজই|সীমিত\s*সময়|সীমিত\s*সময়|শেষ\s*সুযোগ|(?:ekhuni|ekhoni|ajkei).{0,25}(?:join|kinun|korun|pathan)|শেষ\s*\d+\s*(?:সিট|জায়গা)/i,
  registration:
    /(?:SEBI|সেবি|RBI|আরবিআই).{0,25}(?:অনুমোদিত|অনুমতি|রেজিস্টার্ড|নিবন্ধিত|approved|registered|onumodito|anumodito)|(?:অনুমোদিত|নিবন্ধিত).{0,20}(?:SEBI|সেবি|RBI|আরবিআই)/i,
  // Numeric claims are handled by shared/numeric-claims, including Bengali digits.
  outsized: /দ্বিগুণ|দুগুণ|ডবল|ডাবল|তিনগুণ|double|প্রতিদিন|প্রতি\s*মাসে/i,
  promotion:
    /(?:আমাদের|আমার).{0,30}(?:গ্রুপ|চ্যানেল|কোর্স|স্কিম|অ্যাপ).{0,35}(?:যোগ\s*দিন|জয়েন|জয়েন|কিনুন|নিন)|(?:যোগ\s*দিন|জয়েন|জয়েন).{0,30}(?:গ্রুপ|চ্যানেল|কোর্স|VIP)|রেফারেল\s*(?:কোড|লিংক)|প্রোমো\s*কোড|(?:amader|amar).{0,20}(?:group|course).{0,20}(?:join|kinun)/i,
  nav: /(?:কম|সস্তা|ছোট).{0,12}(?:NAV|এনএভি)|(?:NAV|এনএভি).{0,25}(?:সস্তা|বেশি\s*লাভ|ভালো\s*রিটার্ন)|kom\s*(?:NAV|এনএভি)|(?:NAV|এনএভি).{0,20}(?:sosta|beshi\s*labh)/i,
  tip: /(?:শেয়ার|শেয়ার|স্টক|stock|share).{0,40}(?:কিনুন|কিনে\s*নিন|কিনে\s*ফেলুন|বেচুন|কিনে\s*রাখুন|kinun)|(?:কিনে\s*নিন|কিনুন).{0,35}(?:শেয়ার|শেয়ার|স্টক)|আপার\s*সার্কিট|মাল্টিব্যাগার|জ্যাকপট\s*স্টক|(?:টার্গেট|target).{0,15}(?:₹|\d)|(?:share|stock).{0,30}(?:kinun|kine\s*nin)|share.{0,30}(?:kal|agamikal).{0,20}(?:barbe|upor).{0,30}(?:kinun|kine)/i,
  insider:
    /ভিতরের\s*খবর|ভেতরের\s*খবর|ইনসাইডার|অপারেটর.{0,25}(?:খবর|টিপ|স্টক|কিন)|(?:bhitorer|bhetorer)\s*khobor/i,
  impersonation:
    /(?:অর্থমন্ত্রী|প্রধানমন্ত্রী|আম্বানি|আদানি|সেবি|আরবিআই|মন্ত্রী).{0,70}(?:অ্যাপ|প্ল্যাটফর্ম|ট্রেডিং|আয়|আয়|লাভ|চালু)|(?:অ্যাপ|প্ল্যাটফর্ম).{0,55}(?:অর্থমন্ত্রী|প্রধানমন্ত্রী|আম্বানি|আদানি)|(?:orthomontri|pradhanmontri|prodhanmontri).{0,70}(?:app|platform|chalu)|(?:Ambani|Adani).{0,50}(?:taka|labh|ay)/i,
  periodic:
    /(?:ফিক্সড|নিশ্চিত|গ্যারান্টি|পাকা|fixed|nischit).{0,40}(?:\d+(?:\.\d+)?\s*%).{0,25}(?:মাসে|দিনে|সপ্তাহে|mashe|mase|dine)|(?:প্রতি\s*মাসে|প্রতিদিন|প্রতি\s*সপ্তাহে).{0,25}(?:নিশ্চিত|ফিক্সড|গ্যারান্টি)/i,
  "pay-to-earn":
    /(?:রেজিস্ট্রেশন|জয়েনিং|জয়েনিং|অ্যাক্টিভেশন|যোগদানের|registration|joining).{0,15}(?:ফি|fee)|(?:টাস্ক|রিভিউ|লাইক|ভিডিও).{0,40}(?:আয়|আয়|কামান|রোজগার).{0,40}(?:জমা|ফি|পাঠান)/i,
  "off-platform":
    /প্লে\s*স্টোরে\s*নেই|(?:APK|এপিকে).{0,30}(?:ইনস্টল|লিংক|ডাউনলোড)|(?:ইনস্টল|ডাউনলোড).{0,30}(?:APK|এপিকে)|প্রি[- ]?আইপিও|প্রাক[- ]?আইপিও|ইনস্টিটিউশনাল\s*অ্যাকাউন্ট|প্লে\s*প্রোটেক্ট.{0,20}বন্ধ|play\s*store.{0,15}nei/i,
  "social-proof":
    /(?:লাভের|পেমেন্ট|উইথড্রয়াল|উইথড্রয়াল).{0,15}স্ক্রিনশট|(?:হাজার|লক্ষ|\d+).{0,15}সদস্য|(?:সদস্য|মানুষ).{0,25}(?:লাভ|কামাচ্ছেন|আয়|আয়)|labher\s*screenshot/i,
  secrecy:
    /কাউকে\s*বলবেন\s*না|কাউকে\s*জানাবেন\s*না|গোপন\s*(?:কৌশল|স্ট্র্যাটেজি|টিপ|খবর)|kauke\s*bolben\s*na|gopon\s*(?:strategy|tips|koushol)/i,
  borrow:
    /(?:ঋণ|ধার|লোন|উধার).{0,30}(?:বিনিয়োগ|বিনিয়োগ|ট্রেড|শেয়ার|শেয়ার)|লিভারেজ|মার্জিন\s*ট্রেড|dhar.{0,20}(?:invest|trade)/i,
};
// Parallel wording from the same account/identity/advance-fee themes. These
// are authored multilingual contrasts, not additional downloaded examples.
const requestExtensions: Record<string, RegExp> = {
  credentials:
    /(?:পাসওয়ার্ড|পাসওয়ার্ড|ওটিপি|পিন|সিভিভি|password|OTP|PIN|CVV).{0,30}(?:লিখুন|দাখিল|সাবমিট|দিতে\s*হবে|submit\s*korun|likhun)|(?:সাবমিট|লিখুন|পাঠান|submit\s*korun).{0,25}(?:পাসওয়ার্ড|পাসওয়ার্ড|ওটিপি|পিন|সিভিভি)|(?:লিংক|লিঙ্ক).{0,35}(?:প্যান|আধার|PAN|Aadhaar).{0,25}(?:আপডেট|পাঠান|দিন|জমা)|(?:প্যান|আধার).{0,35}(?:আপডেট|পাঠান|জমা).{0,35}(?:লিংক|লিঙ্ক)/i,
  "account-threat":
    /(?:কার্ড|সিম|অ্যাকাউন্ট|একাউন্ট|card|sim).{0,40}(?:বন্ধ|ব্লক|নিষ্ক্রিয়|নিষ্ক্রিয়|স্থগিত|bondho|bondh|block|suspend|deactivate)|(?:বন্ধ|ব্লক|নিষ্ক্রিয়).{0,20}(?:কার্ড|অ্যাকাউন্ট)|(?:কেওয়াইসি|কেওয়াইসি|KYC).{0,25}(?:অসম্পূর্ণ|শেষ|বাকি|baki|shesh)/i,
  "release-fee":
    /(?:পুরস্কার|লটারি|লটারি|জিতেছেন|prize|lottery|puroskar).{0,75}(?:ফি|চার্জ|জমা|fee|charge|joma)|(?:ফি|চার্জ|fee).{0,45}(?:পুরস্কার|লটারি|prize|puroskar)/i,
  promotion:
    /ক্যাশব্যাক|ক্যাশ\s*ব্যাক|(?:ছাড়|ছাড়|ডিসকাউন্ট|discount).{0,45}(?:কিনুন|কেনাকাটা|shop|নিন)|(?:অফার|offer).{0,30}(?:জিবি|GB|MB)|cash\s*back/i,
};
// Visible v2 development contrasts add ordinary polite request forms, reverse
// payment/borrowing order and romanised equivalents without new categories.
const developmentExtensions: Record<string, RegExp> = {
  credentials:
    /(?:লগইন|সত্যাপন|যাচাই|গোপন)\s*কোড.{0,80}(?:পাঠিয়ে|পাঠিয়ে|জানান|বলুন|দিন)|(?:login|verification|security)\s*code.{0,80}(?:pathiye|pathan|din)/iu,
  "authority-threat":
    /(?:police|CBI|RBI).{0,80}(?:greptar|grefter|mamla)|(?:greptar|grefter).{0,55}(?:taka|pathan|safe\s*account)/iu,
  "release-fee":
    /(?:taka|withdrawal).{0,60}(?:fee|charge).{0,25}(?:joma|din)|(?:clearance|processing|recovery).{0,20}(?:ফি|চার্জ|fee|charge)/iu,
  "off-platform":
    /(?:APK|এপিকে).{0,85}(?:ইনস্টল|ডাউনলোড)|প্লে\s*স্টোর\s*থেকে\s*নয়/iu,
  borrow:
    /(?:বিনিয়োগ|বিনিয়োগ|ট্রেডিং).{0,60}(?:ঋণ|ধার|লোন).{0,20}(?:নিন|করুন)|(?:invest|trading).{0,60}(?:loan|dhar|rin).{0,20}(?:nin|korun)/iu,
};
// External-development request contrasts, using the existing reviewed families.
const externalExtensions: Record<string, RegExp> = {
  credentials:
    /(?:OTP|PIN|password|পাসওয়ার্ড|পাসওয়ার্ড|ওটিপি|পিন|কোড).{0,65}(?:পাঠিয়ে|পাঠিয়ে|type\s*koro|\bdao\b|reply\s*করুন)|(?:ছয়|ছয়)\s*অঙ্কের\s*কোড.{0,50}(?:পাঠিয়ে|পাঠিয়ে)/iu,
  "release-fee":
    /(?:সক্রিয়করণ|অ্যাক্টিভেশন).{0,15}ফি|(?:জিএসটি|কর).{0,65}(?:জমা|দিন)|(?:legal\s*seal|clearance|cashout).{0,55}(?:fee|charge)|(?:upgrade).{0,40}(?:money|টাকা).{0,20}(?:lagbe|দিতে)/iu,
  guarantee:
    /(?:নিশ্চিত|স্থির).{0,15}(?:লাভ|ফেরত|ট্রেড)|(?:sure|fixed)\s*(?:profit|income|labh)|(?:loss).{0,15}ZERO|(?:guarantee).{0,15}(?:korchi|ache)|(?:মূলধন|principal).{0,25}(?:সমান\s*লাভ|written\s*promise)/iu,
  borrow:
    /(?:ঋণ|ধার).{0,20}(?:নিন|করুন)|\bdhar\s*(?:kore|niye).{0,30}(?:entry|invest|trade)/iu,
  insider:
    /\boperator\b.{0,35}(?:contact|sathe)|(?:অপারেটর).{0,25}(?:যোগাযোগ|খবর)/iu,
  "off-exchange": /ব্রোকার\s*ছাড়াই.{0,35}(?:শেয়ার|শেয়ার|ট্রেড)/iu,
  "pay-to-earn":
    /(?:rating|task).{0,85}(?:deposit|recharge)|(?:deposit|recharge).{0,40}(?:task|income|আয়|আয়)|(?:recharge).{0,45}(?:income|আয়|আয়)|(?:cashout).{0,40}(?:level).{0,15}(?:কিনতে|kinte)/iu,
};
for (const [id, pattern] of Object.entries(externalExtensions)) {
  bengaliPatterns[id] = new RegExp(
    `(?:${bengaliPatterns[id].source})|(?:${pattern.source})`,
    "iu",
  );
}

for (const [id, pattern] of Object.entries(developmentExtensions)) {
  bengaliPatterns[id] = new RegExp(
    `(?:${bengaliPatterns[id].source})|(?:${pattern.source})`,
    "iu",
  );
}

for (const [id, pattern] of Object.entries(requestExtensions)) {
  bengaliPatterns[id] = new RegExp(
    `(?:${bengaliPatterns[id].source})|(?:${pattern.source})`,
    "iu",
  );
}

export const bengaliContexts: Record<string, RegExp> = {
  "account-threat":
    /লিংক|লিঙ্ক|আপডেট|ওটিপি|OTP|পাসওয়ার্ড|পাসওয়ার্ড|এখনই|এক্ষুনি|এখন|ফোন|কল\s*করুন|যোগাযোগ|চালু\s*করুন|ekhuni|call\s*korun|jogajog/i,
  "release-fee":
    /টাকা|লাভ|ফেরত|তুলতে|তোলা|নিকাশি|আটকে|পুরস্কার|লটারি|জিতেছেন|taka|tulte|ferot|prize|puroskar|lottery|cashout|berobe|\btulte\b/i,
  impersonation:
    /আয়|আয়|অ্যাপ|প্ল্যাটফর্ম|চালু|লাভ|যোগ|ট্রেড|রোজগার|ay|labh|chalu/i,
  "pay-to-earn": /আয়|আয়|কামা|রোজগার|টাস্ক|লাইক|রিভিউ|earn|taka|rojgar|\bay\b/i,
  secrecy:
    /বিনিয়োগ|বিনিয়োগ|লাভ|টাকা|ট্রেড|স্টক|টিপ|রিটার্ন|কৌশল|taka|invest|return|profit|strategy/i,
};

export function bengaliCaution(sentence: string, id: string): boolean {
  if (
    id === "borrow" &&
    /ধার\s*নিয়ে.{0,60}বলা\s*হচ্ছে\s*না|ঋণের\s*খরচ\s*বোঝানো/iu.test(sentence)
  )
    return true;
  if (
    id === "credentials" &&
    /(?:login|OTP|password).{0,90}pathanor\s*dorkar\s*nei/iu.test(sentence)
  )
    return true;
  // A separate offer is split before this check, so a quoted warning cannot
  // cancel an independent promise introduced with "কিন্তু আমাদের…".
  if (
    /সাবধান(?!ে)\s*(?:থাকুন|হোন)?|সতর্ক\s*(?:করেছে|করছে|থাকুন)|বিশ্বাস\s*(?:করবেন|করতে|করা)\s*(?:না|নয়)|ভরসা\s*করবেন\s*না|এড়িয়ে\s*চলুন|এই\s*দাবি.{0,20}ভুয়া|প্রতারণার\s*(?:লক্ষণ|কৌশল)|bishwas\s*korona|bishwas\s*korben\s*na|biswas\s*korben\s*na|sab[d]?han\s*thakun|shotorko\s*thakun|\b(?:sabdhan|sabhan|shotorko|satark)(?:\s*(?:thakun|thako))?\b/i.test(
      sentence,
    )
  )
    return true;
  const financial =
    /বিনিয়োগ|বিনিয়োগ|টাকা|লাভ|রিটার্ন|আয়|আয়|ট্রেড|স্টক|শেয়ার|শেয়ার|ক্রিপ্টো|অ্যাপ|সুদ|invest|return|profit|taka|labh|trade/i;
  if (
    id === "guarantee" &&
    /ফ্রিজ|টিভি|মোবাইল|যন্ত্র|ওয়ারেন্টি|ওয়ারেন্টি|পণ্য/.test(sentence) &&
    !financial.test(sentence)
  )
    return true;
  if (
    id === "social-proof" &&
    bengaliPatterns["social-proof"].test(sentence) &&
    !financial.test(sentence)
  )
    return true;
  if (
    ["off-platform", "borrow", "release-fee", "pay-to-earn", "tip"].includes(
      id,
    ) &&
    /(?:ইনস্টল|ডাউনলোড|বিনিয়োগ|বিনিয়োগ|পাঠাবেন|জমা|যোগ|কিনবেন|ফি|install|download|invest|fee).{0,28}(?:করবেন\s*না|দিতে\s*হয়\s*না|দেওয়ার\s*দরকার\s*নেই|korben\s*na)/i.test(
      sentence,
    )
  )
    return true;
  if (
    id === "credentials" &&
    /(?:OTP|ওটিপি|পিন|পাসওয়ার্ড|পাসওয়ার্ড|password|লগইন\s*কোড|login\s*code).{0,70}(?:দেবেন\s*না|দিবেন\s*না|লিখবেন\s*না|জমা\s*দেবেন\s*না|বলবেন\s*না|পাঠাবেন\s*না|শেয়ার\s*করবেন\s*না|শেয়ার\s*করবেন\s*না|share\s*korben\s*na|pathaben\s*na|pathiyo\s*na|deben\s*na)/i.test(
      sentence,
    )
  )
    return true;
  if (
    ["guarantee", "periodic", "outsized"].includes(id) &&
    /গ্যারান্টি\s*(?:নেই|নয়|নয়)|(?:লাভ|রিটার্ন).{0,15}নিশ্চিত\s*নয়|ঝুঁকিমুক্ত\s*নয়|ঝুঁকি\s*ছাড়া\s*নয়|গ্যারান্টি.{0,20}(?:দেয়\s*না|দেয়\s*না|দেয়নি)|guarantee\s*nei|nischit\s*noy|sure\s*labh.{0,20}bola\s*jay\s*na/i.test(
      sentence,
    )
  )
    return true;
  if (
    ["registration", "impersonation"].includes(id) &&
    /(?:অনুমোদন|অনুমোদিত|চালু|লঞ্চ|নিবন্ধিত).{0,20}(?:করেনি|নয়|নয়|নেই)|(?:SEBI|সেবি|আরবিআই).{0,25}(?:অনুমোদন|গ্যারান্টি).{0,30}(?:দেয়\s*না|দেয়\s*না|দেয়নি)/i.test(
      sentence,
    )
  )
    return true;
  if (
    id === "nav" &&
    /(?:কম|সস্তা).{0,10}(?:NAV|এনএভি).{0,35}(?:বোঝায়\s*না|হয়\s*না|মানে\s*নয়)|(?:সস্তা|ভালো|বেশি\s*লাভ).{0,20}(?:নয়|নয়|নেই)|(?:NAV|এনএভি).{0,30}সস্তা\s*নয়/i.test(
      sentence,
    )
  )
    return true;
  if (
    id === "tip" &&
    /কীভাবে\s*(?:কিনবেন|কিনতে|বেচতে)|(?:আপার\s*সার্কিট|টার্গেট).{0,30}(?:বলতে|মানে)|(?:আপার\s*সার্কিট).{0,25}(?:লেগেছে|হয়েছে|হয়েছে)/i.test(
      sentence,
    ) &&
    !/কিনুন|কিনে\s*নিন|আমাদের.{0,20}যোগ/.test(sentence)
  )
    return true;
  if (
    [
      "insider",
      "off-platform",
      "social-proof",
      "secrecy",
      "off-exchange",
      "coordinated-pump",
      "authority-threat",
      "borrow",
    ].includes(id) &&
    /বলতে\s*বোঝায়|মানে\s*(?:হল|হলো|কী)|কী\s*(?:বোঝায়|জানুন)|ঝুঁকি\s*বাড়ায়|উদাহরণ|উদাহরণস্বরূপ|বেআইনি/i.test(
      sentence,
    ) &&
    !/কিনুন|আমাদের.{0,30}(?:যোগ|জয়েন|জয়েন)|এখনই\s*(?:পাঠান|কিনুন)/.test(
      sentence,
    )
  )
    return true;
  return false;
}
