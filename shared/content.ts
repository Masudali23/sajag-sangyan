import type { EvidenceSource, Lesson, Localized } from "./types.ts";
import { scamLessons } from "./scam-lessons.ts";
const t = (en: string, hi: string, bn: string): Localized => ({ en, hi, bn });
export const sources: EvidenceSource[] = [
  {
    id: "rbi-recovery-conduct",
    publisher: "Reserve Bank of India",
    title:
      "Outsourcing of Financial Services - Responsibilities of regulated entities employing Recovery Agents (August 2022)",
    url: "https://rbi.org.in/scripts/FS_Notification.aspx?Id=12378&Mode=0&fn=2",
    scope:
      "Paragraph 2: covered lenders and recovery agents must not intimidate, publicly humiliate or intrude on family privacy. Scope and microfinance exception are in paragraphs 5–6. This does not verify a debt or collector.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "pib-customs-fraud",
    publisher: "CBIC / PIB",
    title:
      "CBIC mounts campaign against frauds committed in the name of Indian Customs (June 2024)",
    url: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2025648&lang=2&reg=48",
    scope:
      "Impersonated customs/courier calls demand private-account payments to release parcels or avoid action. Verify official contacts independently; genuine customs duties are not automatically fraudulent.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "pib-electricity-kyc",
    publisher: "Department of Telecommunications / PIB",
    title: "DoT takes action against Electricity KYC Update Scam (June 2024)",
    url: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2025970&lang=2&reg=48",
    scope:
      "Electricity-KYC messages distributing malicious APKs to gain device control. Does not authenticate a particular bill, link or sender.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "pib-trai-impersonation",
    publisher: "TRAI / PIB",
    title: "Frauds in the Name of TRAI (June 2024)",
    url: "https://www.pib.gov.in/Pressreleaseshare.aspx?PRID=2023273&lang=2&reg=48",
    scope:
      "Forged TRAI notices threaten mobile disconnection and may direct users to malware or phishing. Not a statement that every telecom service notice is fake.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "pib-tax-phishing",
    publisher: "Income Tax Department / PIB",
    title:
      "Steps taken by Income Tax Department for safeguarding taxpayers from Phishing emails (February 2016)",
    url: "https://www.pib.gov.in/newsite/PrintRelease.aspx?lang=2&reg=48&relid=136117",
    scope:
      "The department uses routine email/SMS but does not request account PINs, passwords or similar access information by email. No current refund or sender verification.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "rbi-beaware",
    publisher: "Reserve Bank of India",
    title: "BE(A)WARE: financial fraud awareness booklet (March 2022)",
    url: "https://systemhealth.rbi.org.in/cms.rbi.org.in/cms/assets/Documents/BEAWARE07032022.pdf",
    scope:
      "Page 9: SIM duplication and impersonated telecom staff seeking credentials. General prevention guidance, not a live SIM or identity check.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "rbi-qr-receive",
    publisher: "Reserve Bank of India",
    title: "RBI Kehta Hai: Fraud Through UPI QR",
    url: "https://rbikehtahai.rbi.org.in/qr",
    scope:
      "Entering PIN/OTP is not required to receive money. Warns about unknown QR codes and links; ordinary merchant QR payments are a different context.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "mha-task-jobs",
    publisher: "Ministry of Home Affairs / I4C / PIB",
    title:
      "I4C action against investment and task-based part-time job frauds (December 2023)",
    url: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=1982936&lang=2&reg=48",
    scope:
      "Steps 1–4: task commissions build trust, followed by requests for larger deposits that become frozen. Does not label every job, fee or online task fraudulent.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "ed-relationship-investment",
    publisher: "Directorate of Enforcement / PIB",
    title:
      "Directorate of Enforcement Annual Report FY 2024–25: Pig Butchering, page 43",
    url: "https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/may/doc202551549501.pdf",
    scope:
      "Page 43: online relationships build trust before private-channel investment requests, including crypto. Friendship or crypto mentions alone do not establish fraud.",
    reviewedAt: "2026-10-04",
  },
  {
    id: "rbi-kyc",
    publisher: "Reserve Bank of India",
    title:
      "RBI cautions against frauds in the name of KYC updation (February 2024)",
    url: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=57244",
    scope:
      "Unsolicited credential requests, unverified links/apps and account-freeze threats. Contact the institution independently; ordinary KYC or user-initiated OTP entry is not itself evidence of fraud.",
    reviewedAt: "2026-10-03",
  },
  {
    id: "sebi-account-handling",
    publisher: "SEBI",
    title: "Caution on Account Handling Services (February 2026)",
    url: "https://www.sebi.gov.in/sebi_data/attachdocs/feb-2026/1772113926582.pdf",
    scope:
      "Account-handling offers and disclosure of trading credentials. No authentication of the person offering to handle an account.",
    reviewedAt: "2026-10-03",
  },
  {
    id: "mha-cyber-impersonation",
    publisher: "Ministry of Home Affairs / PIB",
    title:
      "Alert on blackmail and digital arrest by impersonated officials (May 2024)",
    url: "https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2020570&lang=2&reg=48",
    scope:
      "Impersonated police/CBI/RBI authority, fabricated criminal threats and demands for money. Reporting: 1930 and cybercrime.gov.in. Does not establish the identity of a particular caller.",
    reviewedAt: "2026-10-03",
  },
  {
    id: "rbi-impersonation-fees",
    publisher: "Reserve Bank of India",
    title:
      "Caution against fraudulent activities in the name of RBI (August 2024)",
    url: "https://systemhealth.rbi.org.in/Scripts/FS_PressRelease.aspx_prid%3D58595%26fn%3D14.html",
    scope:
      "Advance processing/transfer fees, supposed security deposits, credential demands and fake RBI accreditation. Verify through independent official contacts; not a finding that every tax or recovery fee is fraudulent.",
    reviewedAt: "2026-10-03",
  },
  {
    id: "sebi-pump",
    publisher: "SEBI Investor",
    title: "Pump and Dump Scams",
    url: "https://investor.sebi.gov.in/pdf/Pump%20and%20Dump%20Scam%20final.pdf",
    scope:
      "Coordinated price inflation followed by promoters selling their holdings. General mechanism, not proof about a specific trade or group.",
    reviewedAt: "2026-10-03",
  },
  {
    id: "sebi-dabba",
    publisher: "SEBI Investor",
    title: "Investor Awareness Messages: Dabba Trading",
    url: "https://investor.sebi.gov.in/awareness-messages.html",
    scope:
      "Securities deals settled internally without execution on recognized exchanges and the loss of exchange protection. Not a statement about every OTC transaction.",
    reviewedAt: "2026-10-03",
  },
  {
    id: "rbi-forex",
    publisher: "Reserve Bank of India",
    title: "Alert List of unauthorised forex entities and platforms",
    url: "https://www.rbi.org.in/scripts/bs_viewcontent.aspx?Id=4235",
    scope:
      "Check authorization for forex activity independently. Absence from the alert list is not evidence of authorization. Sajag does not perform a live list check.",
    reviewedAt: "2026-10-03",
  },
  {
    id: "sebi-scams",
    publisher: "SEBI Investor",
    title: "Stock Market Guru Scams",
    url: "https://investor.sebi.gov.in/pdf/Stock%20Market%20Guru%20Scams%20final.pdf",
    scope:
      "Warning signs, unrealistic promises and pressure tactics. General guidance, not a verdict on a particular sender.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-fake-apps",
    publisher: "SEBI Investor",
    title: "Fake Trading App Scams",
    url: "https://investor.sebi.gov.in/pdf/Fake%20trading%20app%20scam%20Landscape.pdf",
    scope:
      "Unverified APK links, fabricated profit displays and demands for fees when withdrawals are blocked. General warning signs; not proof about a specific app or every fee/bonus.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-social-media",
    publisher: "SEBI",
    title:
      "Caution on Stock Market Scams through Social Media Platforms (May 2025)",
    url: "https://www.sebi.gov.in/sebi_data/attachdocs/may-2025/1747825040886.pdf",
    scope:
      "Page 1: impersonation of public figures and intermediaries, and misleading testimonials. Does not authenticate a specific endorsement or sender.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-fpi-schemes",
    publisher: "SEBI",
    title:
      "Caution on Fraudulent Schemes Claiming FPI/FII Market Access (August 2025)",
    url: "https://www.sebi.gov.in/sebi_data/attachdocs/aug-2025/1755862022145.pdf",
    scope:
      "Page 1: social-media/app offers of institutional accounts, discounted IPOs and guaranteed allotment claiming FPI/FII access for Indian residents. Not a finding about every institutional account or pre-IPO offer.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-investing",
    publisher: "SEBI Investor",
    title: "How to Manage Investment Risks",
    url: "https://investor.sebi.gov.in/investment_risk_managment.html",
    scope:
      "Educational resources on investment risks, products and investor protection.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-mutual",
    publisher: "SEBI Investor",
    title: "Mutual Funds: Net Asset Value",
    url: "https://investor.sebi.gov.in/securities-mf-investments.html",
    scope:
      "NAV, per-unit calculations and the effects of expenses. A unit value alone does not establish performance.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-compounding",
    publisher: "SEBI Investor",
    title: "Power of Compounding",
    url: "https://investor.sebi.gov.in/moneymatters-powerofcom.html",
    scope: "The compounding mechanism, not a promise of returns.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-adviser",
    publisher: "SEBI",
    title: "Investment Adviser Master Circular, February 2026",
    url: "https://www.sebi.gov.in/sebi_data/attachdocs/feb-2026/1770375291405.pdf",
    scope:
      "Page 67, item 13: adviser registration does not assure performance or returns.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-fees",
    publisher: "SEBI Investor",
    title: "Regular and Direct Mutual Funds",
    url: "https://investor.sebi.gov.in/regular_and_direct_mutual_funds.html",
    scope:
      "Explains how different expenses affect accumulated value; no product recommendation.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-nomination",
    publisher: "SEBI",
    title: "Nomination in Demat Accounts and Mutual Fund Folios (May 2026)",
    url: "https://www.sebi.gov.in/sebi_data/attachdocs/jun-2026/1780397706130.pdf",
    scope:
      "Annexure B, page 8: nomination assists transmission to legal heirs. Effective September 2026.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-registry",
    publisher: "SEBI",
    title: "Recognised intermediaries",
    url: "https://www.sebi.gov.in/intermediaries.html",
    scope:
      "Official starting point for checking intermediary registration. Sajag does not perform a live registration check.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "sebi-scores",
    publisher: "SEBI SCORES",
    title: "Investor grievance redressal",
    url: "https://scores.sebi.gov.in/",
    scope:
      "Grievances relating to the securities market. Reporting does not guarantee recovery.",
    reviewedAt: "2026-10-02",
  },
  {
    id: "cybercrime",
    publisher: "Government of India",
    title: "National Cyber Crime Reporting Portal",
    url: "https://cybercrime.gov.in/",
    scope:
      "Official cybercrime reporting portal. Financial cyber fraud helpline: 1930.",
    reviewedAt: "2026-10-02",
  },
];
const coreLessons: Lesson[] = [
  {
    id: "risk",
    title: t(
      "Risk is part of the story",
      "जोखिम को समझें",
      "ঝুঁকির কথাও বুঝে নিন",
    ),
    subtitle: t(
      "Why “guaranteed” deserves a second look.",
      "“गारंटीड” सुनकर रुकना क्यों ज़रूरी है।",
      "‘গ্যারান্টি’ শুনলে কেন আরেকবার খতিয়ে দেখা দরকার।",
    ),
    category: t("START HERE", "यहाँ से शुरू करें", "এখান থেকে শুরু করুন"),
    minutes: 3,
    color: "peach",
    analogy: t(
      "Think of a farmer planting a crop. Good seeds and careful work help, but neither can promise the weather. A confident promise does not remove uncertainty.",
      "किसान अच्छी बुवाई और मेहनत करता है, पर मौसम की गारंटी नहीं दे सकता। आत्मविश्वास भरा वादा अनिश्चितता को खत्म नहीं करता।",
      "একজন চাষির কথা ভাবুন। ভালো বীজ আর যত্ন ফসল ফলাতে সাহায্য করে, কিন্তু আবহাওয়ার নিশ্চয়তা দেয় না। কেউ জোর দিয়ে কথা দিলেই অনিশ্চয়তা দূর হয় না।",
    ),
    explanation: t(
      "Investment risk means an outcome may differ from what you expect, including losing money. A promise of high returns with no risk needs careful examination. Some products have specific guarantees with conditions; a social media message alone does not establish one.",
      "निवेश में नतीजा उम्मीद से अलग हो सकता है और नुकसान भी हो सकता है। बिना जोखिम ऊँचे रिटर्न के दावे को ध्यान से जाँचें। कुछ उत्पादों में शर्तों के साथ गारंटी होती है; केवल सोशल मीडिया संदेश उसका प्रमाण नहीं है।",
      "বিনিয়োগে ঝুঁকি মানে ফল আপনার প্রত্যাশার চেয়ে আলাদা হতে পারে, এমনকি টাকার ক্ষতিও হতে পারে। ঝুঁকি ছাড়া বেশি লাভের প্রতিশ্রুতি ভালো করে খতিয়ে দেখা দরকার। কিছু বিনিয়োগে নির্দিষ্ট শর্তে গ্যারান্টি থাকে; শুধু সোশ্যাল মিডিয়ার মেসেজ দিয়ে তা প্রমাণ হয় না।",
    ),
    takeaway: t(
      "Ask: Who provides the guarantee, under what conditions, and where is the official document?",
      "पूछें: गारंटी कौन देता है, किन शर्तों पर, और आधिकारिक दस्तावेज़ कहाँ है?",
      "জিজ্ঞেস করুন: গ্যারান্টি কে দিচ্ছে, কী কী শর্তে, আর তার অফিসিয়াল নথি কোথায়?",
    ),
    question: t(
      "A message promises high, guaranteed market returns. What is the most useful next step?",
      "एक संदेश बाज़ार से ऊँचे, गारंटीड रिटर्न का वादा करता है। अगला सही कदम क्या है?",
      "একটি মেসেজ বাজারে বিনিয়োগ করে বেশি লাভের গ্যারান্টি দিচ্ছে। এর পরে কোন কাজটি সবচেয়ে কাজে দেবে?",
    ),
    options: [
      t(
        "Ask for independent evidence and the conditions",
        "स्वतंत्र प्रमाण और शर्तें माँगें",
        "আলাদা করে যাচাই করা যায় এমন প্রমাণ ও শর্ত জানতে চাওয়া",
      ),
      t(
        "Trust it because the sender is confident",
        "भेजने वाले के भरोसे को ही प्रमाण मानें",
        "যিনি পাঠিয়েছেন তিনি জোর দিয়ে বলছেন বলে বিশ্বাস করা",
      ),
      t(
        "Treat a profit screenshot as proof",
        "मुनाफे के स्क्रीनशॉट को प्रमाण मानें",
        "লাভের স্ক্রিনশটকেই প্রমাণ ধরা",
      ),
    ],
    answer: 0,
    feedback: t(
      "Exactly. Confidence and screenshots are not substitutes for evidence. Even registration does not guarantee investment performance.",
      "सही। भरोसेमंद अंदाज़ और स्क्रीनशॉट प्रमाण का विकल्प नहीं हैं। पंजीकरण भी प्रदर्शन की गारंटी नहीं है।",
      "ঠিক। জোর দিয়ে বলা আর স্ক্রিনশট দেখানো প্রমাণের বিকল্প নয়। রেজিস্ট্রেশন থাকলেও বিনিয়োগে ভালো ফলের গ্যারান্টি হয় না।",
    ),
    sourceIds: ["sebi-scams", "sebi-adviser"],
  },
  {
    id: "diversification",
    title: t(
      "One basket. Or a few?",
      "एक टोकरी या कई?",
      "এক ঝুড়িতে সব, নাকি কয়েকটিতে?",
    ),
    subtitle: t(
      "Understand diversification with a fruit basket.",
      "फलों की टोकरी से विविधीकरण समझें।",
      "ফলের ঝুড়ি দিয়ে বুঝুন বিনিয়োগ ভাগ করে রাখার কথা।",
    ),
    category: t("EVERYDAY MONEY", "आसान भाषा में", "রোজকার টাকাপয়সা"),
    minutes: 2,
    color: "sage",
    analogy: t(
      "If every mango in your basket comes from one tree, trouble with that tree affects the whole basket. Different trees spread that particular risk. A storm can still affect the whole orchard.",
      "अगर सारे आम एक ही पेड़ के हैं, तो उस पेड़ की बीमारी पूरी टोकरी को प्रभावित करेगी। अलग पेड़ इस जोखिम को बाँटते हैं। तूफ़ान फिर भी पूरे बगीचे को नुकसान पहुँचा सकता है।",
      "ঝুড়ির সব আম যদি একই গাছের হয়, সেই গাছে সমস্যা হলে পুরো ঝুড়িতেই তার প্রভাব পড়বে। আলাদা গাছের আম নিলে এই বিশেষ ঝুঁকিটা ছড়িয়ে যায়। তবু ঝড়ে পুরো বাগানেরই ক্ষতি হতে পারে।",
    ),
    explanation: t(
      "Diversification means spreading exposure across different investments. It can reduce concentration risk, but does not eliminate market-wide risk or guarantee returns. Owning several investments that move together may offer less diversification than it appears.",
      "विविधीकरण यानी अलग-अलग निवेशों में जोखिम बाँटना। इससे एक जगह निर्भरता घट सकती है, लेकिन पूरे बाज़ार का जोखिम नहीं मिटता। साथ-साथ बदलने वाले कई निवेश हमेशा पर्याप्त विविधता नहीं देते।",
      "আলাদা আলাদা বিনিয়োগে টাকা ভাগ করে রাখাকে ডাইভার্সিফিকেশন বলে। এতে এক জায়গার ওপর নির্ভর করার ঝুঁকি কমতে পারে, কিন্তু গোটা বাজারের ঝুঁকি দূর হয় না বা লাভের গ্যারান্টি মেলে না। একসঙ্গে ওঠানামা করে এমন কয়েকটি বিনিয়োগ রাখলে ঝুঁকি যতটা ছড়িয়েছে বলে মনে হয়, আসলে তার চেয়ে কম ছড়াতে পারে।",
    ),
    takeaway: t(
      "Spreading risk is different from removing risk.",
      "जोखिम बाँटना और जोखिम मिटाना अलग बातें हैं।",
      "ঝুঁকি ভাগ করে ছড়ানো আর ঝুঁকি দূর করা এক কথা নয়।",
    ),
    question: t(
      "Can diversification prevent every loss?",
      "क्या विविधीकरण हर नुकसान रोक सकता है?",
      "বিনিয়োগ ভাগ করে রাখলে কি সব ক্ষতি ঠেকানো যায়?",
    ),
    options: [
      t(
        "Yes, if you own enough investments",
        "हाँ, अगर निवेश बहुत सारे हों",
        "হ্যাঁ, যথেষ্ট বেশি বিনিয়োগ থাকলে",
      ),
      t(
        "No. Broad market risks can still affect them",
        "नहीं। पूरे बाज़ार का जोखिम फिर भी असर कर सकता है",
        "না। গোটা বাজারের ঝুঁকি তখনও প্রভাব ফেলতে পারে",
      ),
      t(
        "Only when someone promises it",
        "केवल जब कोई वादा करे",
        "শুধু কেউ তার প্রতিশ্রুতি দিলে",
      ),
    ],
    answer: 1,
    feedback: t(
      "Diversification can reduce concentration risk. It cannot promise protection from all losses.",
      "विविधीकरण एक जगह निर्भरता घटाता है। हर नुकसान से सुरक्षा का वादा नहीं करता।",
      "বিনিয়োগ ভাগ করে রাখলে এক জায়গার ওপর নির্ভর করার ঝুঁকি কমতে পারে। এতে সব ক্ষতি থেকে বাঁচার গ্যারান্টি হয় না।",
    ),
    sourceIds: ["sebi-investing"],
  },
  {
    id: "volatility",
    title: t(
      "The ups, the downs, the why",
      "उतार-चढ़ाव को समझें",
      "দাম কেন ওঠে, কেন নামে",
    ),
    subtitle: t(
      "A bumpy journey is not a forecast.",
      "ऊबड़-खाबड़ रास्ता भविष्यवाणी नहीं है।",
      "ঝাঁকুনি দেখে পথের শেষ জানা যায় না।",
    ),
    category: t("UNDERSTAND RISK", "जोखिम समझें", "ঝুঁকি বুঝুন"),
    minutes: 3,
    color: "lavender",
    analogy: t(
      "A bus on a bumpy road moves up and down. That movement tells you how rough the ride is, not where the bus will end up. Market fluctuations work similarly.",
      "ऊबड़-खाबड़ सड़क पर बस ऊपर-नीचे हिलती है। इससे सफर का उतार-चढ़ाव पता चलता है, मंज़िल नहीं। बाज़ार की हलचल भी ऐसी ही है।",
      "ভাঙাচোরা রাস্তায় বাস দুলতে থাকে। এতে বোঝা যায় যাত্রায় কতটা ঝাঁকুনি হচ্ছে, বাস শেষ পর্যন্ত কোথায় পৌঁছাবে তা বোঝা যায় না। বাজারের ওঠানামাও অনেকটা এমন।",
    ),
    explanation: t(
      "Volatility describes how much values fluctuate. Large or frequent movements can feel uncomfortable. A past rise does not establish the next move. A 20% fall requires a 25% rise from the lower value just to return to the starting point, before costs.",
      "अस्थिरता बताती है कि मूल्य कितना बदलता है। पिछले उछाल से अगली चाल तय नहीं होती। 20% गिरावट के बाद शुरुआती मूल्य पर लौटने के लिए निचले मूल्य से 25% बढ़त चाहिए, खर्चों से पहले।",
      "দাম কতটা ওঠানামা করে, তাকে ভোলাটিলিটি বলা হয়। দাম খুব বেশি বা ঘন ঘন বদলালে অস্বস্তি হতে পারে। আগে দাম বেড়েছে বলেই পরের বার কী হবে তা ঠিক হয় না। দাম ২০% কমলে আগের জায়গায় ফিরতে কমে যাওয়া দাম থেকে ২৫% বাড়তে হয়। এতে খরচ ধরা হয়নি।",
    ),
    takeaway: t(
      "A chart can describe the past. It cannot promise the future.",
      "चार्ट बीता समय दिखा सकता है। भविष्य का वादा नहीं कर सकता।",
      "চার্ট অতীত দেখাতে পারে। ভবিষ্যতের প্রতিশ্রুতি দিতে পারে না।",
    ),
    question: t(
      "A fictional 100 tokens falls by 20%. What rise brings 80 back to 100?",
      "काल्पनिक 100 टोकन 20% गिरकर 80 हो गए। वापस 100 के लिए कितनी बढ़त चाहिए?",
      "কাল্পনিক ১০০ টোকেন ২০% কমে ৮০ হলো। আবার ১০০ হতে কত শতাংশ বাড়তে হবে?",
    ),
    options: [
      t("20%", "20%", "২০%"),
      t("25%", "25%", "২৫%"),
      t(
        "It will automatically recover",
        "अपने आप वापस आ जाएगा",
        "নিজে থেকেই আগের অবস্থায় ফিরবে",
      ),
    ],
    answer: 1,
    feedback: t(
      "25% of 80 is 20. Recovery is not guaranteed; this is only arithmetic.",
      "80 का 25% = 20। वापसी की गारंटी नहीं है; यह सिर्फ गणित है।",
      "৮০-এর ২৫% হলো ২০। আগের অবস্থায় ফেরার গ্যারান্টি নেই; এটি শুধু অঙ্ক।",
    ),
    sourceIds: ["sebi-investing"],
  },
  {
    id: "compounding",
    title: t(
      "Small changes build on each other",
      "छोटे बदलाव जुड़ते जाते हैं",
      "এক বদলের ওপর আরেক বদল",
    ),
    subtitle: t(
      "The maths behind growth—and loss.",
      "बढ़त और नुकसान के पीछे का गणित।",
      "বৃদ্ধি আর ক্ষতির পেছনের অঙ্ক।",
    ),
    category: t("EVERYDAY MONEY", "आसान भाषा में", "রোজকার টাকাপয়সা"),
    minutes: 3,
    color: "butter",
    analogy: t(
      "Imagine a snowball. Each new layer changes the size on which the next layer forms. In finance, percentage changes also apply to a changing base—including when the base shrinks.",
      "बर्फ के गोले की हर नई परत उसका आकार बदलती है। अगली परत बदले हुए आकार पर बनती है। प्रतिशत बदलाव भी बदलते आधार पर लागू होते हैं, गिरावट में भी।",
      "বরফের একটি বল কল্পনা করুন। নতুন পরত জমলে তার আকার বদলে যায়। পরের পরত সেই বদলে যাওয়া আকারের ওপর জমে। টাকার ক্ষেত্রেও শতাংশের হিসাব বদলে যাওয়া অঙ্কের ওপর হয়, অঙ্কটা কমে গেলেও।",
    ),
    explanation: t(
      "Compounding applies percentage changes to the updated amount. In a fictional example, 100 growing 10% becomes 110; another 10% makes 121. But a 10% rise followed by a 10% fall ends at 99. These numbers are arithmetic examples, not expected returns.",
      "चक्रवृद्धि में प्रतिशत बदलाव नई राशि पर लागू होता है। उदाहरण: 100 पर 10% बढ़त से 110 और फिर 10% से 121। लेकिन 10% बढ़त के बाद 10% गिरावट से 99 बचते हैं। ये गणित के उदाहरण हैं, रिटर्न का अनुमान नहीं।",
      "চক্রবৃদ্ধির হিসাবে শতাংশের পরিবর্তন নতুন অঙ্কের ওপর হয়। একটি কাল্পনিক উদাহরণ: ১০০-এর ওপর ১০% বাড়লে হয় ১১০; তার ওপর আরও ১০% বাড়লে হয় ১২১। কিন্তু ১০% বাড়ার পরে ১০% কমলে থাকে ৯৯। এগুলো অঙ্কের উদাহরণ, কত রিটার্ন পাওয়া যাবে তার অনুমান নয়।",
    ),
    takeaway: t(
      "Always check the starting amount, time period, costs and assumptions behind a percentage.",
      "प्रतिशत के पीछे की शुरुआती राशि, समय, खर्च और अनुमान जाँचें।",
      "শতাংশের হিসাবের পেছনে শুরুর টাকা, সময়কাল, খরচ আর কী কী ধরে নেওয়া হয়েছে, সব দেখুন।",
    ),
    question: t(
      "100 tokens rises 10%, then falls 10%. How many remain?",
      "100 टोकन 10% बढ़े, फिर 10% गिरे। कितने बचे?",
      "১০০ টোকেন ১০% বাড়ল, তার পরে ১০% কমল। কত বাকি রইল?",
    ),
    options: [
      t("100", "100", "১০০"),
      t("101", "101", "১০১"),
      t("99", "99", "৯৯"),
    ],
    answer: 2,
    feedback: t(
      "110 × 0.90 = 99. Equal percentage rises and falls do not cancel each other.",
      "110 × 0.90 = 99। बराबर प्रतिशत की बढ़त और गिरावट एक-दूसरे को रद्द नहीं करतीं।",
      "১১০ × ০.৯০ = ৯৯। একই শতাংশ বাড়া আর কমা একে অন্যকে মুছে দেয় না।",
    ),
    sourceIds: ["sebi-compounding"],
  },
  {
    id: "fees",
    title: t(
      "The small print has a price",
      "छोटे अक्षरों में छिपा खर्च",
      "ছোট অক্ষরের শর্তেও খরচ থাকে",
    ),
    subtitle: t(
      "Understand what fees change.",
      "समझें कि शुल्क क्या बदलता है।",
      "ফি আপনার হিসাবে কী বদলায়, বুঝে নিন।",
    ),
    category: t("READ THE DETAILS", "विवरण पढ़ें", "খুঁটিনাটি পড়ুন"),
    minutes: 2,
    color: "peach",
    analogy: t(
      "Two shops may show the same price for a bag of rice. Delivery, packaging and other charges can change what you actually pay. Financial products have different kinds of costs too.",
      "चावल के दो थैलों की कीमत समान दिख सकती है, लेकिन डिलीवरी और पैकिंग का खर्च कुल कीमत बदल देता है। वित्तीय उत्पादों में भी अलग-अलग खर्च होते हैं।",
      "দুই দোকানে এক বস্তা চালের দাম এক দেখাতে পারে। কিন্তু ডেলিভারি, প্যাকিং আর অন্য চার্জ যোগ হলে মোট খরচ বদলে যায়। বিনিয়োগেও নানা ধরনের খরচ থাকে।",
    ),
    explanation: t(
      "Fees reduce the amount you keep. Mutual funds can have ongoing expenses that affect accumulated value. Read the applicable cost disclosures for the exact rules. Compare like-for-like disclosures and ask whether a quoted figure is before or after costs. A lower fee alone does not make a product suitable.",
      "शुल्क आपके पास बचने वाली राशि घटाता है। म्यूचुअल फंड में नियमित खर्च जमा मूल्य को प्रभावित कर सकते हैं। सही नियमों के लिए शुल्क का विवरण पढ़ें। पूछें कि बताई गई राशि खर्चों से पहले है या बाद में। केवल कम शुल्क से कोई उत्पाद उपयुक्त नहीं हो जाता।",
      "ফি দিলে আপনার হাতে থাকা টাকা কমে। মিউচুয়াল ফান্ডের নিয়মিত খরচ জমা টাকার মূল্যকে প্রভাবিত করতে পারে। ঠিক কী নিয়ম প্রযোজ্য, জানতে খরচের বিবরণ পড়ুন। একই ভিত্তিতে দেওয়া হিসাবের তুলনা করুন এবং জিজ্ঞেস করুন, বলা অঙ্কটি খরচ বাদ দেওয়ার আগে, নাকি পরে। শুধু ফি কম হলেই কোনো বিনিয়োগ আপনার জন্য মানানসই হয় না।",
    ),
    takeaway: t(
      "Ask for a complete cost breakdown, in money as well as percentages.",
      "पूरा खर्च रुपये और प्रतिशत, दोनों में समझें।",
      "পুরো খরচের হিসাব চান, টাকার অঙ্কে এবং শতাংশে।",
    ),
    question: t(
      "Which question helps you understand a return claim?",
      "रिटर्न का दावा समझने के लिए कौन-सा सवाल उपयोगी है?",
      "রিটার্নের দাবি বুঝতে কোন প্রশ্নটি সাহায্য করবে?",
    ),
    options: [
      t(
        "Is this before or after all applicable fees?",
        "क्या यह सभी लागू शुल्कों से पहले है या बाद में?",
        "এটি কি সব প্রযোজ্য ফি বাদ দেওয়ার আগে, নাকি পরে?",
      ),
      t(
        "Does the message have lots of likes?",
        "क्या संदेश पर बहुत लाइक हैं?",
        "মেসেজটিতে কি অনেক লাইক আছে?",
      ),
      t(
        "Does the graph look impressive?",
        "क्या ग्राफ प्रभावशाली दिखता है?",
        "গ্রাফটি কি চমৎকার দেখাচ্ছে?",
      ),
    ],
    answer: 0,
    feedback: t(
      "Costs and the measurement period matter. Likes and presentation do not establish the result.",
      "खर्च और समयावधि मायने रखते हैं। लाइक और प्रस्तुति नतीजे का प्रमाण नहीं हैं।",
      "খরচ আর কোন সময়ের হিসাব দেখানো হচ্ছে, দুটোই দরকারি। লাইক বা সাজিয়ে দেখানো দিয়ে ফল প্রমাণ হয় না।",
    ),
    sourceIds: ["sebi-fees"],
  },
  {
    id: "nav",
    title: t("NAV, without the jargon", "NAV, आसान भाषा में", "NAV, সহজ কথায়"),
    subtitle: t(
      "A unit value is not a bargain label.",
      "यूनिट का मूल्य सस्ता होने का प्रमाण नहीं।",
      "ইউনিটের দাম কম মানেই সস্তায় ভালো বিনিয়োগ নয়।",
    ),
    category: t("DECODE THE WORDS", "शब्द समझें", "শব্দের মানে বুঝুন"),
    minutes: 2,
    color: "sage",
    analogy: t(
      "Cut one cake into 10 slices and another identical cake into 20. A smaller slice costs less, but you are not getting more cake for the same total price. Unit counts matter.",
      "एक जैसे केक को 10 और 20 टुकड़ों में काटें। छोटा टुकड़ा सस्ता है, लेकिन समान कुल कीमत पर ज़्यादा केक नहीं मिलता। यूनिट की संख्या मायने रखती है।",
      "একটি কেক ১০ টুকরো করুন, আর একই রকম আরেকটি কেক ২০ টুকরো করুন। ছোট টুকরোর দাম কম, কিন্তু একই মোট দামে বেশি কেক পাচ্ছেন না। ইউনিটের সংখ্যা তাই বুঝতে হয়।",
    ),
    explanation: t(
      "Net Asset Value, or NAV per unit, is broadly a mutual fund’s net assets divided by its units. A lower NAV by itself does not make one fund cheaper or better than another. Underlying holdings, risks and costs still matter.",
      "नेट एसेट वैल्यू यानी प्रति यूनिट NAV मोटे तौर पर फंड की शुद्ध संपत्ति को यूनिट की संख्या से भाग देकर मिलता है। केवल कम NAV से फंड सस्ता या बेहतर नहीं होता। संपत्तियाँ, जोखिम और खर्च भी मायने रखते हैं।",
      "নেট অ্যাসেট ভ্যালু বা প্রতি ইউনিট NAV হলো মোটামুটি মিউচুয়াল ফান্ডের নিট সম্পদের মূল্যকে ইউনিটের সংখ্যা দিয়ে ভাগ করলে যা হয়। শুধু NAV কম বলে একটি ফান্ড অন্যটির চেয়ে সস্তা বা ভালো হয় না। ফান্ড কোথায় টাকা রেখেছে, তার ঝুঁকি আর খরচও বুঝতে হয়।",
    ),
    takeaway: t(
      "NAV is a unit value, not a quality score or a future-return prediction.",
      "NAV एक यूनिट का मूल्य है, गुणवत्ता का अंक या भविष्य के रिटर्न का अनुमान नहीं।",
      "NAV একটি ইউনিটের মূল্য। এটি মানের নম্বর বা ভবিষ্যতের রিটার্নের পূর্বাভাস নয়।",
    ),
    question: t(
      "Does a lower NAV alone mean a mutual fund is a better deal?",
      "क्या केवल कम NAV का मतलब बेहतर सौदा है?",
      "শুধু NAV কম হলেই কি একটি মিউচুয়াল ফান্ডে বিনিয়োগ বেশি লাভজনক?",
    ),
    options: [
      t("Always", "हमेशा", "সব সময়"),
      t(
        "No, a unit value alone is not enough",
        "नहीं, केवल यूनिट का मूल्य पर्याप्त नहीं",
        "না, শুধু ইউনিটের দাম জানাই যথেষ্ট নয়",
      ),
      t(
        "Yes, when a creator says so",
        "हाँ, जब कोई क्रिएटर कहे",
        "হ্যাঁ, কোনো কনটেন্ট নির্মাতা বললে",
      ),
    ],
    answer: 1,
    feedback: t(
      "The cake analogy helps: the size of a unit alone says little about the underlying investment.",
      "केक का उदाहरण याद करें: एक यूनिट का आकार पूरे निवेश के बारे में बहुत कम बताता है।",
      "কেকের উদাহরণটি মনে করুন: শুধু একটি ইউনিটের আকার দেখে পুরো বিনিয়োগ সম্পর্কে খুব কমই বোঝা যায়।",
    ),
    sourceIds: ["sebi-mutual"],
  },
  {
    id: "nomination",
    title: t(
      "A small step for your family",
      "परिवार के लिए छोटा कदम",
      "পরিবারের জন্য ছোট একটি কাজ",
    ),
    subtitle: t(
      "What a nominee does—and does not mean.",
      "नामांकन का अर्थ समझें।",
      "নমিনি করার মানে কী, আর কী নয়।",
    ),
    category: t("FAMILY & FINANCE", "परिवार और वित्त", "পরিবার ও টাকাপয়সা"),
    minutes: 3,
    color: "lavender",
    analogy: t(
      "Think of a clearly labelled emergency contact. It helps an institution know whom to approach, but it is not a substitute for every legal document or inheritance rule.",
      "स्पष्ट आपातकालीन संपर्क की तरह, नामांकन संस्था को प्रक्रिया में मदद करता है। यह हर कानूनी दस्तावेज़ या उत्तराधिकार नियम का विकल्प नहीं है।",
      "জরুরি অবস্থায় কার সঙ্গে যোগাযোগ করতে হবে, তা স্পষ্ট করে লিখে রাখার কথা ভাবুন। এতে প্রতিষ্ঠান বুঝতে পারে কার সঙ্গে কথা বলতে হবে। কিন্তু এটি সব আইনি নথি বা উত্তরাধিকারের নিয়মের বিকল্প নয়।",
    ),
    explanation: t(
      "Nomination can help with transmission of financial assets after a holder’s death. Procedures and legal effects depend on the asset and applicable rules. Check current instructions with the institution. Do not upload family identity or account documents to Sajag.",
      "नामांकन धारक की मृत्यु के बाद संपत्ति के हस्तांतरण की प्रक्रिया में मदद कर सकता है। प्रक्रिया और कानूनी प्रभाव संपत्ति व लागू नियमों पर निर्भर हैं। संस्था से वर्तमान निर्देश लें। परिवार की पहचान या खाते के दस्तावेज़ Sajag पर न डालें।",
      "মালিকের মৃত্যুর পরে আর্থিক সম্পদ হস্তান্তরের প্রক্রিয়ায় নমিনি করা থাকলে সাহায্য হতে পারে। প্রক্রিয়া আর আইনি ফল সম্পদের ধরন এবং প্রযোজ্য নিয়মের ওপর নির্ভর করে। প্রতিষ্ঠানের কাছে বর্তমান নির্দেশ জেনে নিন। পরিবারের পরিচয়পত্র বা অ্যাকাউন্টের নথি সজাগে আপলোড করবেন না।",
    ),
    takeaway: t(
      "Check the nomination process with the relevant institution and keep your family informed.",
      "संबंधित संस्था से नामांकन प्रक्रिया समझें और परिवार को जानकारी दें।",
      "সংশ্লিষ্ট প্রতিষ্ঠানের কাছে নমিনি করার প্রক্রিয়া জেনে নিন এবং পরিবারকে জানিয়ে রাখুন।",
    ),
    question: t(
      "Where should you check your account’s nomination procedure?",
      "अपने खाते की नामांकन प्रक्रिया कहाँ जाँचें?",
      "আপনার অ্যাকাউন্টে নমিনি করার প্রক্রিয়া কোথায় জানতে চাইবেন?",
    ),
    options: [
      t(
        "An unknown forwarded link",
        "अनजान फॉरवर्ड किए लिंक पर",
        "ফরওয়ার্ড হয়ে আসা অচেনা লিংকে",
      ),
      t(
        "A social media comment",
        "सोशल मीडिया टिप्पणी में",
        "সোশ্যাল মিডিয়ার কমেন্টে",
      ),
      t(
        "The institution’s official channel",
        "संस्था के आधिकारिक माध्यम से",
        "প্রতিষ্ঠানের অফিসিয়াল যোগাযোগের মাধ্যমে",
      ),
    ],
    answer: 2,
    feedback: t(
      "Use the institution’s official channel. Sajag never needs your account number or identity documents.",
      "संस्था का आधिकारिक माध्यम इस्तेमाल करें। Sajag को आपका खाता नंबर या पहचान दस्तावेज़ नहीं चाहिए।",
      "প্রতিষ্ঠানের অফিসিয়াল যোগাযোগের মাধ্যম ব্যবহার করুন। সজাগের কখনও আপনার অ্যাকাউন্ট নম্বর বা পরিচয়পত্র দরকার হয় না।",
    ),
    sourceIds: ["sebi-nomination"],
  },
];
// “Start here” first, then how common scams work, then everyday money concepts.
export const lessons: Lesson[] = [
  coreLessons[0],
  ...scamLessons,
  ...coreLessons.slice(1),
];
export const sampleClaims = [
  {
    title: t(
      "The “guaranteed returns” forward",
      "“गारंटीड रिटर्न” वाला संदेश",
      "‘গ্যারান্টি দিয়ে লাভ’ বলছে যে ফরওয়ার্ড",
    ),
    platform: "WhatsApp",
    text: t(
      "Earn 3% guaranteed returns every day! Our SEBI registered experts ensure zero risk. Join our VIP WhatsApp group today. Only 10 spots left. DM now!",
      "हर दिन 3% गारंटीड रिटर्न कमाएँ! हमारे SEBI पंजीकृत विशेषज्ञ शून्य जोखिम सुनिश्चित करते हैं। आज ही VIP WhatsApp ग्रुप में जुड़ें। सिर्फ 10 जगह बाकी। अभी संपर्क करें!",
      "প্রতিদিন ৩% রিটার্নের গ্যারান্টি! আমাদের SEBI-রেজিস্টার্ড বিশেষজ্ঞরা নিশ্চিত করছেন, কোনো ঝুঁকি নেই। আজই আমাদের VIP WhatsApp গ্রুপে যোগ দিন। আর মাত্র ১০ জনের জায়গা। এখনই মেসেজ করুন!",
    ),
  },
  {
    title: t(
      "A lesson, or a sales pitch?",
      "जानकारी या बेचने की कोशिश?",
      "শেখাচ্ছে, নাকি কিছু বিক্রি করছে?",
    ),
    platform: "Instagram",
    text: t(
      "Diversification means spreading investments across different assets. It cannot remove all risk. Join my paid course with my referral code to unlock the best mutual fund picks.",
      "विविधीकरण का मतलब अलग-अलग संपत्तियों में निवेश बाँटना है। इससे हर जोखिम खत्म नहीं होता। सबसे अच्छे म्यूचुअल फंड जानने के लिए मेरे रेफरल कोड से मेरा पेड कोर्स खरीदें।",
      "আলাদা ধরনের সম্পদে বিনিয়োগ ভাগ করে রাখাকে ডাইভার্সিফিকেশন বলে। এতে সব ঝুঁকি দূর হয় না। সেরা মিউচুয়াল ফান্ড বেছে নিতে আমার রেফারেল কোড দিয়ে টাকা দিয়ে আমার কোর্সে যোগ দিন।",
    ),
  },
  {
    title: t(
      "A claim about lower NAV",
      "कम NAV के बारे में दावा",
      "কম NAV নিয়ে একটি দাবি",
    ),
    platform: "YouTube",
    text: t(
      "A mutual fund with a lower NAV is always cheaper and will give better returns. This fund at NAV 10 is better than one at NAV 100.",
      "कम NAV वाला म्यूचुअल फंड हमेशा सस्ता होता है और बेहतर रिटर्न देगा। 10 NAV वाला फंड 100 NAV वाले से बेहतर है।",
      "কম NAV-এর মিউচুয়াল ফান্ড সব সময় সস্তা এবং বেশি রিটার্ন দেবে। এই ১০ NAV-এর ফান্ডটি ১০০ NAV-এর ফান্ডের চেয়ে ভালো।",
    ),
  },
];
