import type { Lesson, Localized } from "./types.ts";
const t = (en: string, hi: string, bn: string): Localized => ({ en, hi, bn });

const spot = t("SPOT THE SCAM", "ठगी पहचानें", "প্রতারণা চিনুন");

// How common scams work, step by step. Every claim stays inside the linked
// source's scope (see sources in content.ts); examples are original.
export const scamLessons: Lesson[] = [
  {
    id: "digital-arrest",
    title: t(
      "“Digital arrest” is a scam script",
      "“डिजिटल अरेस्ट” ठगी की एक स्क्रिप्ट है",
      "‘ডিজিটাল অ্যারেস্ট’ আসলে প্রতারণার ছক",
    ),
    subtitle: t(
      "Fear, a uniform on video, then a demand for money.",
      "डर, वीडियो पर वर्दी, और फिर पैसों की माँग।",
      "ভয় দেখানো, ভিডিওতে উর্দি, তারপর টাকার দাবি।",
    ),
    category: spot,
    minutes: 3,
    color: "peach",
    analogy: t(
      "Imagine a stranger in a borrowed uniform knocking at night. He says you will be jailed unless you hand over your savings “for checking” and tell no one. The uniform is a costume; the secrecy and the money demand give the game away.",
      "सोचिए, रात को कोई अजनबी उधार की वर्दी पहनकर दरवाज़ा खटखटाए। वह कहे कि अपनी बचत “जाँच” के लिए दे दो और किसी को मत बताना, वरना जेल होगी। वर्दी सिर्फ़ दिखावा है; चुप रहने का दबाव और पैसों की माँग सच बता देते हैं।",
      "ভাবুন, রাতে ধার করা উর্দি পরে এক অচেনা লোক দরজায় কড়া নাড়ল। সে বলল, ‘যাচাইয়ের’ জন্য সঞ্চয়ের টাকা দিন আর কাউকে বলবেন না, নইলে জেল হবে। উর্দিটা শুধু সাজ; গোপন রাখার চাপ আর টাকার দাবিই আসল পরিচয় ফাঁস করে দেয়।",
    ),
    explanation: t(
      "Fraudsters pretend to be police, CBI, customs or RBI officials. They claim a parcel, SIM or bank account in your name is linked to a crime, keep you on a video call, forbid you to tell your family, and demand money to “clear your name” or for “verification”. The Ministry of Home Affairs has warned about these fake “digital arrests”. A uniform, an office background or an ID card on a video call proves nothing about who the caller is.",
      "ठग पुलिस, सीबीआई, कस्टम या आरबीआई के अधिकारी बनकर बात करते हैं। वे कहते हैं कि आपके नाम का कोई पार्सल, सिम या बैंक खाता किसी अपराध से जुड़ा है, आपको वीडियो कॉल पर रोके रखते हैं, परिवार को बताने से मना करते हैं और “नाम साफ़ करने” या “वेरिफ़िकेशन” के लिए पैसे माँगते हैं। गृह मंत्रालय ने ऐसे नकली “डिजिटल अरेस्ट” के बारे में चेतावनी दी है। वीडियो कॉल पर वर्दी, दफ़्तर जैसा बैकग्राउंड या पहचान पत्र दिखने से यह साबित नहीं होता कि कॉल करने वाला कौन है।",
      "প্রতারকেরা পুলিশ, সিবিআই, কাস্টমস বা আরবিআই-এর অফিসার সেজে কথা বলে। তারা বলে, আপনার নামে কোনো পার্সেল, সিম বা ব্যাংক অ্যাকাউন্ট অপরাধের সঙ্গে জড়িত; আপনাকে ভিডিও কলে আটকে রাখে, পরিবারকে জানাতে নিষেধ করে, আর ‘নাম পরিষ্কার করতে’ বা ‘যাচাইয়ের’ জন্য টাকা চায়। স্বরাষ্ট্র মন্ত্রক এমন ভুয়ো ‘ডিজিটাল অ্যারেস্ট’ নিয়ে সতর্ক করেছে। ভিডিও কলে উর্দি, অফিসের মতো পটভূমি বা পরিচয়পত্র দেখলেই প্রমাণ হয় না যে ফোনের ওপারে কে আছে।",
    ),
    takeaway: t(
      "Hang up, don’t pay, and tell someone you trust. Check through an official number you look up yourself, and report at 1930 or cybercrime.gov.in.",
      "कॉल काटें, पैसे न दें और किसी भरोसेमंद व्यक्ति को बताएँ। खुद खोजे गए आधिकारिक नंबर से जाँचें और 1930 या cybercrime.gov.in पर रिपोर्ट करें।",
      "কল কেটে দিন, টাকা দেবেন না, আর বিশ্বাসের কাউকে জানান। নিজে খুঁজে পাওয়া অফিসিয়াল নম্বরে যাচাই করুন, আর ১৯৩০ বা cybercrime.gov.in-এ রিপোর্ট করুন।",
    ),
    question: t(
      "A video caller in uniform says you are under “digital arrest” and must transfer money for verification. What should you do?",
      "वर्दी पहने वीडियो कॉल करने वाला कहता है कि आप “डिजिटल अरेस्ट” में हैं और वेरिफ़िकेशन के लिए पैसे भेजने होंगे। आप क्या करेंगे?",
      "উর্দি পরা এক ভিডিও কলার বলছে আপনি ‘ডিজিটাল অ্যারেস্টে’ আছেন, যাচাইয়ের জন্য টাকা পাঠাতে হবে। আপনি কী করবেন?",
    ),
    options: [
      t(
        "End the call, tell family, and report at 1930",
        "कॉल खत्म करें, परिवार को बताएँ और 1930 पर रिपोर्ट करें",
        "কল কেটে দিন, পরিবারকে জানান আর ১৯৩০-এ রিপোর্ট করুন",
      ),
      t(
        "Pay quickly to avoid trouble",
        "मुसीबत से बचने के लिए जल्दी पैसे भेज दें",
        "ঝামেলা এড়াতে তাড়াতাড়ি টাকা পাঠিয়ে দিন",
      ),
      t(
        "Stay on the call and keep it secret, as told",
        "जैसा कहा गया है, कॉल पर बने रहें और किसी को न बताएँ",
        "যেমন বলা হয়েছে, কলে থাকুন আর কাউকে বলবেন না",
      ),
    ],
    answer: 0,
    feedback: t(
      "Right. Secrecy and a money demand are the warning signs. Talking to someone you trust breaks the fear the scam depends on.",
      "सही। चुप रहने का दबाव और पैसों की माँग ही चेतावनी के संकेत हैं। किसी भरोसेमंद व्यक्ति से बात करने पर वह डर टूटता है जिस पर यह ठगी टिकी है।",
      "ঠিক। গোপন রাখার চাপ আর টাকার দাবিই সতর্কসংকেত। বিশ্বাসের কারও সঙ্গে কথা বললে সেই ভয় ভেঙে যায়, যার ওপর এই প্রতারণা দাঁড়িয়ে আছে।",
    ),
    sourceIds: ["mha-cyber-impersonation", "cybercrime"],
  },
  {
    id: "kyc-update",
    title: t(
      "Urgent KYC or bill message? Don’t tap the link",
      "KYC या बिल का जल्दबाज़ी वाला संदेश? लिंक न दबाएँ",
      "KYC বা বিলের তাড়াহুড়োর মেসেজ? লিঙ্কে চাপ দেবেন না",
    ),
    subtitle: t(
      "“Your power will be cut tonight” is a pressure tactic.",
      "“आज रात बिजली कट जाएगी” दबाव बनाने का तरीका है।",
      "‘আজ রাতে বিদ্যুৎ কেটে যাবে’—এটা চাপ দেওয়ার কৌশল।",
    ),
    category: spot,
    minutes: 3,
    color: "butter",
    analogy: t(
      "If a stranger at your door said your house keys “expire tonight” and offered to copy them right now, you would not hand them over. A link or app from an unknown sender asking for your details is that stranger.",
      "अगर कोई अजनबी दरवाज़े पर कहे कि आपके घर की चाबी “आज रात एक्सपायर” हो जाएगी और वह अभी उसकी कॉपी बना देगा, तो आप चाबी नहीं देंगे। अनजान भेजने वाले का लिंक या ऐप, जो आपकी जानकारी माँगे, वही अजनबी है।",
      "কোনো অচেনা লোক দরজায় এসে যদি বলে আপনার ঘরের চাবির ‘মেয়াদ আজ রাতে শেষ’, এখনই সে নকল চাবি বানিয়ে দেবে, আপনি চাবি দেবেন না। অচেনা প্রেরকের পাঠানো লিঙ্ক বা অ্যাপ, যা আপনার তথ্য চায়, সে-ই ওই অচেনা লোক।",
    ),
    explanation: t(
      "Scam messages claim your electricity, bank account or SIM will be blocked unless you “update KYC” now. They push you to tap a link, install an app (an APK file) or share an OTP or password. The Department of Telecommunications warned that electricity-KYC messages spread malicious apps that can take control of your phone, and RBI cautions against unsolicited KYC links and account-freeze threats. A genuine update can be done by contacting your bank or provider through its official app, website or branch.",
      "ठगी वाले संदेश कहते हैं कि अभी “KYC अपडेट” नहीं किया तो बिजली, बैंक खाता या सिम बंद हो जाएगा। वे लिंक दबाने, कोई ऐप (APK फ़ाइल) इंस्टॉल करने या OTP या पासवर्ड बताने के लिए दबाव डालते हैं। दूरसंचार विभाग ने चेताया है कि बिजली-KYC संदेशों से ऐसे खतरनाक ऐप फैलाए जाते हैं जो आपके फ़ोन पर कब्ज़ा कर सकते हैं, और आरबीआई बिना माँगे आए KYC लिंक और खाता बंद करने की धमकियों से सावधान करता है। असली अपडेट आप बैंक या कंपनी के आधिकारिक ऐप, वेबसाइट या शाखा से खुद संपर्क करके कर सकते हैं।",
      "প্রতারণার মেসেজে বলা হয়, এখনই ‘KYC আপডেট’ না করলে বিদ্যুৎ, ব্যাংক অ্যাকাউন্ট বা সিম বন্ধ হয়ে যাবে। লিঙ্কে চাপ দিতে, কোনো অ্যাপ (APK ফাইল) ইনস্টল করতে বা OTP বা পাসওয়ার্ড জানাতে চাপ দেওয়া হয়। টেলিযোগাযোগ দপ্তর সতর্ক করেছে যে বিদ্যুৎ-KYC মেসেজের মাধ্যমে এমন ক্ষতিকর অ্যাপ ছড়ানো হয়, যা ফোনের নিয়ন্ত্রণ নিয়ে নিতে পারে; আরবিআই-ও না-চাওয়া KYC লিঙ্ক আর অ্যাকাউন্ট বন্ধের হুমকি নিয়ে সাবধান করে। আসল আপডেট আপনি ব্যাংক বা সংস্থার অফিসিয়াল অ্যাপ, ওয়েবসাইট বা শাখায় নিজে যোগাযোগ করে করতে পারেন।",
    ),
    takeaway: t(
      "Never install an app or share an OTP from a message link. Contact the bank or electricity office yourself, using its official app or number.",
      "संदेश के लिंक से कभी ऐप इंस्टॉल न करें, न OTP बताएँ। बैंक या बिजली दफ़्तर से उनके आधिकारिक ऐप या नंबर पर खुद संपर्क करें।",
      "মেসেজের লিঙ্ক থেকে কখনো অ্যাপ ইনস্টল করবেন না, OTP-ও বলবেন না। ব্যাংক বা বিদ্যুৎ অফিসে তাদের অফিসিয়াল অ্যাপ বা নম্বরে নিজে যোগাযোগ করুন।",
    ),
    question: t(
      "An SMS says your electricity will be cut tonight unless you install an “update app” from a link. What is safest?",
      "SMS आता है कि लिंक से “अपडेट ऐप” इंस्टॉल नहीं किया तो आज रात बिजली कट जाएगी। सबसे सुरक्षित क्या है?",
      "একটি SMS বলছে, লিঙ্ক থেকে ‘আপডেট অ্যাপ’ ইনস্টল না করলে আজ রাতে বিদ্যুৎ কেটে যাবে। সবচেয়ে নিরাপদ কী?",
    ),
    options: [
      t(
        "Install it quickly so the power stays on",
        "बिजली न कटे, इसलिए जल्दी इंस्टॉल कर लें",
        "বিদ্যুৎ যাতে না কাটে, তাই তাড়াতাড়ি ইনস্টল করুন",
      ),
      t(
        "Ignore the link and check with the electricity office’s official number",
        "लिंक छोड़ें और बिजली दफ़्तर के आधिकारिक नंबर से पता करें",
        "লিঙ্ক এড়িয়ে বিদ্যুৎ অফিসের অফিসিয়াল নম্বরে খোঁজ নিন",
      ),
      t(
        "Reply with your consumer number and OTP",
        "अपना कंज़्यूमर नंबर और OTP भेज दें",
        "আপনার কনজিউমার নম্বর আর OTP পাঠিয়ে দিন",
      ),
    ],
    answer: 1,
    feedback: t(
      "Correct. Urgency plus a link or app is the trap. Checking through a contact you found yourself keeps you in control.",
      "सही। जल्दबाज़ी के साथ लिंक या ऐप ही जाल है। खुद ढूँढे गए संपर्क से जाँचने पर नियंत्रण आपके हाथ में रहता है।",
      "ঠিক। তাড়াহুড়োর সঙ্গে লিঙ্ক বা অ্যাপ—এটাই ফাঁদ। নিজে খুঁজে পাওয়া যোগাযোগে যাচাই করলে নিয়ন্ত্রণ আপনার হাতেই থাকে।",
    ),
    sourceIds: ["pib-electricity-kyc", "rbi-kyc"],
  },
  {
    id: "upi-pin",
    title: t(
      "Your UPI PIN sends money. It never receives it.",
      "UPI PIN से पैसे जाते हैं, आते नहीं।",
      "UPI PIN দিলে টাকা যায়, আসে না।",
    ),
    subtitle: t(
      "The QR-code and payment-request trick.",
      "QR कोड और पेमेंट रिक्वेस्ट की चाल।",
      "QR কোড আর পেমেন্ট রিকোয়েস্টের চাল।",
    ),
    category: spot,
    minutes: 2,
    color: "sage",
    analogy: t(
      "Your UPI PIN is like your signature on a cheque. You sign when you pay someone, not when someone pays you. Anyone asking you to “sign” so that you can receive money is asking you to pay.",
      "UPI PIN चेक पर आपके दस्तख़त जैसा है। दस्तख़त तब करते हैं जब आप किसी को पैसे देते हैं, तब नहीं जब कोई आपको देता है। जो “पैसे पाने” के लिए दस्तख़त माँगे, वह असल में आपसे भुगतान करवा रहा है।",
      "UPI PIN চেকে আপনার সইয়ের মতো। আপনি কাউকে টাকা দিলে সই করেন, কেউ আপনাকে দিলে নয়। ‘টাকা পেতে’ যে সই চায়, সে আসলে আপনাকে দিয়ে টাকা পাঠাচ্ছে।",
    ),
    explanation: t(
      "A common trick: someone says you have won a prize, are due a refund, or will be paid for an item you are selling. Then they send a QR code or a request in your UPI app and ask you to enter your PIN to “receive” the money. RBI is clear: entering a PIN or OTP is not required to receive money. Scanning an unknown QR code and entering your PIN approves a payment out of your account.",
      "आम चाल: कोई कहता है कि आपको इनाम, रिफ़ंड या बेची गई चीज़ का भुगतान मिलना है। फिर वह QR कोड या UPI ऐप में रिक्वेस्ट भेजता है और “पैसे पाने” के लिए PIN डालने को कहता है। आरबीआई का संदेश साफ़ है: पैसे पाने के लिए PIN या OTP डालने की ज़रूरत नहीं होती। अनजान QR स्कैन करके PIN डालने का मतलब है अपने खाते से भुगतान को मंज़ूरी देना।",
      "একটা সাধারণ চাল: কেউ বলে আপনি পুরস্কার, রিফান্ড বা বিক্রি করা জিনিসের দাম পাবেন। তারপর একটা QR কোড বা UPI অ্যাপে রিকোয়েস্ট পাঠিয়ে টাকা ‘পেতে’ PIN দিতে বলে। আরবিআই-এর কথা স্পষ্ট: টাকা পেতে PIN বা OTP দিতে হয় না। অচেনা QR স্ক্যান করে PIN দেওয়া মানে নিজের অ্যাকাউন্ট থেকে টাকা পাঠানোয় সম্মতি দেওয়া।",
    ),
    takeaway: t(
      "Receiving money never requires your UPI PIN. Do not scan a stranger’s QR code or approve a payment to “receive” money; read the amount and recipient before authorising.",
      "पैसे पाने के लिए UPI PIN की कभी ज़रूरत नहीं होती। “पैसे पाने” के लिए किसी अनजान का QR कोड स्कैन न करें, न कोई भुगतान मंज़ूर करें; मंज़ूरी देने से पहले रकम और पाने वाले का नाम पढ़ें।",
      "টাকা পেতে কখনো UPI PIN লাগে না। ‘টাকা পেতে’ অচেনা কারও QR কোড স্ক্যান করবেন না, কোনো পেমেন্টে সম্মতিও দেবেন না; সম্মতি দেওয়ার আগে টাকার অঙ্ক আর প্রাপকের নাম পড়ে নিন।",
    ),
    question: t(
      "A buyer for your old phone sends a QR code and says, “Scan and enter your PIN to receive ₹8,000.” What is happening?",
      "आपके पुराने फ़ोन का खरीदार QR कोड भेजकर कहता है, “स्कैन करके PIN डालिए, ₹8,000 मिल जाएँगे।” असल में क्या हो रहा है?",
      "আপনার পুরোনো ফোনের এক ক্রেতা QR কোড পাঠিয়ে বলছে, ‘স্ক্যান করে PIN দিন, ₹৮,০০০ পেয়ে যাবেন।’ আসলে কী হচ্ছে?",
    ),
    options: [
      t(
        "It is a request to pay ₹8,000 from your account",
        "यह आपके खाते से ₹8,000 भेजने की रिक्वेस्ट है",
        "এটা আপনার অ্যাকাউন্ট থেকে ₹৮,০০০ পাঠানোর রিকোয়েস্ট",
      ),
      t(
        "It is the normal way to receive money",
        "पैसे पाने का यही सामान्य तरीका है",
        "টাকা পাওয়ার এটাই স্বাভাবিক উপায়",
      ),
      t(
        "It is safe if the buyer seems polite",
        "खरीदार विनम्र है तो यह सुरक्षित है",
        "ক্রেতা ভদ্র হলে এটা নিরাপদ",
      ),
    ],
    answer: 0,
    feedback: t(
      "Exactly. Receiving money needs no PIN. Ask the buyer to send the money to your UPI ID instead, and check your bank app before handing anything over.",
      "बिल्कुल सही। पैसे पाने के लिए PIN नहीं लगता। खरीदार से कहें कि आपकी UPI ID पर पैसे भेजे, और सामान देने से पहले बैंक ऐप में जाँच लें।",
      "একদম ঠিক। টাকা পেতে PIN লাগে না। ক্রেতাকে বলুন আপনার UPI আইডিতে টাকা পাঠাতে, আর জিনিস দেওয়ার আগে ব্যাংক অ্যাপে মিলিয়ে নিন।",
    ),
    sourceIds: ["rbi-qr-receive"],
  },
  {
    id: "task-jobs",
    title: t(
      "The job that pays you, then makes you pay",
      "वह नौकरी जो पहले पैसे देती है, फिर पैसे माँगती है",
      "যে কাজ আগে টাকা দেয়, পরে টাকা চায়",
    ),
    subtitle: t(
      "How small “task” payments build trust before a big deposit.",
      "छोटे “टास्क” भुगतान से भरोसा बनाकर बड़ी रकम कैसे ली जाती है।",
      "ছোট ‘টাস্ক’-এর টাকায় বিশ্বাস জমিয়ে কীভাবে বড় অঙ্ক নেওয়া হয়।",
    ),
    category: spot,
    minutes: 3,
    color: "lavender",
    analogy: t(
      "A fisherman throws a little bait before the hook. The first ₹150 you earn for liking videos or writing reviews is the bait; the hook is the “prepaid task” that needs your own money.",
      "मछुआरा काँटे से पहले थोड़ा चारा डालता है। वीडियो लाइक या रिव्यू करने पर मिले पहले ₹150 चारा हैं; काँटा वह “प्रीपेड टास्क” है जिसमें आपके अपने पैसे लगते हैं।",
      "জেলে বঁড়শির আগে একটু টোপ ফেলে। ভিডিও লাইক বা রিভিউ লিখে প্রথম যে ₹১৫০ পান, সেটাই টোপ; বঁড়শি হলো সেই ‘প্রিপেইড টাস্ক’, যেখানে আপনার নিজের টাকা লাগে।",
    ),
    explanation: t(
      "Messages offer easy part-time work from home: like videos, rate hotels or review products. The first few tasks really pay small commissions, which builds trust. Then you are moved to a Telegram or WhatsApp group and offered “prepaid” tasks that need a deposit, with promises of bigger returns. Each deposit grows, and the balance on their website is “frozen” until you pay more. I4C, under the Ministry of Home Affairs, has described exactly this pattern.",
      "संदेश घर बैठे आसान पार्ट-टाइम काम का वादा करते हैं: वीडियो लाइक करना, होटल को रेटिंग देना या प्रोडक्ट का रिव्यू लिखना। शुरुआती टास्क में सच में छोटा कमीशन मिलता है, जिससे भरोसा बनता है। फिर आपको टेलीग्राम या व्हाट्सऐप ग्रुप में जोड़कर “प्रीपेड” टास्क दिए जाते हैं, जिनमें ज़्यादा कमाई के वादे के साथ पैसे जमा करने होते हैं। हर बार रकम बढ़ती है, और उनकी वेबसाइट पर दिख रहा बैलेंस तब तक “फ़्रीज़” रहता है जब तक आप और पैसे न दें। गृह मंत्रालय के I4C ने ठीक यही तरीका बताया है।",
      "মেসেজে বাড়িতে বসে সহজ পার্ট-টাইম কাজের প্রস্তাব আসে: ভিডিও লাইক করা, হোটেলকে রেটিং দেওয়া বা পণ্যের রিভিউ লেখা। প্রথম কয়েকটা কাজে সত্যিই ছোট কমিশন মেলে, তাতে বিশ্বাস তৈরি হয়। তারপর টেলিগ্রাম বা হোয়াটসঅ্যাপ গ্রুপে যোগ করে ‘প্রিপেইড’ টাস্ক দেওয়া হয়, যেখানে বেশি লাভের আশ্বাসে টাকা জমা দিতে হয়। প্রতিবার অঙ্ক বাড়ে, আর ওদের ওয়েবসাইটে দেখানো ব্যালান্স ‘ফ্রিজ’ থাকে, যতক্ষণ না আপনি আরও টাকা দেন। স্বরাষ্ট্র মন্ত্রকের I4C ঠিক এই ধরনটাই বর্ণনা করেছে।",
    ),
    takeaway: t(
      "Being asked to deposit money to unlock tasks, or to withdraw your own earnings, is the turning point of this scam. Stop there.",
      "टास्क खोलने के लिए या अपनी ही कमाई निकालने के लिए पैसे जमा करने को कहा जाए, तो वही इस ठगी का मोड़ है। वहीं रुक जाएँ।",
      "টাস্ক খুলতে বা নিজের রোজগার তুলতে টাকা জমা দিতে বললে, সেটাই এই প্রতারণার মোড়। সেখানেই থামুন।",
    ),
    question: t(
      "After paying you ₹150 for three “like” tasks, the group asks for ₹2,000 for a “prepaid task” with a bigger reward. What is this?",
      "तीन “लाइक” टास्क के ₹150 देने के बाद ग्रुप बड़े इनाम वाले “प्रीपेड टास्क” के लिए ₹2,000 माँगता है। यह क्या है?",
      "তিনটি ‘লাইক’ টাস্কের জন্য ₹১৫০ দেওয়ার পর গ্রুপ বড় পুরস্কারের ‘প্রিপেইড টাস্কের’ জন্য ₹২,০০০ চাইছে। এটা কী?",
    ),
    options: [
      t(
        "Proof the job is real, since they paid before",
        "नौकरी असली होने का सबूत, क्योंकि पहले पैसे मिले थे",
        "চাকরি আসল হওয়ার প্রমাণ, কারণ আগে টাকা দিয়েছে",
      ),
      t(
        "The step where the scam turns to taking your money",
        "वह मोड़ जहाँ ठगी आपके पैसे लेने लगती है",
        "সেই ধাপ, যেখান থেকে প্রতারণা আপনার টাকা নিতে শুরু করে",
      ),
      t("A normal training fee", "सामान्य ट्रेनिंग फ़ीस", "সাধারণ ট্রেনিং ফি"),
    ],
    answer: 1,
    feedback: t(
      "Yes. The small early payments exist to make the deposit feel safe. Report the group at 1930 or cybercrime.gov.in.",
      "हाँ। शुरुआती छोटे भुगतान इसलिए होते हैं ताकि पैसे जमा करना सुरक्षित लगे। ग्रुप की रिपोर्ट 1930 या cybercrime.gov.in पर करें।",
      "হ্যাঁ। শুরুর ছোট টাকাগুলো দেওয়া হয় যাতে টাকা জমা দেওয়াটা নিরাপদ মনে হয়। গ্রুপটির কথা ১৯৩০ বা cybercrime.gov.in-এ জানান।",
    ),
    sourceIds: ["mha-task-jobs", "cybercrime"],
  },
  {
    id: "trading-apps",
    title: t(
      "Profits on a screen are not money in your bank",
      "स्क्रीन पर दिखता मुनाफ़ा बैंक में पैसा नहीं है",
      "স্ক্রিনে দেখা লাভ মানেই ব্যাংকে টাকা নয়",
    ),
    subtitle: t(
      "Stock-tip groups, fake trading apps and the withdrawal “fee”.",
      "स्टॉक टिप ग्रुप, नकली ट्रेडिंग ऐप और निकासी की “फ़ीस”।",
      "স্টক টিপস গ্রুপ, ভুয়ো ট্রেডিং অ্যাপ আর টাকা তোলার ‘ফি’।",
    ),
    category: spot,
    minutes: 3,
    color: "peach",
    analogy: t(
      "A shopkeeper who writes a big number in your passbook with his own pen hasn’t given you anything. A fake app can show any profit it likes, and may even let a small first withdrawal through to win your trust. Being told to pay before you can withdraw is the giveaway.",
      "कोई दुकानदार अपनी कलम से आपकी पासबुक में बड़ी रकम लिख दे, तो आपको कुछ नहीं मिला। नकली ऐप कोई भी मुनाफ़ा दिखा सकता है, और भरोसा जीतने के लिए पहली छोटी निकासी होने भी दे सकता है। पैसे निकालने से पहले भुगतान करने को कहा जाए, तो यही असली पहचान है।",
      "কোনো দোকানদার নিজের কলমে আপনার পাসবইয়ে বড় অঙ্ক লিখে দিলে আপনি কিছুই পাননি। ভুয়ো অ্যাপ যা খুশি লাভ দেখাতে পারে, এমনকি বিশ্বাস জিততে প্রথম ছোট উত্তোলনটা হতেও দিতে পারে। টাকা তোলার আগে টাকা দিতে বললে, সেটাই আসল চিহ্ন।",
    ),
    explanation: t(
      "You are added to a WhatsApp or Telegram “VIP” group full of profit screenshots and praise, sometimes using the name or photo of a well-known investor. Next you are told to install a trading app from a link instead of using a registered broker. The app shows quick gains, so you add more. When you try to withdraw, you are asked to pay a “tax” or “service fee” first. SEBI warns about fake trading apps, stock-market “gurus” and impersonation on social media.",
      "आपको व्हाट्सऐप या टेलीग्राम के “VIP” ग्रुप में जोड़ा जाता है, जहाँ मुनाफ़े के स्क्रीनशॉट और तारीफ़ें भरी होती हैं; कई बार किसी जाने-माने निवेशक का नाम या फ़ोटो इस्तेमाल होता है। फिर किसी रजिस्टर्ड ब्रोकर के बजाय लिंक से ट्रेडिंग ऐप डालने को कहा जाता है। ऐप पर तेज़ मुनाफ़ा दिखता है, तो आप और पैसे लगाते हैं। पैसे निकालने चलें तो पहले “टैक्स” या “सर्विस फ़ीस” माँगी जाती है। सेबी ऐसे नकली ट्रेडिंग ऐप, शेयर बाज़ार के “गुरुओं” और सोशल मीडिया पर नकली पहचान के बारे में चेतावनी देता है।",
      "আপনাকে হোয়াটসঅ্যাপ বা টেলিগ্রামের ‘VIP’ গ্রুপে যোগ করা হয়, যেখানে লাভের স্ক্রিনশট আর প্রশংসায় ভরা; কখনো কোনো নামী বিনিয়োগকারীর নাম বা ছবিও ব্যবহার করা হয়। তারপর নথিভুক্ত ব্রোকারের বদলে লিঙ্ক থেকে একটা ট্রেডিং অ্যাপ ইনস্টল করতে বলা হয়। অ্যাপে দ্রুত লাভ দেখায়, তাই আপনি আরও টাকা দেন। টাকা তুলতে গেলে আগে ‘ট্যাক্স’ বা ‘সার্ভিস ফি’ চাওয়া হয়। সেবি এমন ভুয়ো ট্রেডিং অ্যাপ, শেয়ারবাজারের ‘গুরু’ আর সোশ্যাল মিডিয়ায় ভুয়ো পরিচয় নিয়ে সতর্ক করে।",
    ),
    takeaway: t(
      "Invest only through SEBI-registered intermediaries you can look up yourself, and never install a trading app from a chat link. If you must pay to withdraw, stop and report.",
      "सिर्फ़ उन्हीं सेबी-रजिस्टर्ड मध्यस्थों के ज़रिए निवेश करें जिन्हें आप खुद जाँच सकें, और चैट में आए लिंक से कभी ट्रेडिंग ऐप इंस्टॉल न करें। निकासी के लिए पैसे माँगे जाएँ तो रुकें और रिपोर्ट करें।",
      "শুধু সেই সেবি-নথিভুক্ত মধ্যস্থতাকারীদের মাধ্যমে বিনিয়োগ করুন, যাঁদের আপনি নিজে যাচাই করতে পারেন, আর চ্যাটে আসা লিঙ্ক থেকে কখনো ট্রেডিং অ্যাপ ইনস্টল করবেন না। টাকা তুলতে টাকা চাইলে থামুন আর রিপোর্ট করুন।",
    ),
    question: t(
      "Your trading app shows ₹40,000 profit, but asks for a 20% “service fee” before you can withdraw. What does this suggest?",
      "ट्रेडिंग ऐप ₹40,000 मुनाफ़ा दिखा रहा है, पर निकालने से पहले 20% “सर्विस फ़ीस” माँग रहा है। इसका क्या मतलब हो सकता है?",
      "ট্রেডিং অ্যাপে ₹৪০,০০০ লাভ দেখাচ্ছে, কিন্তু তোলার আগে ২০% ‘সার্ভিস ফি’ চাইছে। এর মানে কী হতে পারে?",
    ),
    options: [
      t(
        "Pay it; the profit is already yours",
        "फ़ीस दे दें; मुनाफ़ा तो आपका ही है",
        "ফি দিয়ে দিন; লাভ তো আপনারই",
      ),
      t(
        "A known fake-app warning sign: stop and check the platform",
        "नकली ऐप का जाना-पहचाना संकेत: रुकें और प्लेटफ़ॉर्म जाँचें",
        "ভুয়ো অ্যাপের পরিচিত লক্ষণ: থামুন আর প্ল্যাটফর্ম যাচাই করুন",
      ),
      t(
        "Invest more to cover the fee",
        "फ़ीस चुकाने के लिए और निवेश करें",
        "ফি মেটাতে আরও বিনিয়োগ করুন",
      ),
    ],
    answer: 1,
    feedback: t(
      "Right. Blocked withdrawals with a fee demand are a warning sign SEBI describes. Check the intermediary on SEBI’s registered list before sending anything.",
      "सही। निकासी रोककर फ़ीस माँगना सेबी का बताया हुआ चेतावनी संकेत है। कुछ भी भेजने से पहले सेबी की रजिस्टर्ड सूची में मध्यस्थ को जाँचें।",
      "ঠিক। টাকা তোলা আটকে ফি চাওয়া সেবির বলা সতর্কসংকেত। কিছু পাঠানোর আগে সেবির নথিভুক্ত তালিকায় মধ্যস্থতাকারীকে যাচাই করুন।",
    ),
    sourceIds: [
      "sebi-fake-apps",
      "sebi-scams",
      "sebi-social-media",
      "sebi-registry",
    ],
  },
  {
    id: "advance-fees",
    title: t(
      "Paying to receive money is a red flag",
      "पैसे पाने के लिए पैसे देना ख़तरे का संकेत है",
      "টাকা পেতে টাকা দেওয়া বিপদের সংকেত",
    ),
    subtitle: t(
      "Parcel “customs”, loan “processing” and prize “tax” fees.",
      "पार्सल की “कस्टम”, लोन की “प्रोसेसिंग” और इनाम का “टैक्स”।",
      "পার্সেলের ‘কাস্টমস’, লোনের ‘প্রসেসিং’ আর পুরস্কারের ‘ট্যাক্স’।",
    ),
    category: spot,
    minutes: 3,
    color: "butter",
    analogy: t(
      "If someone says a gift is waiting for you, but first you must pay for the wrapping, then the delivery, then the “release”, there may be no gift at all, only fees.",
      "अगर कोई कहे कि आपके लिए तोहफ़ा रखा है, पर पहले पैकिंग, फिर डिलीवरी और फिर “रिलीज़” का पैसा देना होगा, तो हो सकता है तोहफ़ा हो ही नहीं, सिर्फ़ फ़ीस हो।",
      "কেউ যদি বলে আপনার জন্য উপহার রাখা আছে, কিন্তু আগে মোড়ক, তারপর ডেলিভারি, তারপর ‘রিলিজের’ টাকা দিতে হবে, তাহলে হয়তো উপহারই নেই, আছে শুধু ফি।",
    ),
    explanation: t(
      "Many scams promise something valuable, such as a loan, a prize, a refund or a parcel held at “customs”, and ask for a small fee first. Once you pay, a new fee appears. RBI warns about fraudsters who use its name to demand processing fees, transfer fees or security deposits, and CBIC warns about fake customs calls that demand payment into private accounts to release parcels. A genuine tax or duty is paid through official channels you can verify, not to a personal account or a UPI ID shared in a chat.",
      "कई ठगियाँ कुछ कीमती चीज़ का वादा करती हैं, जैसे लोन, इनाम, रिफ़ंड या “कस्टम” में रुका पार्सल, और पहले छोटी फ़ीस माँगती हैं। एक बार पैसे दिए तो नई फ़ीस आ जाती है। आरबीआई ऐसे ठगों के बारे में चेताता है जो उसके नाम पर प्रोसेसिंग फ़ीस, ट्रांसफ़र फ़ीस या सिक्योरिटी डिपॉज़िट माँगते हैं, और सीबीआईसी नकली कस्टम कॉल से सावधान करता है जो पार्सल छुड़ाने के लिए निजी खातों में पैसे माँगती हैं। असली टैक्स या शुल्क आधिकारिक माध्यम से दिया जाता है जिसे आप जाँच सकें, चैट में भेजे गए किसी निजी खाते या UPI ID पर नहीं।",
      "অনেক প্রতারণায় মূল্যবান কিছুর লোভ দেখানো হয়, যেমন লোন, পুরস্কার, রিফান্ড বা ‘কাস্টমসে’ আটকে থাকা পার্সেল, আর আগে ছোট একটা ফি চাওয়া হয়। টাকা দিলেই নতুন ফি হাজির হয়। আরবিআই এমন প্রতারকদের নিয়ে সতর্ক করে, যারা তার নাম ব্যবহার করে প্রসেসিং ফি, ট্রান্সফার ফি বা সিকিউরিটি ডিপোজিট চায়; সিবিআইসি-ও ভুয়ো কাস্টমস কল নিয়ে সাবধান করে, যেখানে পার্সেল ছাড়াতে ব্যক্তিগত অ্যাকাউন্টে টাকা চাওয়া হয়। আসল ট্যাক্স বা শুল্ক দেওয়া হয় যাচাই করা যায় এমন অফিসিয়াল মাধ্যমে, চ্যাটে পাঠানো কোনো ব্যক্তিগত অ্যাকাউন্ট বা UPI আইডিতে নয়।",
    ),
    takeaway: t(
      "Before paying any fee to “release” money or a parcel, verify the organisation through its official website or number, and never pay into a personal account.",
      "पैसे या पार्सल “छुड़ाने” के लिए कोई भी फ़ीस देने से पहले संस्था को उसकी आधिकारिक वेबसाइट या नंबर से जाँचें, और किसी निजी खाते में कभी पैसे न भेजें।",
      "টাকা বা পার্সেল ‘ছাড়াতে’ কোনো ফি দেওয়ার আগে সংস্থাকে তার অফিসিয়াল ওয়েবসাইট বা নম্বরে যাচাই করুন, আর কখনো ব্যক্তিগত অ্যাকাউন্টে টাকা পাঠাবেন না।",
    ),
    question: t(
      "A caller says a parcel in your name is held at customs and you must pay ₹4,500 to a UPI ID today. What is the safest step?",
      "फ़ोन करने वाला कहता है कि आपके नाम का पार्सल कस्टम में रुका है और आज ही एक UPI ID पर ₹4,500 भेजने होंगे। सबसे सुरक्षित कदम क्या है?",
      "এক কলার বলছে আপনার নামে একটা পার্সেল কাস্টমসে আটকে আছে, আজই একটা UPI আইডিতে ₹৪,৫০০ পাঠাতে হবে। সবচেয়ে নিরাপদ পদক্ষেপ কী?",
    ),
    options: [
      t(
        "Pay quickly so the parcel isn’t returned",
        "जल्दी पैसे भेजें ताकि पार्सल वापस न जाए",
        "তাড়াতাড়ি টাকা পাঠান, যাতে পার্সেল ফেরত না যায়",
      ),
      t(
        "Hang up and check through official customs or courier contacts you find yourself",
        "कॉल काटें और खुद ढूँढे गए कस्टम या कूरियर के आधिकारिक संपर्क से जाँचें",
        "কল কেটে দিন আর নিজে খুঁজে পাওয়া কাস্টমস বা কুরিয়ারের অফিসিয়াল যোগাযোগে যাচাই করুন",
      ),
      t(
        "Send your Aadhaar so they can check",
        "जाँच के लिए उन्हें अपना आधार भेज दें",
        "যাচাইয়ের জন্য ওদের আধার পাঠিয়ে দিন",
      ),
    ],
    answer: 1,
    feedback: t(
      "Correct. A demand to pay a personal UPI ID under time pressure is the warning sign. Genuine duties can be checked independently.",
      "सही। समय का दबाव डालकर निजी UPI ID पर पैसे माँगना ही चेतावनी है। असली शुल्क स्वतंत्र रूप से जाँचे जा सकते हैं।",
      "ঠিক। সময়ের চাপ দিয়ে ব্যক্তিগত UPI আইডিতে টাকা চাওয়াই সতর্কসংকেত। আসল শুল্ক আলাদাভাবে যাচাই করা যায়।",
    ),
    sourceIds: ["rbi-impersonation-fees", "pib-customs-fraud"],
  },
  {
    id: "online-friend",
    title: t(
      "A new online friend with an investment tip",
      "नया ऑनलाइन दोस्त और निवेश की सलाह",
      "নতুন অনলাইন বন্ধু আর বিনিয়োগের পরামর্শ",
    ),
    subtitle: t(
      "Weeks of friendly chat, then a “special” platform.",
      "हफ़्तों की दोस्ताना बातचीत, फिर एक “ख़ास” प्लेटफ़ॉर्म।",
      "কয়েক সপ্তাহের বন্ধুত্বপূর্ণ আলাপ, তারপর একটা ‘বিশেষ’ প্ল্যাটফর্ম।",
    ),
    category: spot,
    minutes: 3,
    color: "lavender",
    analogy: t(
      "Trust is like a bridge built plank by plank. In this scam the bridge is built patiently for weeks, with good-morning messages, photos and kind words, so that one day your savings walk across it.",
      "भरोसा एक-एक तख़्ता जोड़कर बने पुल जैसा है। इस ठगी में हफ़्तों तक गुड-मॉर्निंग संदेश, फ़ोटो और मीठी बातों से यह पुल धीरज से बनाया जाता है, ताकि एक दिन आपकी बचत उस पर से चली जाए।",
      "বিশ্বাস হলো একটা একটা তক্তা জুড়ে তৈরি সেতুর মতো। এই প্রতারণায় সপ্তাহের পর সপ্তাহ সুপ্রভাত-মেসেজ, ছবি আর মিষ্টি কথায় ধৈর্য ধরে সেতুটা বানানো হয়, যাতে একদিন আপনার সঞ্চয় সেই সেতু পেরিয়ে চলে যায়।",
    ),
    explanation: t(
      "Someone you meet online, often through a “wrong number” message or a social or dating app, becomes a friendly daily contact. Once trust is built, they mention their success with crypto or trading and invite you to a private platform or app. Early “profits” look real, so you invest more, until withdrawals fail. The Directorate of Enforcement describes this as “pig butchering”. Friendship or crypto alone proves nothing; the pattern is trust first, then a private investment request.",
      "ऑनलाइन मिला कोई व्यक्ति, अक्सर “गलत नंबर” वाले संदेश से या किसी सोशल या डेटिंग ऐप पर, रोज़ का दोस्ताना साथी बन जाता है। भरोसा बनने के बाद वह क्रिप्टो या ट्रेडिंग में अपनी कामयाबी बताता है और किसी निजी प्लेटफ़ॉर्म या ऐप पर बुलाता है। शुरुआती “मुनाफ़ा” असली लगता है, तो आप और पैसे लगाते हैं, जब तक निकासी रुक नहीं जाती। प्रवर्तन निदेशालय इसे “पिग बुचरिंग” कहता है। सिर्फ़ दोस्ती या क्रिप्टो का ज़िक्र कुछ साबित नहीं करता; ढर्रा यह है: पहले भरोसा, फिर निजी निवेश की माँग।",
      "অনলাইনে পরিচয় হওয়া কেউ, প্রায়ই ‘ভুল নম্বরের’ মেসেজ থেকে বা কোনো সোশ্যাল বা ডেটিং অ্যাপে, রোজকার বন্ধুত্বপূর্ণ সঙ্গী হয়ে ওঠে। বিশ্বাস জমলে সে ক্রিপ্টো বা ট্রেডিংয়ে নিজের সাফল্যের গল্প বলে আর কোনো ব্যক্তিগত প্ল্যাটফর্ম বা অ্যাপে ডাকে। শুরুর ‘লাভ’ আসল মনে হয়, তাই আপনি আরও টাকা দেন, যতক্ষণ না টাকা তোলা আটকে যায়। এনফোর্সমেন্ট ডিরেক্টরেট একে ‘পিগ বুচারিং’ বলে। শুধু বন্ধুত্ব বা ক্রিপ্টোর কথা কিছুই প্রমাণ করে না; ধরনটা হলো: আগে বিশ্বাস, তারপর ব্যক্তিগত বিনিয়োগের অনুরোধ।",
    ),
    takeaway: t(
      "Keep friendship and investing separate. Never invest on a platform suggested by someone you know only online; check it yourself first.",
      "दोस्ती और निवेश को अलग रखें। सिर्फ़ ऑनलाइन जाने गए व्यक्ति के बताए प्लेटफ़ॉर्म पर कभी निवेश न करें; पहले खुद जाँचें।",
      "বন্ধুত্ব আর বিনিয়োগ আলাদা রাখুন। শুধু অনলাইনে চেনা কারও বলা প্ল্যাটফর্মে কখনো বিনিয়োগ করবেন না; আগে নিজে যাচাই করুন।",
    ),
    question: t(
      "A friend you met online two months ago urges you to join the crypto platform where they “doubled” their money. What is wise?",
      "दो महीने पहले ऑनलाइन मिला एक दोस्त ज़ोर देता है कि आप उस क्रिप्टो प्लेटफ़ॉर्म से जुड़ें जहाँ उसके पैसे “दोगुने” हो गए। समझदारी क्या है?",
      "দুই মাস আগে অনলাইনে পরিচয় হওয়া এক বন্ধু জোর দিচ্ছে সেই ক্রিপ্টো প্ল্যাটফর্মে যোগ দিতে, যেখানে তার টাকা নাকি ‘দ্বিগুণ’ হয়েছে। বুদ্ধিমানের কাজ কী?",
    ),
    options: [
      t(
        "Invest a small amount to test it",
        "आज़माने के लिए थोड़े पैसे लगा दें",
        "পরখ করতে অল্প টাকা দিন",
      ),
      t(
        "Decline, and verify any platform independently before considering it",
        "मना करें, और किसी भी प्लेटफ़ॉर्म पर सोचने से पहले खुद जाँचें",
        "না বলুন, আর কোনো প্ল্যাটফর্মের কথা ভাবার আগে নিজে যাচাই করুন",
      ),
      t(
        "Trust them; they have been kind for weeks",
        "भरोसा करें; वे हफ़्तों से अच्छे से बात कर रहे हैं",
        "বিশ্বাস করুন; তারা কয়েক সপ্তাহ ধরে ভালো ব্যবহার করছে",
      ),
    ],
    answer: 1,
    feedback: t(
      "Right. A small “test” deposit is how early profits are shown to pull in more. Weeks of kindness are part of the method, not proof.",
      "सही। छोटी “टेस्ट” रकम पर ही शुरुआती मुनाफ़ा दिखाकर और पैसे खींचे जाते हैं। हफ़्तों की मीठी बातें तरीके का हिस्सा हैं, सबूत नहीं।",
      "ঠিক। ছোট ‘পরীক্ষার’ টাকাতেই শুরুর লাভ দেখিয়ে আরও টাকা টানা হয়। সপ্তাহের পর সপ্তাহের মিষ্টি ব্যবহার কৌশলেরই অংশ, প্রমাণ নয়।",
    ),
    sourceIds: ["ed-relationship-investment"],
  },
  {
    id: "after-fraud",
    title: t(
      "Lost money to a scam? Report it quickly",
      "ठगी में पैसे गए? जल्दी रिपोर्ट करें",
      "প্রতারণায় টাকা গেছে? দ্রুত রিপোর্ট করুন",
    ),
    subtitle: t(
      "Who to call first, and the “recovery” trap to avoid.",
      "सबसे पहले किसे कॉल करें, और “रिकवरी” के जाल से कैसे बचें।",
      "প্রথমে কাকে ফোন করবেন, আর ‘রিকভারি’-র ফাঁদ কীভাবে এড়াবেন।",
    ),
    category: t("IF IT HAPPENS", "अगर ऐसा हो जाए", "এমন হলে"),
    minutes: 2,
    color: "sage",
    analogy: t(
      "When a pipe bursts, you shut the main valve first and then call the plumber. After a fraud, reporting quickly is that valve: the sooner your bank and the police know, the sooner they can act.",
      "पाइप फटे तो पहले मेन वाल्व बंद करते हैं, फिर प्लंबर बुलाते हैं। ठगी के बाद जल्दी रिपोर्ट करना वही वाल्व है: बैंक और पुलिस को जितनी जल्दी पता चलेगा, वे उतनी जल्दी कदम उठा सकेंगे।",
      "পাইপ ফাটলে আগে মেন ভালভ বন্ধ করা হয়, তারপর মিস্ত্রি ডাকা হয়। প্রতারণার পরে দ্রুত রিপোর্ট করাই সেই ভালভ: ব্যাংক আর পুলিশ যত তাড়াতাড়ি জানবে, তত তাড়াতাড়ি ব্যবস্থা নিতে পারবে।",
    ),
    explanation: t(
      "Call 1930, the national helpline for financial cyber fraud, and report at cybercrime.gov.in. Call your bank on the number in its official app, website or on your card to block cards, UPI or net banking. Keep screenshots, transaction IDs and phone numbers. Stay alert afterwards: unsolicited agents who promise to recover your money or guarantee a refund, for a fee, may be running a second scam. Reporting to 1930 and the portal is free. Reporting does not guarantee recovery, but it is the right first step.",
      "वित्तीय साइबर ठगी की राष्ट्रीय हेल्पलाइन 1930 पर कॉल करें और cybercrime.gov.in पर रिपोर्ट करें। बैंक के आधिकारिक ऐप, वेबसाइट या कार्ड पर लिखे नंबर से बैंक को कॉल करके कार्ड, UPI या नेट बैंकिंग बंद करवाएँ। स्क्रीनशॉट, ट्रांज़ैक्शन ID और फ़ोन नंबर सँभालकर रखें। बाद में भी सावधान रहें: बिना माँगे संपर्क करने वाले जो एजेंट फ़ीस लेकर पैसे वापस दिलाने या पक्के रिफ़ंड का वादा करें, वे दूसरी ठगी कर रहे हो सकते हैं। 1930 और पोर्टल पर रिपोर्ट करना मुफ़्त है। रिपोर्ट करने से पैसे वापस मिलने की गारंटी नहीं होती, पर यही सही पहला कदम है।",
      "আর্থিক সাইবার প্রতারণার জাতীয় হেল্পলাইন ১৯৩০-এ ফোন করুন আর cybercrime.gov.in-এ রিপোর্ট করুন। ব্যাংকের অফিসিয়াল অ্যাপ, ওয়েবসাইট বা কার্ডে লেখা নম্বরে ফোন করে কার্ড, UPI বা নেট ব্যাংকিং বন্ধ করান। স্ক্রিনশট, ট্রানজ্যাকশন আইডি আর ফোন নম্বর সাবধানে রাখুন। পরেও সতর্ক থাকুন: না-ডাকা যে এজেন্টরা ফি নিয়ে টাকা ফেরত বা নিশ্চিত রিফান্ডের প্রতিশ্রুতি দেয়, তারা দ্বিতীয় প্রতারণা করতে পারে। ১৯৩০ আর পোর্টালে রিপোর্ট করা বিনামূল্যে। রিপোর্ট করলেই টাকা ফেরতের নিশ্চয়তা নেই, কিন্তু এটাই সঠিক প্রথম পদক্ষেপ।",
    ),
    takeaway: t(
      "1930 · cybercrime.gov.in · your bank’s official helpline. Keep the evidence, and do not pay unsolicited agents who promise recovery or a guaranteed refund.",
      "1930 · cybercrime.gov.in · आपके बैंक की आधिकारिक हेल्पलाइन। सबूत सँभालें, और रिकवरी या पक्के रिफ़ंड का वादा करने वाले बिन बुलाए एजेंटों को भुगतान न करें।",
      "১৯৩০ · cybercrime.gov.in · আপনার ব্যাংকের অফিসিয়াল হেল্পলাইন। প্রমাণ রাখুন, আর টাকা ফেরত বা নিশ্চিত রিফান্ডের প্রতিশ্রুতি দেওয়া না-ডাকা এজেন্টদের টাকা দেবেন না।",
    ),
    question: t(
      "You have just paid a scammer by UPI. What should you do first?",
      "आपने अभी-अभी UPI से किसी ठग को भुगतान कर दिया। सबसे पहले क्या करें?",
      "আপনি এইমাত্র UPI-তে এক প্রতারককে টাকা পাঠিয়ে ফেলেছেন। প্রথমে কী করবেন?",
    ),
    options: [
      t(
        "Wait a few days to see if they return it",
        "कुछ दिन रुकें, शायद वे लौटा दें",
        "কয়েক দিন অপেক্ষা করুন, হয়তো ফেরত দেবে",
      ),
      t(
        "Call 1930 and your bank’s official helpline right away",
        "तुरंत 1930 और बैंक की आधिकारिक हेल्पलाइन पर कॉल करें",
        "এখনই ১৯৩০ আর ব্যাংকের অফিসিয়াল হেল্পলাইনে ফোন করুন",
      ),
      t(
        "Pay a “recovery agent” who contacts you online",
        "ऑनलाइन संपर्क करने वाले “रिकवरी एजेंट” को पैसे दें",
        "অনলাইনে যোগাযোগ করা ‘রিকভারি এজেন্ট’-কে টাকা দিন",
      ),
    ],
    answer: 1,
    feedback: t(
      "Yes. Report quickly through official channels. Reporting does not guarantee recovery, and unsolicited agents who promise recovery for a fee deserve suspicion.",
      "हाँ। आधिकारिक माध्यमों से जल्दी रिपोर्ट करें। रिपोर्ट से वापसी की गारंटी नहीं होती, और फ़ीस लेकर रिकवरी का वादा करने वाले बिन बुलाए एजेंटों पर शक करें।",
      "হ্যাঁ। অফিসিয়াল মাধ্যমে দ্রুত রিপোর্ট করুন। রিপোর্ট করলেই ফেরতের নিশ্চয়তা নেই, আর ফি নিয়ে রিকভারির প্রতিশ্রুতি দেওয়া না-ডাকা এজেন্টদের সন্দেহ করুন।",
    ),
    sourceIds: ["cybercrime", "mha-cyber-impersonation"],
  },
];
