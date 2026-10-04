import { createHash } from "node:crypto";
import { sources } from "../shared/content.ts";
import type { Localized, RetrievedEvidence } from "../shared/types.ts";
import type { RuleId } from "../shared/engine.ts";

// Curated, AI-assisted paraphrases of the linked primary publications, reviewed
// on each card's reviewedAt date. These are general guidance, never evidence that a user claim is true.
// Search aliases are indexing aids, not additional factual source material.
// No evaluation/training examples or user messages belong in this corpus.
export type EvidenceCard = Omit<RetrievedEvidence, "score" | "categoryIds"> & {
  categoryIds: RuleId[];
  aliases: string;
};
const l = (en: string, hi: string, bn: string): Localized => ({ en, hi, bn });
function card(
  id: string,
  sourceId: string,
  categoryIds: RuleId[],
  title: Localized,
  passage: Localized,
  aliases: string,
  reviewedAt = "2026-10-03",
): EvidenceCard {
  const source = sources.find((item) => item.id === sourceId);
  if (
    !source ||
    !/^https:\/\/(?:[a-z0-9-]+\.)*(?:sebi\.gov\.in|rbi\.org\.in|pib\.gov\.in)\//i.test(
      source.url,
    )
  )
    throw new Error(
      "Evidence must identify an allowlisted authoritative source",
    );
  return {
    id,
    sourceId,
    title,
    passage,
    categoryIds,
    aliases,
    url: source.url,
    reviewedAt,
  };
}
export const evidenceCorpus: EvidenceCard[] = [
  card(
    "rbi-recovery-pressure",
    "rbi-recovery-conduct",
    ["abusive-pressure"],
    l(
      "Threats during debt recovery",
      "कर्ज वसूली में धमकियाँ",
      "ঋণ আদায়ের সময় হুমকি",
    ),
    l(
      "RBI directs covered lenders and recovery agents not to intimidate, publicly humiliate or invade family privacy during collection. A repayment demand with threats needs attention; this does not prove the debt or collector is fraudulent. Ordinary repayment reminders are different.",
      "RBI के अनुसार दायरे में आने वाले ऋणदाता और वसूली एजेंट धमकाएँ नहीं, सार्वजनिक अपमान न करें और परिवार की निजता में दखल न दें। भुगतान की माँग के साथ धमकी ध्यान देने योग्य है; इससे ऋण या एजेंट का धोखाधड़ी होना सिद्ध नहीं होता। सामान्य भुगतान अनुस्मारक अलग हैं।",
      "RBI আওতাভুক্ত ঋণদাতা ও আদায়কারীকে ভয় দেখানো, প্রকাশ্যে অপমান ও পরিবারের গোপনীয়তায় হস্তক্ষেপ করতে নিষেধ করে। টাকা চাওয়ার সঙ্গে হুমকি মনোযোগ দাবি করে; এতে ঋণ বা আদায়কারীকে প্রতারক প্রমাণ করা হয় না। সাধারণ কিস্তির স্মরণবার্তা আলাদা।",
    ),
    "loan recovery repay repayment collector harassment humiliate expose photos contacts family threaten blackmail shame debt abusive धमकी अपमान बदनाम फोटो परिवार कर्ज वसूली चुकाओ loan chukao badnam photo viral parivar dhamki ঋণ কিস্তি আদায় হুমকি অপমান ছবি পরিবার ছড়িয়ে বদনাম shodh shod din opoman bodnam chhobi poribar choriye dhamki",
    "2026-10-04",
  ),
  card(
    "pib-customs-clearance",
    "pib-customs-fraud",
    ["release-fee", "authority-threat", "impersonation"],
    l(
      "Customs and courier payment demands",
      "कस्टम और कूरियर में पैसे की माँग",
      "কাস্টমস ও কুরিয়ারের নামে টাকা দাবি",
    ),
    l(
      "CBIC describes fake courier or customs calls demanding private-account payments to release parcels or avoid legal action. Verify independently through official contacts. This pattern does not make every customs duty or delivery charge fraudulent.",
      "CBIC ने पार्सल छुड़ाने या कानूनी कार्रवाई रोकने के लिए निजी खाते में पैसे माँगने वाले नकली कूरियर या कस्टम कॉल बताए हैं। आधिकारिक संपर्क से स्वतंत्र पुष्टि करें। हर कस्टम या डिलीवरी शुल्क धोखाधड़ी नहीं है।",
      "CBIC পার্সেল ছাড়াতে বা আইনি ব্যবস্থা এড়াতে ব্যক্তিগত অ্যাকাউন্টে টাকা চাওয়া ভুয়ো কুরিয়ার বা কাস্টমস কলের কথা বলেছে। অফিসিয়াল যোগাযোগ দিয়ে আলাদা যাচাই করুন। সব শুল্ক বা ডেলিভারি ফি প্রতারণা নয়।",
    ),
    "courier customs parcel package seized contraband clearance duty detention release fine arrest कस्टम कूरियर पार्सल पैकेट जब्त छुड़ाने शुल्क giraftar parcel chhudao customs paisa কাস্টমস কুরিয়ার পার্সেল আটক শুল্ক ছাড়াতে parcel chharate shulko taka",
    "2026-10-04",
  ),
  card(
    "pib-electricity-apk",
    "pib-electricity-kyc",
    ["off-platform", "account-threat"],
    l(
      "Electricity KYC and device control",
      "बिजली KYC और डिवाइस का नियंत्रण",
      "বিদ্যুতের KYC ও ডিভাইসের নিয়ন্ত্রণ",
    ),
    l(
      "DoT describes electricity-KYC SMS and WhatsApp messages distributing malicious APKs to control devices. An unsolicited installation request needs independent checking; a bill reminder or the word KYC alone does not establish this pattern.",
      "DoT ने बिजली KYC के नाम पर SMS और WhatsApp से दुर्भावनापूर्ण APK भेजकर डिवाइस का नियंत्रण लेने का तरीका बताया है। अनचाही इंस्टॉलेशन माँग अलग से जाँचें; केवल बिल अनुस्मारक या KYC शब्द इस तरीके का प्रमाण नहीं।",
      "DoT বিদ্যুতের KYC-র নামে SMS ও WhatsApp-এ ক্ষতিকর APK পাঠিয়ে ডিভাইস নিয়ন্ত্রণের কথা বলেছে। অনাহূত ইনস্টলের অনুরোধ আলাদা যাচাই করুন; শুধু বিলের স্মরণবার্তা বা KYC শব্দ এই ধরনের প্রমাণ নয়।",
    ),
    "electricity electric power utility kyc apk install disconnection disconnect cut meter bill बिजली बिल काट कनेक्शन बंद ऐप bijli kategi kat jayegi app install বিদ্যুৎ বিল সংযোগ কাটা বন্ধ অ্যাপ bidyut biddut kete bill bondho apk",
    "2026-10-04",
  ),
  card(
    "pib-trai-disconnection",
    "pib-trai-impersonation",
    ["account-threat", "impersonation", "authority-threat", "off-platform"],
    l(
      "TRAI impersonation and disconnection threats",
      "TRAI के नाम पर मोबाइल बंद करने की धमकी",
      "TRAI-এর নামে মোবাইল বন্ধের হুমকি",
    ),
    l(
      "TRAI warns about forged notices alleging illegal mobile activity, threatening disconnection and steering people to phishing or malware. It does not authorize such disconnection contacts. This does not classify ordinary telecom notices or all service restrictions.",
      "TRAI ने गैरकानूनी मोबाइल गतिविधि के आरोप, कनेक्शन बंद करने की धमकी और फिशिंग या दुर्भावनापूर्ण ऐप वाले नकली नोटिस बताए हैं। वह ऐसे संपर्क अधिकृत नहीं करता। यह सामान्य दूरसंचार नोटिस या हर सेवा रोकने पर निष्कर्ष नहीं है।",
      "TRAI ভুয়ো নোটিসে বেআইনি মোবাইল ব্যবহারের অভিযোগ, সংযোগ বন্ধের হুমকি ও ফিশিং বা ক্ষতিকর অ্যাপে পাঠানোর কথা বলেছে। এমন যোগাযোগের অনুমতি সে দেয় না। সাধারণ টেলিকম নোটিস বা সব পরিষেবা বন্ধ সম্পর্কে এটি রায় নয়।",
    ),
    "trai telecom dot disconnect mobile number illegal activity service termination sim बंद सिम मोबाइल गैरकानूनी trai number band sim বন্ধ নম্বর সিম অবৈধ সংযোগ trai number bondho sim",
    "2026-10-04",
  ),
  card(
    "pib-tax-access-secrets",
    "pib-tax-phishing",
    ["credentials", "impersonation"],
    l(
      "Tax messages and account secrets",
      "कर संदेश और खाते की गोपनीय जानकारी",
      "কর বার্তা ও অ্যাকাউন্টের গোপন তথ্য",
    ),
    l(
      "The Income Tax Department uses routine email and SMS but says it does not seek PINs, passwords or similar financial-account access information by email. A tax or refund notification alone is not that pattern; examine what the sender actually requests.",
      "आयकर विभाग सामान्य ईमेल और SMS भेजता है, लेकिन ईमेल पर PIN, पासवर्ड या खाते की ऐसी गोपनीय जानकारी नहीं माँगता। केवल कर या रिफंड सूचना यह तरीका नहीं है; देखें कि भेजने वाला वास्तव में क्या माँगता है।",
      "আয়কর বিভাগ সাধারণ ইমেল ও SMS পাঠায়, কিন্তু ইমেলে PIN, পাসওয়ার্ড বা অ্যাকাউন্টের গোপন তথ্য চায় না। শুধু কর বা রিফান্ডের খবর এই ধরন নয়; প্রেরক আসলে কী চাইছে দেখুন।",
    ),
    "tax refund income tax income-tax itr refund phishing password pin आयकर रिफंड कर वापस पासवर्ड aaykar refund wapas pin আয়কর ফেরত রিফান্ড পাসওয়ার্ড aykor ferot refund pin",
    "2026-10-04",
  ),
  card(
    "rbi-sim-takeover",
    "rbi-beaware",
    ["credentials", "impersonation"],
    l(
      "SIM duplication and stolen access",
      "SIM की नकल और गोपनीय जानकारी",
      "SIM-এর নকল ও গোপন তথ্য চুরি",
    ),
    l(
      "RBI describes people posing as telecom staff to obtain SIM identity credentials and duplicate a SIM; intercepted OTPs can enable unauthorized transactions. Independently contact the operator after unexplained prolonged network loss. A normal SIM upgrade is not itself proof of fraud.",
      "RBI ने दूरसंचार कर्मचारी बनकर SIM की गोपनीय जानकारी लेने और उसकी नकल करने का तरीका बताया है; मिले OTP से अनधिकृत लेनदेन हो सकते हैं। बिना कारण लंबे समय तक नेटवर्क गायब हो तो ऑपरेटर से स्वतंत्र संपर्क करें। सामान्य SIM अपग्रेड धोखाधड़ी का प्रमाण नहीं।",
      "RBI টেলিকম কর্মী সেজে SIM-এর গোপন তথ্য নিয়ে নকল SIM তৈরির কথা বলেছে; পাওয়া OTP দিয়ে অননুমোদিত লেনদেন হতে পারে। অকারণে দীর্ঘক্ষণ নেটওয়ার্ক না থাকলে অপারেটরের সঙ্গে নিজে যোগাযোগ করুন। সাধারণ SIM আপগ্রেড প্রতারণার প্রমাণ নয়।",
    ),
    "sim swap clone cloning esim duplicate upgrade telecom otp activation port सिम बदल डुप्लीकेट अपग्रेड पोर्ट sim badlo otp activation সিম বদল নকল আপগ্রেড পোর্ট sim bodol nokol upgrade",
    "2026-10-04",
  ),
  card(
    "rbi-qr-receipt",
    "rbi-qr-receive",
    ["credentials"],
    l(
      "Receiving money does not require a PIN",
      "पैसा पाने के लिए PIN की ज़रूरत नहीं",
      "টাকা পেতে PIN লাগে না",
    ),
    l(
      "RBI explains that receiving money does not require entering a PIN or OTP, and cautions against unknown QR codes and links. Check whether a request authorizes payment instead of receipt. Ordinary merchant payments that you initiate are a different context.",
      "RBI बताता है कि पैसा प्राप्त करने के लिए PIN या OTP दर्ज करना ज़रूरी नहीं; अनजान QR और लिंक से सावधान रहें। देखें कि माँग पैसा पाने की जगह भुगतान तो नहीं करा रही। स्वयं शुरू किया दुकानदार को भुगतान अलग संदर्भ है।",
      "RBI বলেছে টাকা পেতে PIN বা OTP দিতে হয় না; অচেনা QR ও লিংক সম্পর্কে সতর্ক থাকুন। দেখুন টাকা পাওয়ার বদলে পেমেন্ট অনুমোদন চাওয়া হচ্ছে কি না। নিজের শুরু করা দোকানের পেমেন্ট আলাদা প্রসঙ্গ।",
    ),
    "qr qrcode scan receive receiving collect request upi refund cashback pin otp स्कैन प्राप्त पाने क्यूआर पैसे लेने paise lene paane pin scan karo क्यूआर কিউআর স্ক্যান পেতে পাওয়া রিফান্ড টাকা taka pete paoa scan korun qr upi pin",
    "2026-10-04",
  ),
  card(
    "mha-paid-tasks",
    "mha-task-jobs",
    ["pay-to-earn", "off-platform"],
    l(
      "Task commissions followed by deposits",
      "टास्क कमीशन के बाद जमा रकम",
      "টাস্কের কমিশনের পরে টাকা জমা",
    ),
    l(
      "MHA describes task-job schemes using chat messengers: small initial commissions build trust, then larger deposits are requested and frozen. Independently verify unfamiliar financial requests. This does not establish whether a particular job, paid course or sender is genuine.",
      "गृह मंत्रालय ने चैट पर टास्क नौकरी में पहले छोटा कमीशन देकर भरोसा बनाने, फिर बड़ी जमा रकम माँगकर रोक लेने का तरीका बताया है। अनजान वित्तीय माँग स्वतंत्र रूप से जाँचें। इससे किसी खास नौकरी, पेड कोर्स या भेजने वाले की पुष्टि नहीं होती।",
      "স্বরাষ্ট্র মন্ত্রক চ্যাটে টাস্কের চাকরিতে প্রথমে ছোট কমিশন দিয়ে বিশ্বাস, পরে বড় অঙ্ক জমা চেয়ে আটকে দেওয়ার কথা বলেছে। অচেনা আর্থিক দাবি আলাদা যাচাই করুন। কোনো নির্দিষ্ট কাজ, টাকার বিনিময়ে কোর্স বা প্রেরক আসল কি না এতে প্রমাণ হয় না।",
    ),
    "task tasks jobs job work rating reviews commission earning starter deposit recharge topup premium order upgrade telegram whatsapp घर बैठे नौकरी टास्क रेटिंग कमीशन रिचार्ज जमा कमाई ghar baithe naukri kamai jama recharge টাস্ক রেটিং কমিশন রিচার্জ জমা চাকরি ঘরে কাজ taka joma chakri kaj recharge ay income",
    "2026-10-04",
  ),
  card(
    "ed-relationship-investment",
    "ed-relationship-investment",
    ["off-platform"],
    l(
      "Online trust followed by investment requests",
      "ऑनलाइन भरोसे के बाद निवेश की माँग",
      "অনলাইন বিশ্বাসের পরে বিনিয়োগের অনুরোধ",
    ),
    l(
      "ED describes long online friendships or romantic relationships that build trust before directing people to private messaging and phony investments, often crypto. Relationship language or a crypto mention alone is not evidence of this pattern; examine the actual investment request.",
      "ED ने लंबी ऑनलाइन दोस्ती या रोमांटिक संबंध से भरोसा बनाकर निजी चैट और झूठे निवेश, अक्सर क्रिप्टो, की ओर ले जाने का तरीका बताया है। केवल रिश्ते की भाषा या क्रिप्टो का उल्लेख प्रमाण नहीं; असली निवेश माँग देखें।",
      "ED দীর্ঘ অনলাইন বন্ধুত্ব বা প্রেমের মাধ্যমে বিশ্বাস তৈরি করে ব্যক্তিগত চ্যাট ও ভুয়ো বিনিয়োগে, প্রায়ই ক্রিপ্টোতে, নিয়ে যাওয়ার কথা বলেছে। শুধু সম্পর্কের ভাষা বা ক্রিপ্টোর উল্লেখ প্রমাণ নয়; আসল বিনিয়োগের অনুরোধ দেখুন।",
    ),
    "romance romantic friendship friend dating relationship trust crypto bitcoin investment private messaging app boyfriend girlfriend दोस्त प्यार रिश्ता भरोसा प्रेम crypto dost pyar bharosa निवेश বন্ধু প্রেম ভালোবাসা বিশ্বাস ক্রিপ্টো bondhu prem bhalobasha bishwas crypto",
    "2026-10-04",
  ),
  card(
    "rbi-advance-payments",
    "rbi-impersonation-fees",
    ["release-fee", "impersonation"],
    l(
      "Advance charges and invented official backing",
      "अग्रिम शुल्क और झूठा आधिकारिक समर्थन",
      "আগাম ফি ও ভুয়ো সরকারি সমর্থন",
    ),
    l(
      "RBI warns about invented official identities offering lottery winnings or remittances while demanding advance processing or transfer fees and security deposits. Verify independently. A normal tax, loan-processing charge or service fee alone does not establish this pattern.",
      "RBI ने झूठी आधिकारिक पहचान से लॉटरी या रकम भेजने का ऑफर देकर अग्रिम प्रोसेसिंग, ट्रांसफर शुल्क या सुरक्षा जमा माँगने से सावधान किया है। स्वतंत्र पुष्टि करें। सामान्य कर, ऋण प्रोसेसिंग या सेवा शुल्क अकेले इस तरीके का प्रमाण नहीं।",
      "RBI ভুয়ো সরকারি পরিচয়ে লটারি বা টাকা পাঠানোর প্রস্তাব দিয়ে আগাম প্রসেসিং, ট্রান্সফার ফি বা জামানত চাওয়া সম্পর্কে সতর্ক করেছে। আলাদা যাচাই করুন। সাধারণ কর, ঋণ প্রসেসিং বা পরিষেবার ফি একা এই ধরনের প্রমাণ নয়।",
    ),
    "lottery prize winnings winner gift remittance processing advance tax clearance security deposit rbi official लॉटरी इनाम पुरस्कार शुल्क पहले अग्रिम lottery inaam pehle jama লটারি পুরস্কার জেতা টাকা আগে ফি জামানত lottery puroskar age joma fee",
    "2026-10-04",
  ),
  // RBI KYC release, 2 February 2024: modus operandi, Do's and Don'ts.
  card(
    "rbi-kyc-secrets",
    "rbi-kyc",
    ["credentials", "account-threat", "urgency", "off-platform"],
    l(
      "KYC threats and secret codes",
      "KYC की धमकी और गुप्त कोड",
      "KYC নিয়ে হুমকি ও গোপন কোড",
    ),
    l(
      "RBI warns about unsolicited KYC messages that seek credentials or app installation using account-freeze threats. Confirm requests through independently obtained bank contacts; do not disclose OTPs or passwords.",
      "RBI ने खाता बंद करने की धमकी देकर गुप्त जानकारी या ऐप इंस्टॉल कराने वाले अनचाहे KYC संदेशों से सावधान किया है। बैंक का संपर्क खुद लेकर पुष्टि करें; OTP या पासवर्ड न बताएँ।",
      "RBI সতর্ক করেছে: অনাহূত KYC বার্তায় অ্যাকাউন্ট বন্ধের হুমকি দিয়ে গোপন তথ্য বা অ্যাপ ইনস্টল চাওয়া হতে পারে। ব্যাংকের যোগাযোগ নিজে খুঁজে নিশ্চিত করুন; OTP বা পাসওয়ার্ড দেবেন না।",
    ),
    "otp pin password passcode login credentials kyc freeze frozen blocked suspended account screen remote access anydesk teamviewer ओटीपी पासवर्ड खाता बंद लिंक otp batao bhejo account band ওটিপি পাসওয়ার্ড পিন অ্যাকাউন্ট বন্ধ লিঙ্ক otp din pathan account bondho",
  ),
  // MHA / I4C release, 14 May 2024: paragraphs 1–3 and reporting paragraph.
  card(
    "mha-authority-threats",
    "mha-cyber-impersonation",
    ["authority-threat", "impersonation"],
    l(
      "Officials impersonated to demand money",
      "अधिकारी बनकर पैसे माँगना",
      "কর্মকর্তা সেজে টাকা দাবি",
    ),
    l(
      "MHA describes callers impersonating police, CBI or RBI, inventing criminal cases and demanding money. Uniforms and video calls do not establish identity. Financial cybercrime can be reported through 1930 or cybercrime.gov.in.",
      "MHA ने पुलिस, CBI या RBI अधिकारी बनकर झूठे मुकदमे और पैसे की माँग करने वाले कॉल बताए हैं। वर्दी या वीडियो पहचान का प्रमाण नहीं। वित्तीय साइबर अपराध की सूचना 1930 या cybercrime.gov.in पर दें।",
      "MHA জানিয়েছে, পুলিশ, CBI বা RBI কর্মকর্তা সেজে মিথ্যা মামলার ভয় দেখিয়ে টাকা চাওয়া হয়। পোশাক বা ভিডিও পরিচয়ের প্রমাণ নয়। আর্থিক সাইবার অপরাধ 1930 বা cybercrime.gov.in-এ জানান।",
    ),
    "police cbi rbi arrest digital arrest criminal parcel investigation custody पुलिस गिरफ्तारी केस धमकी digital arrest paisa पुलिस अधिकारी পুলিশ গ্রেপ্তার মামলা পার্সেল হুমকি police taka greftar",
  ),
  // SEBI Fake Trading App Scams, one-page infographic, stages 3–6.
  card(
    "sebi-app-withdrawal",
    "sebi-fake-apps",
    ["release-fee", "off-platform", "borrow"],
    l(
      "Fake-app withdrawals and extra payments",
      "नकली ऐप में निकासी और अतिरिक्त भुगतान",
      "ভুয়ো অ্যাপে টাকা তোলা ও বাড়তি অর্থ দাবি",
    ),
    l(
      "SEBI describes fake apps showing profits, encouraging larger or borrowed deposits, then blocking withdrawals with excuses and fees. An app balance does not prove money can be withdrawn; a particular fee still needs independent verification.",
      "SEBI ने ऐसे नकली ऐप बताए हैं जो मुनाफा दिखाकर अधिक या उधार के पैसे जमा करवाते हैं, फिर बहानों और शुल्क से निकासी रोकते हैं। ऐप का बैलेंस निकासी का प्रमाण नहीं; शुल्क की स्वतंत्र जाँच ज़रूरी है।",
      "SEBI জানিয়েছে, ভুয়ো অ্যাপ লাভ দেখিয়ে আরও বা ধার করা টাকা জমা করায়, পরে অজুহাত ও ফি দিয়ে টাকা তোলা আটকায়। অ্যাপের ব্যালেন্স টাকা পাওয়ার প্রমাণ নয়; ফি আলাদাভাবে যাচাই করতে হবে।",
    ),
    "withdraw withdrawal withdrawable release unlock clearance charge balance payout processing fee tax security deposit topup borrow loan margin apk sideload app निकासी शुल्क टैक्स पैसा जमा उधार nikasi paise jama pehle fee টাকা তোলা তুলতে আটকে ফি কর জমা ধার taka tulte age fee joma balance char clearance",
  ),
  // SEBI Stock Market Guru Scams, stages 2–5. Two compact cards; each is a paraphrase.
  card(
    "sebi-guru-promises",
    "sebi-scams",
    ["guarantee", "periodic", "outsized", "urgency"],
    l(
      "Return promises and pressure",
      "रिटर्न का वादा और दबाव",
      "রিটার্নের প্রতিশ্রুতি ও চাপ",
    ),
    l(
      "SEBI warns about stock-market promotions offering fixed daily earnings or guaranteed profits and using limited-place pressure. Displaying profitable trades while hiding losses can mislead.",
      "SEBI ने तय दैनिक कमाई या पक्के मुनाफे का वादा और सीमित जगह बताकर दबाव डालने वाले शेयर प्रचार से सावधान किया है। नुकसान छिपाकर सिर्फ लाभ दिखाना भ्रामक हो सकता है।",
      "SEBI নির্দিষ্ট দৈনিক আয় বা নিশ্চিত লাভের প্রতিশ্রুতি ও সীমিত জায়গার চাপ নিয়ে সতর্ক করেছে। লোকসান লুকিয়ে শুধু লাভের লেনদেন দেখালে বিভ্রান্তি হতে পারে।",
    ),
    "guarantee guaranteed assured fixed guaranteed returns return profit profits daily monthly every day double triple percent riskfree no loss limited slots urgency today last मौका पक्का गारंटी रोज रोजाना मासिक मुनाफा निश्चित प्रतिदिन pakka munafa roz mahine din guaranteed নিশ্চিত গ্যারান্টি লাভ রোজ প্রতিদিন মাসে দ্বিগুণ nischit nishchit lav labh roj protidin mase digun",
  ),
  card(
    "sebi-paid-groups",
    "sebi-scams",
    ["promotion", "tip", "insider", "social-proof", "secrecy"],
    l(
      "Paid groups and hidden incentives",
      "पेड समूह और छिपे प्रोत्साहन",
      "টাকার বিনিময়ে গ্রুপ ও গোপন প্রণোদনা",
    ),
    l(
      "SEBI describes paid exclusive groups selling supposed insider tips, exaggerated success stories and undisclosed referral commissions. Recruiting others or paying for access is not evidence of investment expertise.",
      "SEBI ने कथित अंदरूनी टिप्स बेचने वाले पेड समूह, बढ़े-चढ़े सफलता के किस्से और छिपे रेफरल कमीशन बताए हैं। दूसरों को जोड़ना या प्रवेश शुल्क देना निवेश विशेषज्ञता का प्रमाण नहीं।",
      "SEBI কথিত ভেতরের খবর বিক্রি করা পেইড গ্রুপ, বাড়িয়ে বলা সাফল্য ও গোপন রেফারেল কমিশনের কথা বলেছে। লোক জোগাড় করা বা প্রবেশের টাকা দেওয়া বিনিয়োগে দক্ষতার প্রমাণ নয়।",
    ),
    "vip paid group course membership referral affiliate commission refer recruit join tip tips insider secret strategy confidential screenshot testimonial successful success earn activation task premium whatsapp telegram youtube instagram कोर्स कमीशन रेफरल गुप्त टिप्स सफलता जुड़ें join karo andar ki khabar কোর্স কমিশন রেফারেল গোপন টিপস সাফল্য যোগ দিন গুরুর গ্রুপ course group gopon tips commission referral",
  ),
  // SEBI social-media advisory, May 2025, page 1.
  card(
    "sebi-social-identity",
    "sebi-social-media",
    ["impersonation", "social-proof", "promotion"],
    l(
      "Social-media identities and endorsements",
      "सोशल मीडिया पहचान और समर्थन",
      "সামাজিক মাধ্যমে পরিচয় ও সমর্থন",
    ),
    l(
      "SEBI warns about social-media accounts impersonating public figures and regulated intermediaries, with misleading testimonials. A famous name, photograph or endorsement is not independent authentication of an offer.",
      "SEBI ने सार्वजनिक हस्तियों और विनियमित संस्थाओं की नकल करने वाले सोशल मीडिया खातों तथा भ्रामक प्रशंसाओं से सावधान किया है। प्रसिद्ध नाम, फोटो या समर्थन किसी ऑफर की स्वतंत्र पुष्टि नहीं।",
      "SEBI পরিচিত ব্যক্তি ও নিয়ন্ত্রিত প্রতিষ্ঠানের পরিচয় নকল করা সামাজিক মাধ্যমের অ্যাকাউন্ট ও বিভ্রান্তিকর প্রশংসা নিয়ে সতর্ক করেছে। বিখ্যাত নাম, ছবি বা সমর্থন কোনো প্রস্তাবের স্বাধীন যাচাই নয়।",
    ),
    "celebrity minister official endorsed endorsement professor impersonate verified badge famous testimonial screenshot deepfake अभिनेता समर्थन अधिकारी प्रोफेसर फोटो nakli celebrity मशहूर কর্মকর্তা অধ্যাপক বিখ্যাত ছবি সমর্থন bhua chhobi professor endorsement",
  ),
  // SEBI FPI scheme advisory, 22 August 2025, page 1.
  card(
    "sebi-fpi-access",
    "sebi-fpi-schemes",
    ["insider", "registration", "guarantee"],
    l(
      "Supposed institutional access",
      "कथित संस्थागत पहुँच",
      "কথিত প্রাতিষ্ঠানিক সুযোগ",
    ),
    l(
      "SEBI cautions about social-media schemes claiming FPI/FII access, institutional accounts, discounted IPOs or guaranteed allotment. Such claims need independent official checks; they do not prove SEBI endorsement.",
      "SEBI ने FPI/FII पहुँच, संस्थागत खाते, सस्ते IPO या पक्के आवंटन का दावा करने वाली सोशल मीडिया योजनाओं से सावधान किया है। स्वतंत्र आधिकारिक जाँच ज़रूरी है; ये दावे SEBI का समर्थन नहीं सिद्ध करते।",
      "SEBI সামাজিক মাধ্যমে FPI/FII সুযোগ, প্রাতিষ্ঠানিক অ্যাকাউন্ট, ছাড়ে IPO বা নিশ্চিত বরাদ্দের দাবি নিয়ে সতর্ক করেছে। আলাদা সরকারি যাচাই দরকার; দাবিগুলি SEBI-এর সমর্থনের প্রমাণ নয়।",
    ),
    "fpi fii institutional institution anchor block trade ipo allotment allot allocated discount discounted preipo संस्थागत आवंटन आईपीओ पक्का allotment मिलेगा প্রাতিষ্ঠানিক বরাদ্দ আইপিও নিশ্চিত institutional ipo boraddo allotment",
  ),
  // SEBI Pump and Dump Scam, stages 3–6.
  card(
    "sebi-pump-coordination",
    "sebi-pump",
    ["coordinated-pump", "tip", "urgency"],
    l(
      "Coordinated buying and dumping",
      "मिलकर कीमत बढ़ाना और बेचना",
      "দলবদ্ধভাবে দাম বাড়িয়ে বিক্রি",
    ),
    l(
      "SEBI describes coordinated buying that inflates a share price before organizers sell, leaving other investors exposed to losses. Social-media excitement or a buy-now call is not evidence of sustainable value.",
      "SEBI ने मिलकर खरीदारी से शेयर की कीमत बढ़ाकर आयोजकों के बेचने का तरीका बताया है, जिससे अन्य निवेशकों को नुकसान हो सकता है। सोशल मीडिया का उत्साह या अभी खरीदने की अपील टिकाऊ मूल्य का प्रमाण नहीं।",
      "SEBI দলবদ্ধ কেনাকাটায় শেয়ারের দাম বাড়িয়ে আয়োজকদের বিক্রির কথা বলেছে, যাতে অন্য বিনিয়োগকারীদের ক্ষতি হতে পারে। সামাজিক মাধ্যমের উত্তেজনা বা এখনই কেনার ডাক টেকসই মূল্যের প্রমাণ নয়।",
    ),
    "pump dump coordinated coordinated buying operator circuit upper penny multibagger buy now target stock शेयर खरीदें ऑपरेटर सर्किट sab saath kharido operator upper circuit শেয়ার কিনুন অপারেটর সার্কিট একসাথে সবাই দাম kinun sobai shobai eksathe ekshathe mile ekoi kinbo kine beche bechbo dam barabo tulbo operator pump",
  ),
  // SEBI Investor Awareness Messages, Dabba Trading section.
  card(
    "sebi-dabba-settlement",
    "sebi-dabba",
    ["off-exchange"],
    l(
      "Trading outside recognized exchanges",
      "मान्य एक्सचेंज से बाहर सौदे",
      "স্বীকৃত এক্সচেঞ্জের বাইরে লেনদেন",
    ),
    l(
      "SEBI explains that dabba operators settle securities deals internally without execution on recognized exchanges. Exchange grievance protections are unavailable for these deals. This does not describe every lawful over-the-counter transaction.",
      "SEBI के अनुसार डब्बा ऑपरेटर मान्य एक्सचेंज पर सौदा किए बिना प्रतिभूतियों का हिसाब अंदर ही करते हैं। ऐसे सौदों में एक्सचेंज की शिकायत सुरक्षा नहीं मिलती। हर वैध OTC सौदा ऐसा नहीं होता।",
      "SEBI বলেছে, ডাব্বা অপারেটর স্বীকৃত এক্সচেঞ্জে না করে নিজেদের মধ্যে সিকিউরিটিজের হিসাব মেটায়। এসব লেনদেনে এক্সচেঞ্জের অভিযোগ সুরক্ষা থাকে না। সব বৈধ OTC লেনদেনকে এটি বোঝায় না।",
    ),
    "dabba exchange settlement internal offexchange cash ledger डब्बा एक्सचेंज बाहर नकद dabba andar hisab ডাব্বা এক্সচেঞ্জ বাইরে নগদ hisab baire dabba",
  ),
  // SEBI mutual-fund NAV educational page: calculation and comparing funds.
  card(
    "sebi-nav-value",
    "sebi-mutual",
    ["nav"],
    l(
      "NAV is a value per unit",
      "NAV प्रति यूनिट का मूल्य है",
      "NAV হলো প্রতি ইউনিটের মূল্য",
    ),
    l(
      "NAV is fund assets minus liabilities, divided by units. SEBI explains that a higher NAV alone does not mean better performance; percentage change matters, and expenses affect asset value.",
      "NAV में फंड की संपत्ति से देनदारियाँ घटाकर यूनिटों से भाग देते हैं। SEBI बताता है कि केवल ऊँचा NAV बेहतर प्रदर्शन नहीं दिखाता; प्रतिशत बदलाव और खर्च का असर देखना होता है।",
      "NAV হলো ফান্ডের সম্পদ থেকে দায় বাদ দিয়ে ইউনিট সংখ্যা দিয়ে ভাগ করা মূল্য। SEBI বলেছে, শুধু বেশি NAV মানেই ভালো ফল নয়; শতাংশ পরিবর্তন ও খরচের প্রভাব দেখতে হয়।",
    ),
    "nav net asset value unit cheaper cheap higher lower mutual fund nfo face value एनएवी सस्ता यूनिट कम महंगा sasta mehenga nav কম বেশি সস্তা ইউনিট ফান্ড এনএভি sosta kom beshi nav",
  ),
  // SEBI Investment Adviser Master Circular, 6 February 2026, pages 39 and 42.
  card(
    "sebi-registration-limits",
    "sebi-adviser",
    ["registration", "guarantee"],
    l(
      "Registration does not guarantee returns",
      "पंजीकरण रिटर्न की गारंटी नहीं",
      "নিবন্ধন রিটার্নের নিশ্চয়তা নয়",
    ),
    l(
      "SEBI's adviser circular states that registration, enlistment and certification do not guarantee adviser performance or investor returns. A registration claim still needs an independent identity check.",
      "SEBI के सलाहकार परिपत्र के अनुसार पंजीकरण, सूचीबद्धता और प्रमाणपत्र सलाहकार के प्रदर्शन या निवेशक के रिटर्न की गारंटी नहीं हैं। पंजीकरण के दावे की पहचान अलग से जाँचनी होती है।",
      "SEBI-এর উপদেষ্টা নির্দেশিকা অনুযায়ী নিবন্ধন, তালিকাভুক্তি ও সনদ উপদেষ্টার ফল বা বিনিয়োগকারীর রিটার্নের নিশ্চয়তা দেয় না। নিবন্ধনের দাবির পরিচয় আলাদাভাবে যাচাই করতে হয়।",
    ),
    "registered registration sebi approved certified nism certificate licensed guaranteed regulator licence पंजीकरण सेबी मंजूरी प्रमाणित registered sebi manzoori प्रमाणपत्र নিবন্ধিত নিবন্ধন অনুমোদিত সেবি সনদ registered sebi onumodito",
  ),
  // SEBI risk-management educational page, risk/diversification paragraphs.
  card(
    "sebi-risk-diversification",
    "sebi-investing",
    ["guarantee"],
    l(
      "Diversification cannot remove all risk",
      "विविधीकरण सारा जोखिम नहीं मिटाता",
      "বিভিন্ন বিনিয়োগেও সব ঝুঁকি দূর হয় না",
    ),
    l(
      "SEBI explains that diversification can reduce some investment risks but cannot eliminate market-wide price fluctuations. General risk guidance does not establish the safety or suitability of a particular investment.",
      "SEBI बताता है कि विविधीकरण कुछ निवेश जोखिम घटा सकता है, लेकिन पूरे बाजार की कीमतों का उतार-चढ़ाव नहीं मिटाता। सामान्य जानकारी किसी खास निवेश की सुरक्षा या उपयुक्तता नहीं सिद्ध करती।",
      "SEBI বলেছে, বিভিন্ন বিনিয়োগে টাকা ভাগ করলে কিছু ঝুঁকি কমে, কিন্তু গোটা বাজারের দামের ওঠানামা দূর হয় না। সাধারণ তথ্য কোনো নির্দিষ্ট বিনিয়োগের নিরাপত্তা বা উপযুক্ততা প্রমাণ করে না।",
    ),
    "diversification diversify diversified volatility risk risks market crash spread portfolio loss zero risk जोखिम विविधीकरण उतार चढ़ाव nuksan jokhim ঝুঁকি বৈচিত্র্য ওঠানামা লোকসান jhuki jhুঁki loksan boichitro",
  ),
];

// Content-derived version binds changes to passages, translations, aliases and provenance.
export const EVIDENCE_CORPUS_VERSION = `curated-2026-10-04-${createHash("sha256").update(JSON.stringify(evidenceCorpus)).digest("hex").slice(0, 16)}`;
