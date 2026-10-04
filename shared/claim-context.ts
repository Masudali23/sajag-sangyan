// Cycle 7: interpret a single already-normalized, quote-scoped clause. These
// predicates describe a request/offer, never whether its sender is genuine.
// Keep normalization in engine.ts so retrieval, cautions and excerpts agree.
const financial =
  /returns?|profits?|income|earnings?|payout|invest|capital|principal|deposit|trade|trading|recovery|withdraw|fund|jama|hazaar|hazar|lakh|money|repay|payment|(?:bank|financial|private\s*account).{0,20}(?:statement|records)|₹|rupees|rupaye|\d\s*%|मुनाफ|लाभ|रिटर्न|कमाई|निवेश|मूलधन|पैस|रकम|रुपय|रुपए|भुगतान|লাভ|রিটার্ন|আয়|আয়|রোজগার|বিনিয়োগ|বিনিয়োগ|মূলধন|টাকা|পেমেন্ট|munaf[ae]|kamai|pais[ae]|labh|taka|rojgar/iu;
const secret =
  /\b(?:OTP|PIN|CVV|password|passcode|login|credentials)\b|(?:recovery|seed)\s*phrase|(?:login|verification|security|sign[ -]?in|authentication|access)\s*code|ओटीपी|पिन|पासवर्ड|सीवीवी|कोड|ওটিপি|পিন|পাসওয়ার্ড|পাসওয়ার্ড|সিভিভি|কোড/iu;
const payment =
  /\b(?:pay(?:ing)?|repay|send|deposit|transfer|purchase|recharge|buy|remit|bhej(?:o|iye|na)?|bharo|bhariye|dijiye|dena|jama|joma|pathao|pathan|dao|din|lagbe)\b|\b(?:payment|fee|tax|top[ -]?up|recharge)\b.{0,35}\b(?:karo|koro|dile|korle|korte\s*hobe|dite\s*hobe)\b|needs?\s*(?:a\s*)?(?:₹?\d[\d,.]*\s*)?(?:tax|fee|charge|deposit)|(?:until|before).{0,35}(?:fee|payment).{0,15}received|जमा|भेज|भरें|दीजिए|दें|देते|खरीद|भुगतान|দিলেই|দিন|জমা|পাঠা|কিনতে|দিতে|পেমেন্ট\s*করো/iu;
const fee =
  /\b(?:fee|fees|charge|deposit|recharge|top[ -]?up|premium\s*order|tax|GST|TDS|payment|stamp|ticket|upgrade|package)\b|फीस|शुल्क|चार्ज|टैक्स|जीएसटी|राशि|(?:प्रोसेसिंग|प्रक्रिया|सत्यापन|मंज़?ूरी|स्वीकृति).{0,8}(?:रकम|राशि|रुपए|रुपये)|सुरक्षा.{0,12}(?:रकम|राशि|जमा)|जमा|डिपॉजिट|ডিপোজিট|ফি|চার্জ|কর|জমা|আপগ্রেড|প্যাকেজ/iu;
const release =
  /withdraw|releas|unlock|unfreez|unclaimed|recover|cashout|payout|prize|reward|scholarship|grant|lottery|winnings?|lost\s*money|on\s*hold|compliance\s*pass|clearance\s*fee|निकासी|रुक[ाीे]|वापस|छुड़ा|इनाम|लॉटरी|पुरस्कार|छात्रवृत्ति|पेंशन|बकाया|आवंटन|कोटा|मंज़?ूरी|स्वीकृति|(?:ऋण|लोन).{0,25}(?:राशि|पैसे).{0,20}(?:पाने|मिलने|देने)|राशि\s*खोलने|निकाल|balance\s*khul|uddhar|पैसे\s*जारी|তুলতে|তোলা|উত্তোলন|ছাড়(?:া|\s*হবে)|ছাড়ব|নিকাশি|আটকে|ফেরত|পুরস্কার|লটারি|জিতেছেন|berobe|tulte|ferot|puroskar|chharbo|atka|nikalne/iu;
const earning =
  /earn|income|profit|bonus|task|rating|ad.view|withdraw|unlock|cashout|कमाई|कमा|बोनस|निकासी|रेटिंग|टास्क|काम.{0,20}(?:खुल|सक्रिय)|पैसे\s*(?:देने|वाले)|টাস্ক|লাইক|রিভিউ|রেটিং|আয়|আয়|রোজগার|কামা|তুলতে|টাকা\s*পাওয়ার|টাকার\s*কাজ|kamai|kamao|kamane|rojgar|\bay\b/iu;
const investment =
  /invest|trad|stock|shares?|crypto|options|pool|निवेश|ट्रेड|शेयर|योजना|বিনিয়োগ|বিনিয়োগ|ট্রেড|শেয়ার|শেয়ার|স্কিম|entry/iu;
const borrow =
  /borrow|loan|mortgage|leverag|margin|कर्ज़?|ऋण|उधार|लीवरेज|ঋণ|ধার|লোন|লিভারেজ|\b(?:dhar|rin|udhar)\b/iu;
export const abusivePressurePattern =
  /(?:expose|humiliat|shame|hurt|harm|threaten|blackmail)|(?:share|send|publish|leak|circulate|post).{0,65}(?:private\s*(?:account\s*)?(?:photos?|pictures?|records?|statements?|chats?|messages?|loan\s*papers?)|personal\s*(?:chats?|messages?)|contact\s*list|your\s*(?:family|contacts|photos?))|बदनाम|बेइज्जत|बेइज़्ज़त|धमकी|अपमान|मार\s*दें|(?:फोटो|तस्वीर|बैंक\s*की\s*जानकारी).{0,65}(?:फैला|भेज|डाल)|পরিবার.{0,35}(?:লজ্জা|বদনাম)|বদনাম|অপমান|হুমকি|(?:ছবি|ব্যক্তিগত.{0,20}(?:কাগজ|বার্তা|তথ্য)).{0,65}(?:ছড়িয়ে|ছড়িয়ে|পাঠিয়ে|পাঠিয়ে|পাঠাব)|badnam|beizzati|dhamki|(?:photo|chh?obi|private.{0,20}(?:statement|records?|papers?)|personal\s*(?:chats?|messages?)).{0,65}(?:viral|chhoriye|choriye|pathiye|pathabo|bhej)|opoman|humki/iu;

// Entering a secret on a device the reader opened independently is different
// from disclosing it to someone. The destination and action both matter; the
// word "official" alone cannot clear a supplied link or a caller's request.
function independentCredentialEntry(text: string): boolean {
  if (!secret.test(text)) return false;
  const entry =
    /\b(?:enter|type|key\s*in|fill|input)\b|दर्ज|डालें|भरें|लिखें|লিখুন|প্রবেশ|টাইপ|\b(?:darj|dalo|bharo|likho|likhun)\b/iu;
  const disclosure =
    /\b(?:send|share|tell|give|disclose|forward|reply|reveal|batao|bataiye|bhejo|bhejiye|pathao|pathan|bolun|dao|din)\b|भेज|बताइए|बताए[ंँ]|बताओ|साझा|दीजिए|দেবেন|পাঠা|বলুন|জানান|শেয়ার|শেয়ার/iu;
  const suppliedChannel =
    /https?:|\b(?:link|caller|agent|AnyDesk|TeamViewer)\b|remote\s*access|screen\s*shar|लिंक|कॉलर|एजेंट|लিঙ্ক|লিংক|কলার|এজেন্ট/iu;
  if (!entry.test(text) || disclosure.test(text) || suppliedChannel.test(text))
    return false;
  const ownApp =
    /\bofficial\b.{0,25}\b(?:app|site|website)\b|आधिकारिक.{0,25}(?:ऐप|वेबसाइट)|অফিসিয়াল.{0,25}(?:অ্যাপ|ওয়েবসাইট)|অফিসিয়াল.{0,25}(?:অ্যাপ|ওয়েবসাইট)/iu;
  const independentlyOpened =
    /\b(?:open(?:ed)?|visit(?:ed)?)\b.{0,35}\b(?:yourself|myself|independently)\b|\b(?:yourself|myself|independently)\b.{0,35}\b(?:open(?:ed)?|visit(?:ed)?)\b|खुद.{0,25}(?:खोल|खुले|खोले)|নিজে.{0,25}(?:খুল|খোল)|\bkhud\b.{0,25}\b(?:khol|khola|khole|kholo)\b|\bnije\b.{0,25}\b(?:khul|khola|khule|khulun)\b/iu;
  const terminal =
    /\b(?:at|on|into|in)\s+(?:(?:the|an?|your)\s+)?(?:ATM|cash\s*machine|card\s*reader|payment\s*terminal)\b|एटीएम.{0,15}(?:कीपैड|मशीन)|এটিএম.{0,15}(?:কিপ্যাড|মেশিন)/iu;
  return (
    (ownApp.test(text) && independentlyOpened.test(text)) || terminal.test(text)
  );
}

function passiveSecretDisclosure(text: string): boolean {
  return /\b(?:OTP|PIN|CVV|password|passcode|login\s*code|sign[ -]?in\s*code)\b.{0,15}\b(?:must|should|needs?\s*to|has\s*to|have\s*to)\s+(?:(?:now|immediately)\s+)?be\s+(?:sent|shared|given|forwarded|disclosed|provided|submitted)\b.{0,30}\b(?:to\s+(?:me|us|our|my|the\s*(?:agent|caller|support))|with\s+(?:me|us|our|my)|here|in\s*(?:this|the)\s*chat)\b/iu.test(
    text,
  );
}

function liveClaimRequest(text: string): boolean {
  const readerDemand =
    /\byou\s+(?:must|need\s*to|have\s*to|should)\s+(?:(?:now|immediately|please)\s+)?(?:send|share|give|tell|pay|deposit|transfer|submit)\b|\b(?:our|my)\s+(?:agent|caller|support|team)\b.{0,20}\b(?:asks?|requires?|needs?|instructs?|tells?)\s+you\b|(?:अपना|आपका|आपकी|आपके|तुम्हारा).{0,25}(?:OTP|PIN|ओटीपी|पिन|पासवर्ड|कोड).{0,35}(?:भेजें|भेजो|बताइए|बताओ|दें|दीजिए)|(?:আপনার|তোমার).{0,25}(?:OTP|PIN|ওটিপি|পিন|পাসওয়ার্ড|পাসওয়ার্ড|কোড).{0,35}(?:পাঠান|বলুন|দিন|দিতে\s*হবে|লিখুন)|\b(?:apna|aapka|tumhara|apnar|tomar)\b.{0,25}\b(?:OTP|PIN|password|login\s*code)\b.{0,35}\b(?:bhejo|batao|bata\s*do|pathan|pathao|likh)\b/iu;
  return (
    Array.from(
      text.matchAll(new RegExp(readerDemand.source, `${readerDemand.flags}g`)),
    ).some((match) => {
      const end = match.index! + match[0].length;
      const action = match[0] + text.slice(end, end + 18);
      return !/मत|नहीं(?!\s*(?:किया\s*)?तो)|(?<![\p{L}\p{M}])না(?![\p{L}\p{M}]|\s*(?:হলে|দিলে))|\b(?:mat|never)\b|\bnahi\b(?!\s*(?:kiya\s*)?to)|\bna\b(?!\s*(?:hole|dile))|\b(?:do\s*not|not\s*to)\b/iu.test(
        action,
      );
    }) ||
    passiveSecretDisclosure(text) ||
    (/\byour\s+(?:capital|principal|investment|deposit|funds|money)\b.{0,45}\b(?:will|can|is\s*going\s*to)\b.{0,45}\b(?:guaranteed?|assured|fixed|risk[ -]?free)\b/iu.test(
      text,
    ) &&
      /\b(?:our|my)\s+(?:(?:managed|private|investment|trading)\s+){0,2}(?:fund|scheme|plan|pool|portfolio)\b/iu.test(
        text,
      )) ||
    /(?:^|[,;:—–]|\s+(?:but|however|yet|and|lekin|magar|kintu|लेकिन|मगर|কিন্তু)\s+)\s*(?:(?:please|now|अब|अभी)\s*)?(?:(?:send|share|give|tell|pay|join|deposit|transfer|submit|borrow|invest|buy|reply|forward)\b|भेजें|भेजो|जमा\s*करो|दीजिए|निवेश\s*(?:करें|करो)|उधार\s*लो|खरीदो|পাঠান|জমা\s*দিন|বিনিয়োগ\s*করুন|বিনিয়োগ\s*করুন|কিনুন)|\b(?:our|my)\s*(?:own\s*)?(?:offer|scheme|plan|fund|portfolio|course).{0,40}(?:promise|guarantee|join)|\b(?:we|I)\s+(?:offer|promise|guarantee|ask)\b|हमार[ाेी].{0,30}(?:योजना|ऑफर|गारंटी)|আমাদের.{0,30}(?:স্কিম|অফার|গ্যারান্টি)|\b(?:hamar[aei]|amader)\b.{0,30}\b(?:plan|scheme|offer|guarantee)\b|\bloan\b.{0,25}\b(?:lo|lena|niben|nin)\b/iu.test(
      text,
    )
  );
}

function reportedClaimContext(text: string): boolean {
  const attributed =
    /(?:\b(?:newspaper|news\s*(?:report|discussion)|complaint\s*(?:summary|report)|police\s*report|court\s*report|study|research\s*report)\b.{0,85}\b(?:reports?|reported|described|documented|recounted|quoted|says|explains?|discuss(?:es|ed)?)\b)|(?:अखबार|समाचार|शिकायत|पुलिस\s*रिपोर्ट|अदालत\s*की\s*रिपोर्ट).{0,85}(?:बताया|वर्णन|उल्लेख|दर्ज|रिपोर्ट)|(?:সংবাদ|পত্রিকা|প্রতিবেদন|অভিযোগ|পুলিশের\s*রিপোর্ট).{0,85}(?:বর্ণনা|জানিয়েছে|জানিয়েছে|লিখেছে|আলোচনা|উল্লেখ|কথা\s*এসেছে)|\b(?:akhbar|samachar|shikayat|police\s*report|khoborer\s*report|potrika|protibedon|news\s*discussion)\b.{0,85}\b(?:bataya|likha|bolechhe|janay|bornona|barnona|zikr\s*hua)\b|\breporting\s*that\s*demand\b|\breported\s*claims\b/iu;
  return attributed.test(text) && !liveClaimRequest(text);
}

// Past tense attached to the actor/action describes an experience. A temporal
// word by itself never clears an offer, and a fresh imperative remains live.
function pastActionContext(text: string): boolean {
  if (liveClaimRequest(text)) return false;
  return /\b(?:was|were|had\s*been)\s+(?:asked|told|instructed|promised|offered)\b|\b(?:I|we)\s+(?:(?:once|previously|earlier|had|personally)\s+){0,2}(?:borrowed|invested|paid|sent|entered|typed)\b|(?:मैंने|हमने).{0,90}(?:लिया|लिए|किया|किए|दिया|कहा|बोला).{0,8}(?:था|थे|थी)|(?:कोड|ओटीपी|पिन).{0,35}(?:दर्ज|डाला|लिखा)\s*(?:किया|था)|(?:আমি|আমরা|সে|তাকে|তাঁকে|আমাকে|ভাইকে).{0,100}(?:করেছিলাম|করেছিল|নিয়েছিলাম|নিয়েছিলাম|দিয়েছিলাম|দিয়েছিলাম|পাঠিয়েছিলাম|পাঠিয়েছিলাম|বলা\s*হয়েছিল|বলা\s*হয়েছিল)|\b(?:maine|humne)\b.{0,85}\b(?:liya|kiya|diya|kaha)\s*tha\b|\b(?:ami|amra)\b.{0,85}\b(?:korechhilam|niyechhilam|diyechhilam|pathiyechhilam)\b|\b(?:dite|korte)\s*bola\s*hoyechhilo\b/iu.test(
    text,
  );
}

/** Explicit negation belongs to this clause, never the whole message. */
export function rejectedClaimClause(text: string, id: string): boolean {
  // Attributed reporting and arithmetic are data about a request, not a fresh
  // request. This operates on one clause; a following direct demand is separate.
  if (
    ["guarantee", "periodic", "outsized"].includes(id) &&
    /^\s*(?:(?:the|this|that)\s*)?(?:phrase|word|wording|spelling|sentence)\b.{0,100}\b(?:uses?|contains?|includes?)\b.{0,40}\b(?:letters?|characters?|spelling|homoglyphs?)\b/iu.test(
      text,
    )
  )
    return true;
  if (reportedClaimContext(text) || teaching(text) || pastActionContext(text))
    return true;
  if (id === "credentials" && independentCredentialEntry(text)) return true;
  if (
    ["credentials", "account-threat"].includes(id) &&
    !liveClaimRequest(text) &&
    /\b(?:does\s*not|doesn't|do\s*not|is\s*not)\s+(?:ask|request|instruct)\b|\basks?\s+(?:nobody|no\s*one)\b|কাউকে.{0,90}(?:পাঠাতে|দিতে|জমা).{0,25}(?:বলা\s*হচ্ছে\s*না|বলছি\s*না|বলা\s*হয়নি|বলা\s*হয়নি)|\bkauke\b.{0,80}\b(?:dite|pathate)\b.{0,25}\b(?:bola\s*nei|bola\s*hochhe\s*na|bolchhi\s*na)\b|किसी.{0,60}(?:भेजने|बताने|देने).{0,25}(?:नहीं\s*कहा|नहीं\s*कह\s*रहा)/iu.test(
      text,
    )
  )
    return true;
  if (
    ["guarantee", "periodic", "outsized"].includes(id) &&
    /(?:do\s*not|don.t|never)\s+(?:(?:ever|again|blindly|simply)\s+){0,2}(?:deposit|invest|send|transfer)\b|(?:not\s*(?:a\s*)?(?:plan|invitation|offer)\s*to\s*(?:earn|invest))|(?:promise|scheme).{0,20}(?:nahi|nahin)|पेशकश\s*नहीं|নিশ্চিত.{0,25}বলা\s*যায়\s*না|(?:only\s*a\s*claim)|(?:proofreading|editing).{0,65}(?:sentence|claim)/iu.test(
      text,
    )
  )
    return true;
  if (
    ["release-fee", "pay-to-earn"].includes(id) &&
    /(?:no|kono).{0,12}deposit.{0,30}(?:nei|noy)|(?:task|deposit).{0,25}(?:বিক্রি\s*করছি\s*না|chaichhe\s*na|chaowa\s*hochhe\s*na)|(?:শুধু|sudhu).{0,35}(?:report|রিপোর্ট|obhiggota)/iu.test(
      text,
    )
  )
    return true;
  if (
    ["release-fee", "pay-to-earn"].includes(id) &&
    /\b(?:never|do\s*not|don.t)\s+(?:(?:ever|again|blindly|simply|under\s+any\s+circumstances)\s+){0,3}(?:pay|deposit|send)\b|\bnot\s*(?:income|earnings?|a\s*deposit)|(?:जमा|deposit).{0,10}(?:नहीं|nahi|noy)|(?:কমাই|আয়|আয়).{0,15}নয়/iu.test(
      text,
    )
  )
    return true;
  if (
    id === "outsized" &&
    /loan|debt|borrowing|APR|EMI|ऋण|कर्ज|उधार|ঋণ|ধার/iu.test(text) &&
    /interest|cost|charge|repayment|ब्याज|खर्च|सूद|সুদ|খরচ/iu.test(text) &&
    !/profit|return|earn|मुनाफ|रिटर्न|कमाई|লাভ|রিটার্ন|আয়|আয়/iu.test(text)
  )
    return true;
  if (
    id === "abusive-pressure" &&
    /\b(?:never|will\s*not|must\s*not|do\s*not|don.t)\s+(?:(?:ever|again|blindly|simply|under\s+any\s+circumstances)\s+){0,3}(?:threaten|share|publish|leak|humiliate|shame|harm)\b|(?:धमकी|बदनाम).{0,20}(?:नहीं|न\s*करें)|(?:হুমকি|বদনাম|অপমান).{0,20}(?:করবেন\s*না|করি\s*না)|(?:badnam|opoman|humki|dhamki).{0,20}(?:korben\s*na|nahi|mat)/iu.test(
      text,
    )
  )
    return true;
  if (
    id === "credentials" &&
    /(?:does\s*not\s*mean|not\s*(?:a\s*)?request\s*to).{0,45}(?:send|share|tell|give)/iu.test(
      text,
    )
  )
    return true;
  if (
    id === "borrow" &&
    /(?:decided|decide|advise|advised)\s*against.{0,35}(?:loan|borrow)|(?:ঋণ|ধার).{0,60}(?:বলছি\s*না|বলবেন\s*না|বলছি\s*নেই)|(?:loan|borrow|dhar).{0,45}(?:mat\s*lo|nahi\s*lena|niben\s*na)/iu.test(
      text,
    )
  )
    return true;
  if (
    ["borrow", "coordinated-pump"].includes(id) &&
    !liveClaimRequest(text) &&
    /\b(?:not|never)\s+(?:asking|advising|telling|suggesting|recommending)\b|\bnot\s+(?:an?\s*)?(?:instruction|advice|recommendation|suggestion)\b|(?:कर्ज|ऋण|उधार|निवेश).{0,75}(?:नहीं\s*कह\s*रहा|नहीं\s*कहा|सलाह\s*नहीं|नहीं\s*दे\s*रहा)|(?:खरीदने|समूह).{0,60}(?:सलाह|निर्देश)\s*नहीं|(?:কেনার|যোগ).{0,40}(?:নির্দেশ|পরামর্শ).{0,10}(?:নয়|নয়)|নির্দেশ\s*দিতে\s*(?:নয়|নয়)|\b(?:loan|borrow|invest|buy\s*order|group\s*joining)\b.{0,75}\b(?:(?:suggestion|salah|advice).{0,12}(?:nahi|nahin)|(?:nahi|nahin)\s*(?:keh|kah|bol|de)|(?:nahi|nei)\s*maangi)\b/iu.test(
      text,
    )
  )
    return true;
  if (id === "credentials" && secret.test(text)) {
    if (
      /\b(?:never|do\s*not|don.t|must\s*not|should\s*not)\s+(?:(?:ever|again|blindly|simply|under\s+any\s+circumstances)\s+){0,3}(?:share|send|tell|give|provide|enter|submit|disclose|forward|reply)\b/iu.test(
        text,
      )
    )
      return true;
    if (
      /(?:बताइए|बताए[ंँ]|बताओ|बताना|भेजें|भेजिए|देना|दीजिए|साझा\s*करना|साझा\s*करें).{0,12}(?:नहीं|मत)|(?:कभी|किसी).{0,45}(?:न\s*बताए[ंँ]|न\s*बताइए|न\s*भेजें|न\s*दें)|(?:मत|न)\s*(?:बताइए|बताए[ंँ]|भेजें|बताओ|दें)|(?:mat|na)\s*(?:batao|bataiye|batana|bhejo|dena|share\s*karo)|(?:batao|batana|bhejna|bhejo|dena|share\s*karna|share\s*karo).{0,15}(?:nahi|mat|na\b)/iu.test(
        text,
      )
    )
      return true;
    if (
      /share\s*(?:na|mat)\s*(?:karein|karo)|share\s*korbe\s*na|code\s*dio\s*na/iu.test(
        text,
      )
    )
      return true;
    if (
      /(?:বলবেন|বলুন|পাঠাবেন|পাঠান|দেবেন|দেন|শেয়ার\s*করবেন|শেয়ার\s*করবেন|লিখবেন).{0,10}(?:না|নয়|নয়)|(?:bolben|bolun|pathaben|pathan|deben|share\s*korben|share\s*korun).{0,12}\bna\b|(?:kauke|kokhono).{0,60}(?:bolben|deben|pathaben).{0,10}\bna\b/iu.test(
        text,
      )
    )
      return true;
  }
  if (["guarantee", "periodic", "outsized"].includes(id)) {
    if (
      /(?:no\s*(?:one|person)|nobody|nothing).{0,45}\bguarantee|\b(?:cannot|can.t|does\s*not|do\s*not|never|not)\s+(?:(?:ever|really|actually|legitimately|possibly|be|been|being|a|financial|investment)\s+){0,3}guarantee(?:d|s|ing)?\b|(?:guarantee|guaranteed|assured).{0,12}(?:नहीं|न\b)|गारंटी[^,;.!?।]{0,25}(?:नहीं|न\s*दे)|(?:गारंटीड|निश्चित\s*लाभ).{0,18}नहीं|(?:guarantee|pakka\s*return)[^,;.!?।]{0,25}(?:nahi|nahin)|(?:koi|kisi).{0,25}guarantee.{0,25}(?:nahi|nahin)/iu.test(
        text,
      )
    )
      return true;
    if (
      /(?:গ্যারান্টি|নিশ্চিত\s*(?:লাভ|রিটার্ন))[^,;.!?।]{0,25}(?:পারে\s*না|পারেন\s*না|দেয়\s*না|দেয়\s*না|নেই|নয়|নয়)|(?:guarantee|nish?chit\s*labh|fixed\s*labh)[^,;.!?।]{0,30}(?:dite\s*pare\s*na|dite\s*paren\s*na|nei|noy)|(?:guarantee|guaranteed|assured).{0,35}(?:mat\s*samajh|nahi\s*bataya)|निश्चित\s*लाभ.{0,25}नहीं/iu.test(
        text,
      )
    )
      return true;
    if (
      /(?:लाभ|रिटर्न|निश्चित|guarantee|profit|লাভ|ফেরত|নিশ্চিত).{0,80}(?:দেবেন\s*না|বিশ্বাস\s*করবেন\s*না|भरोसा\s*न\s*करें)/iu.test(
        text,
      )
    )
      return true;
  }
  if (
    ["release-fee", "pay-to-earn"].includes(id) &&
    /(?:no|without)\s*(?:upfront\s*)?(?:registration|joining|activation|release|withdrawal|processing)\s*(?:fees?|charge)|(?:ফি|চার্জ).{0,25}(?:লাগে\s*না|লাগবে\s*না|দিতে\s*হবে\s*না)|(?:fee|charge).{0,25}(?:lage\s*na|lagbe\s*na)|(?:फीस|शुल्क).{0,25}(?:नहीं\s*देना|नहीं\s*दें|न\s*दें)/iu.test(
      text,
    )
  )
    return true;
  if (
    ["release-fee", "pay-to-earn"].includes(id) &&
    /not\s*(?:a\s*)?payment\s*requested|(?:জমা|পাঠানো|কেনা).{0,25}প্রস্তাব\s*নয়/iu.test(
      text,
    )
  )
    return true;
  return false;
}

function teaching(text: string): boolean {
  // Grammar identifying an example/explanation is required. "Lesson" or
  // "education" alone does not cancel an actual offer such as "our course
  // guarantees trading profits".
  if (liveClaimRequest(text)) return false;
  return /\b(?:lesson|exercise|textbook|class|poster|article|training\s*example|session|trainer|teacher|workshop|study\s*group)\b.{0,100}\b(?:explain\w*|illustrat\w*|discuss\w*|quot\w*|reproduc\w*|defin\w*|compar\w*|describ\w*|demonstrat\w*|stud(?:y|ied)|showed|read)\b|\b(?:means|defined\s*as|refers\s*to)\b|(?:पाठ|कक्षा|उदाहरण|प्रशिक्षक|कार्यशाला|सत्र).{0,100}(?:समझा|बताया|दिखा|उद्धरण|वर्णन|पढ़|चर्चा)|(?:মানে\s*(?:হল|হলো)|বলতে\s*বোঝায়)|(?:ক্লাস|পাঠ|উদাহরণ|পাঠচক্র|প্রশিক্ষক).{0,100}(?:বোঝায়|বোঝানো|শেখানো|ব্যাখ্যা|বিবরণ\s*পড়েছি|বিবরণ\s*পড়েছি|আলোচনা)|\b(?:class|trainer|teacher|workshop|lesson)\b.{0,100}\b(?:samjhaya|samjhaye|padha|dikhaye|dikhaya|study|discuss|example\s*ke\s*roop)\b|\bstudy\s*group\b.{0,100}\b(?:dekhechhi|porechhi|bujhechhi|alochona)\b/iu.test(
    text,
  );
}

/** Join only an explicit payment-to-earning continuation, not arbitrary nearby
 * financial words. This keeps ordinary course/loan costs separate from offers. */
export function paymentEarningContinuation(
  first: string,
  next: string,
): boolean {
  return (
    first.length <= 300 &&
    next.length <= 300 &&
    fee.test(first) &&
    payment.test(first) &&
    !teaching(first) &&
    !rejectedClaimClause(first, "pay-to-earn") &&
    earning.test(next) &&
    /unlock|after\s*payment|paid\s*(?:tasks?|assignments?)|payment\s*(?:ke\s*baad|hote|holei|er\s*por)|भुगतान.{0,20}(?:बाद|होते)|खुलेंगे|পেমেন্ট.{0,25}(?:পর|হলেই)|খুলে|khulenge|khulbe|khule/iu.test(
      next,
    ) &&
    !rejectedClaimClause(next, "pay-to-earn")
  );
}

export function offerPaymentContinuation(first: string, next: string): boolean {
  return (
    first.length <= 300 &&
    next.length <= 300 &&
    !teaching(first) &&
    !rejectedClaimClause(first, "pay-to-earn") &&
    fee.test(next) &&
    payment.test(next) &&
    !ordinaryFee(next) &&
    !rejectedClaimClause(next, "pay-to-earn") &&
    /\b(?:earn|earning|paid\s*(?:tasks?|work)|won\s*(?:a\s*)?prize|unclaimed\s*(?:shares?|funds?|money))\b|कमाई|इनाम|রোজগার|পুরস্কার/iu.test(
      first,
    ) &&
    /registration|activation|joining|advance\s*fee|before.{0,20}(?:send|release)|रजिस्ट्रेशन|पंजीकरण|রেজিস্ট্রেশন/iu.test(
      next,
    )
  );
}

export function releasePaymentContinuation(
  first: string,
  next: string,
): boolean {
  return (
    first.length <= 300 &&
    next.length <= 300 &&
    release.test(first) &&
    /ready|balance|locked|frozen|approved|pending|blocked|तैयार|मंजूर|बंद|रकम|তৈরি|বন্ধ|লাভ|taiyar|toiri/iu.test(
      first,
    ) &&
    payment.test(next) &&
    fee.test(next) &&
    !rejectedClaimClause(first, "release-fee") &&
    !rejectedClaimClause(next, "release-fee") &&
    !teaching(first) &&
    !ordinaryFee(next)
  );
}

function ordinaryFee(text: string): boolean {
  const costContext =
    /\b(?:bank|loan|EMI|APR|course|tuition|school|college|late\s*fee|annual\s*fee|ATM|maintenance|statement)\b|बैंक|ऋण|ईएमआई|पाठ्यक्रम|कोर्स|स्कूल|विलंब|वार्षिक|ब्याज|ব্যাংক|ঋণ|ইএমআই|কোর্স|স্কুল|বার্ষিক|বিলম্ব|সুদ|banker|course.er/iu;
  // Describing a loan/course cost is ordinary context. An explicit request to
  // send a separate payment in order to receive/recover funds remains eligible.
  const extraUnlock =
    /(?:pay|send|deposit|transfer|भेजें|जमा|পাঠান|জমা).{0,80}(?:before|first|pehle|age|to\s*(?:release|unlock|withdraw)|पहले|तभी|আগে|তারপর)|(?:withdraw|unlock|release|निकासी|तुलते).{0,55}(?:first|pehle|age|पहले|আগে)|(?:before|pehle|पहले|আগে).{0,75}(?:pay|send|transfer|deposit|भेज|भर|পাঠা|দিন|जमा)/iu;
  return (
    costContext.test(text) &&
    !extraUnlock.test(text) &&
    !/(?:prize|lottery|task|cashout|rating)|इनाम|पुरस्कार|লটারি|পুরস্কার|টাস্ক/iu.test(
      text,
    )
  );
}

/** A family-specific action/offer, with a conservative default for Strong. */
export function solicitingClaimClause(text: string, id: string): boolean {
  if (rejectedClaimClause(text, id) || teaching(text)) return false;
  if (id === "abusive-pressure")
    return (
      abusivePressurePattern.test(text) &&
      (financial.test(text) || borrow.test(text) || secret.test(text)) &&
      (payment.test(text) ||
        (secret.test(text) && solicitingClaimClause(text, "credentials"))) &&
      /(?:\bor\b|otherwise|unless|we\s*will|I\s*will|we.ll|I.ll|वरना|नहीं\s*(?:किया\s*)?तो|वर्ना|warna|nahi\s*(?:kiya\s*)?to|না\s*(?:হলে|দিলে)|নইলে|নতুবা|nahole|noile|na\s*(?:hole|dile)|korbo|karunga|karenge)/iu.test(
        text,
      )
    );
  if (id === "credentials")
    if (
      /(?:PAN|Aadhaar|KYC\s*documents?|पैन|आधार|প্যান|আধার)/iu.test(text) &&
      /https?:|\blink\b|लिंक|লিংক|লিঙ্ক/iu.test(text) &&
      /upload|submit|send|update|verify|जमा|পাঠা|আপডেট/iu.test(text)
    )
      return true;
  if (id === "credentials")
    return (
      passiveSecretDisclosure(text) ||
      (secret.test(text) &&
        /\b(?:send|share|give|tell|provide|submit|enter|type|fill|confirm|disclose|reply|paste|forward|batao|bataiye|bhejo|bhejiye|bhej|likh|pathan|pathao|bolun|dao|din)\b|\bbata\s*(?:do|dijiye)\b|\b(?:read|dictate)\b.{0,65}\b(?:to\s*(?:me|us)|over\s*(?:the\s*)?(?:phone|call))\b|बताइए|बताए[ंँ]|बताओ|भेजें|भेजिए|भरें|डालें|लिखें|दर्ज|दीजिए|दें|পাঠান|পাঠিয়ে|পাঠিয়ে|বলুন|দিন|দিতে\s*হবে|লিখুন|জানান|submit\s*korun|type\s*koro/iu.test(
          text,
        )) ||
      /(?:install|open|allow|enable).{0,35}(?:AnyDesk|TeamViewer|remote\s*access|screen\s*shar)|manage.{0,20}(?:your|aapka).{0,15}demat\s*account/iu.test(
        text,
      )
    );
  if (id === "release-fee")
    return (
      payment.test(text) &&
      fee.test(text) &&
      release.test(text) &&
      !ordinaryFee(text)
    );
  if (id === "pay-to-earn")
    return (
      fee.test(text) &&
      earning.test(text) &&
      !ordinaryFee(text) &&
      (payment.test(text) ||
        /deposit\s*bonus|bonus\s*(?:on|for)\s*(?:a\s*)?deposit|जमा.{0,15}बोनस/iu.test(
          text,
        ))
    );
  if (id === "guarantee")
    return (
      financial.test(text) &&
      /guarantee|assured|risk[ -]?free|zero[ -]?(?:risk|loss|drawdown)|no\s*(?:risk|loss|possibility\s*of\s*loss)|without.{0,18}(?:risk|loss)|100\s*%\s*safe|principal.{0,25}(?:protected|safe)|capital.{0,25}(?:protected|safe)|principal.{0,30}(?:kam\s*nahi|written\s*promise)|loss.{0,20}zero|गारंटी|गारंटीड|निश्चित|पक्का|पक्की|जोखिम\s*नहीं|बिना.{0,15}जोखिम|सुरक्षित|ग্যারান্টি|গ্যারান্টি|নিশ্চিত|স্থির\s*লাভ|মূলধন.{0,25}সমান\s*লাভ|লোকসান.{0,20}হবে\s*না|কোম্পানির\s*গ্যারান্টি|ঝুঁকি\s*নেই|ঝুঁকিমুক্ত|ঝুঁকি\s*ছাড়া|ঝুঁকি\s*ছাড়া|pakka|bina\s*risk|koi.{0,12}risk\s*nahi|sure\s*labh|nish?chit|(?:kono\s*)?risk\s*nei/iu.test(
        text,
      )
    );
  if (id === "borrow") return borrow.test(text) && investment.test(text);
  if (id === "coordinated-pump")
    return (
      /buy|pump|push|kharid|badha|chadha|खरीद|(?:भाव|कीमत).{0,20}(?:चढ़ा|चढा|बढ़ा|बढा)|কিনুন|কিনে|কিনব|দাম.{0,20}(?:বাড়া|বাড়া|বাড়ি|বাড়ি|বাড়াব|বাড়াব|তুলব)|\b(?:kinun|kine|kino|kinbo|kinte|barabo|barai|baran)\b|(?:price|dam|daam|bhav|keemat|kimat).{0,20}(?:rais|push|up|bar|badh|chadh|tul)/iu.test(
        text,
      ) &&
      /together|everyone|all\s*of\s*us|\bwe\b|group|pump|milkar|sab\b|\b(?:saath|sath|ekshathe|eksathe|ek\s*sathe|ek\s*saath)\b|सब|मिलकर|साथ|समूह|टोली|সবাই|একসঙ্গে|একসাথে|আমরা|গ্রুপ|sobai|amra/iu.test(
        text,
      )
    );
  if (id === "impersonation" || id === "authority-threat")
    return (
      (payment.test(text) &&
        /money|amount|account|₹|rupees|taka|paisa|पैस|रकम|राशि|खात|টাকা|অ্যাকাউন্ট/iu.test(
          text,
        )) ||
      (secret.test(text) && solicitingClaimClause(text, "credentials")) ||
      /(?:stay|remain|keep).{0,30}(?:video\s*call|screen\s*shar)|(?:वीडियो\s*कॉल).{0,20}(?:रहें|रहो)|(?:ভিডিও\s*কলে).{0,20}(?:থাকুন|থাকতে)/iu.test(
        text,
      )
    );
  if (id === "account-threat")
    return /https?:|\blink\b|(?:^|[.!?।,;:—–]|\b(?:please|kindly|must|need\s*to|have\s*to|unless\s*you|you\s*should|you\s*must|asks?\s*you\s*to|tells?\s*you\s*to)\s+)\s*(?:(?:now|abhi|immediately)\s*)?(?:send|call|contact|update|verify|reactivate|submit)\b|\b(?:reactivat\w*|KYC|account\s*access)\b.{0,65}\b(?:pay|send|deposit|bhejo|bhejiye|jama|payment\s*karo)\b|लिंक|अपडेट\s*करें|(?:संपर्क|कॉल)\s*करें|बताइए|दर्ज\s*करें|লিংক|লিঙ্ক|আপডেট\s*করুন|পাঠান|কল\s*করুন|\b(?:jogajog|sampark|call|contact)\s*(?:koro|korun|karo|karein)\b/iu.test(
      text,
    );
  if (["outsized", "periodic"].includes(id)) return financial.test(text);
  if (id === "urgency")
    return (
      financial.test(text) ||
      secret.test(text) ||
      payment.test(text) ||
      /join|enrol|register|जुड़|যোগ|জয়েন|জয়েন/iu.test(text)
    );
  if (
    ["tip", "off-exchange", "off-platform", "insider", "secrecy"].includes(id)
  )
    return (
      investment.test(text) ||
      financial.test(text) ||
      /\bAPK\b|एपीके|এপিকে/iu.test(text)
    );
  return false;
}
