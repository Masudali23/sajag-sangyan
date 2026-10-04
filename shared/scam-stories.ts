import type { Localized, ScamStory } from "./types.ts";
const t = (en: string, hi: string, bn: string): Localized => ({ en, hi, bn });

const report = t(
  "Report at 1930 or cybercrime.gov.in.",
  "1930 या cybercrime.gov.in पर रिपोर्ट करें।",
  "১৯৩০ বা cybercrime.gov.in-এ রিপোর্ট করুন।",
);

// Fictional conversations that show, step by step, how common scams unfold.
// Each reveal stays inside the linked source's scope; nothing here is a real
// sender, number or link.
export const scamStories: ScamStory[] = [
  {
    id: "digital-arrest",
    lessonId: "digital-arrest",
    emoji: "phone",
    title: t(
      "The “digital arrest” call",
      "“डिजिटल अरेस्ट” वाली कॉल",
      "‘ডিজিটাল অ্যারেস্ট’-এর কল",
    ),
    subtitle: t(
      "A threat, a fake officer, secrecy, then money.",
      "धमकी, नकली अफ़सर, चुप्पी, फिर पैसे।",
      "হুমকি, ভুয়ো অফিসার, গোপনীয়তা, তারপর টাকা।",
    ),
    steps: [
      {
        channel: "call",
        speaker: t(
          "Caller claiming to be from TRAI",
          "TRAI से होने का दावा करने वाला कॉलर",
          "TRAI থেকে বলছে দাবি করা কলার",
        ),
        message: t(
          "This is TRAI. Your mobile number is linked to illegal activity and will be disconnected in two hours. Press 9 to speak to the police.",
          "यह TRAI की ओर से कॉल है। आपका मोबाइल नंबर गैरकानूनी गतिविधि से जुड़ा है और दो घंटे में बंद हो जाएगा। पुलिस से बात करने के लिए 9 दबाइए।",
          "আমি TRAI থেকে বলছি। আপনার মোবাইল নম্বর বেআইনি কাজের সঙ্গে জড়িত, দুই ঘণ্টার মধ্যে বন্ধ হয়ে যাবে। পুলিশের সঙ্গে কথা বলতে ৯ টিপুন।",
        ),
        tactic: t(
          "Fake authority + urgency",
          "नकली अधिकार + जल्दबाज़ी",
          "ভুয়ো কর্তৃত্ব + তাড়াহুড়ো",
        ),
        reveal: t(
          "Fraudsters use TRAI’s name to scare you. A disconnection deadline creates panic, so you act before you think.",
          "ठग डराने के लिए TRAI का नाम इस्तेमाल करते हैं। नंबर बंद होने की समय-सीमा घबराहट पैदा करती है, ताकि आप सोचने से पहले कदम उठा लें।",
          "ভয় দেখাতে প্রতারকেরা TRAI-এর নাম ব্যবহার করে। নম্বর বন্ধের সময়সীমা আতঙ্ক তৈরি করে, যাতে ভাবার আগেই আপনি কিছু করে বসেন।",
        ),
        safe: t(
          "Hang up and check with my mobile company’s official helpline",
          "कॉल काटकर अपनी मोबाइल कंपनी की आधिकारिक हेल्पलाइन से पता करूँ",
          "কল কেটে আমার মোবাইল কোম্পানির অফিসিয়াল হেল্পলাইনে খোঁজ নেব",
        ),
        risky: t(
          "Press 9 to sort it out",
          "मामला सुलझाने के लिए 9 दबाऊँ",
          "ব্যাপারটা মেটাতে ৯ টিপব",
        ),
        safeFirst: false,
      },
      {
        channel: "video",
        speaker: t(
          "“Police officer” on a video call",
          "वीडियो कॉल पर “पुलिस अफ़सर”",
          "ভিডিও কলে ‘পুলিশ অফিসার’",
        ),
        message: t(
          "A parcel with illegal items and a copy of your Aadhaar has been seized. A case is filed against you. Stay on camera; you are under digital arrest.",
          "गैरकानूनी सामान और आपके आधार की कॉपी वाला एक पार्सल ज़ब्त हुआ है। आप पर केस दर्ज है। कैमरे के सामने रहिए; आप डिजिटल अरेस्ट में हैं।",
          "বেআইনি জিনিস আর আপনার আধারের কপিসহ একটা পার্সেল আটক হয়েছে। আপনার বিরুদ্ধে মামলা হয়েছে। ক্যামেরার সামনে থাকুন; আপনি ডিজিটাল অ্যারেস্টে আছেন।",
        ),
        tactic: t(
          "Fear + a staged uniform",
          "डर + दिखावटी वर्दी",
          "ভয় + সাজানো উর্দি",
        ),
        reveal: t(
          "A uniform, a logo and a police-station background can all be staged on video. The Ministry of Home Affairs has warned about exactly this: fake officers, invented cases and threats.",
          "वीडियो पर वर्दी, लोगो और थाने जैसा बैकग्राउंड, सब कुछ नकली बनाया जा सकता है। गृह मंत्रालय ने ठीक इसी के बारे में चेताया है: नकली अफ़सर, गढ़े हुए केस और धमकियाँ।",
          "ভিডিওতে উর্দি, লোগো আর থানার মতো পটভূমি—সবই সাজানো যায়। স্বরাষ্ট্র মন্ত্রক ঠিক এটা নিয়েই সতর্ক করেছে: ভুয়ো অফিসার, বানানো মামলা আর হুমকি।",
        ),
        safe: t(
          "End the video call and tell my family",
          "वीडियो कॉल बंद करके परिवार को बताऊँ",
          "ভিডিও কল বন্ধ করে পরিবারকে জানাব",
        ),
        risky: t(
          "Stay on camera and follow the instructions",
          "कैमरे के सामने रहकर निर्देश मानूँ",
          "ক্যামেরার সামনে থেকে নির্দেশ মেনে চলব",
        ),
        safeFirst: true,
      },
      {
        channel: "video",
        speaker: t(
          "“Police officer” on a video call",
          "वीडियो कॉल पर “पुलिस अफ़सर”",
          "ভিডিও কলে ‘পুলিশ অফিসার’",
        ),
        message: t(
          "Do not tell anyone, not even your family. This is a confidential investigation. If you disconnect, officers will come to your house.",
          "किसी को मत बताइए, परिवार को भी नहीं। यह गोपनीय जाँच है। कॉल काटी तो अफ़सर आपके घर आ जाएँगे।",
          "কাউকে বলবেন না, পরিবারকেও না। এটা গোপন তদন্ত। কল কাটলে অফিসাররা আপনার বাড়িতে চলে আসবে।",
        ),
        tactic: t(
          "Isolation and secrecy",
          "अकेला करना और चुप रखना",
          "একা করে দেওয়া আর গোপন রাখা",
        ),
        reveal: t(
          "Secrecy keeps you alone with your fear, so no one can tell you it is a scam. Talking to someone you trust breaks the spell.",
          "चुप्पी आपको डर के साथ अकेला रखती है, ताकि कोई आपको न बता सके कि यह ठगी है। किसी भरोसेमंद व्यक्ति से बात करते ही यह जादू टूट जाता है।",
          "গোপনীয়তা আপনাকে ভয়ের সঙ্গে একা রাখে, যাতে কেউ বলতে না পারে যে এটা প্রতারণা। বিশ্বাসের কারও সঙ্গে কথা বললেই এই মায়া ভেঙে যায়।",
        ),
        safe: t(
          "Call a family member right now",
          "अभी परिवार के किसी सदस्य को फ़ोन करूँ",
          "এখনই পরিবারের কাউকে ফোন করব",
        ),
        risky: t(
          "Keep it secret, as told",
          "जैसा कहा, बात छिपाकर रखूँ",
          "যেমন বলা হয়েছে, গোপন রাখব",
        ),
        safeFirst: false,
      },
      {
        channel: "video",
        speaker: t(
          "“Police officer” on a video call",
          "वीडियो कॉल पर “पुलिस अफ़सर”",
          "ভিডিও কলে ‘পুলিশ অফিসার’",
        ),
        message: t(
          "To prove you are innocent, transfer your savings to this RBI “verification account”. The money will be returned within 24 hours after the checks.",
          "बेगुनाही साबित करने के लिए अपनी बचत इस आरबीआई “वेरिफ़िकेशन खाते” में भेजिए। जाँच के बाद 24 घंटे में पैसे लौटा दिए जाएँगे।",
          "নির্দোষ প্রমাণ করতে আপনার সঞ্চয় এই আরবিআই ‘ভেরিফিকেশন অ্যাকাউন্টে’ পাঠান। যাচাইয়ের পর ২৪ ঘণ্টার মধ্যে টাকা ফেরত দেওয়া হবে।",
        ),
        tactic: t("The money demand", "पैसों की माँग", "টাকার দাবি"),
        reveal: t(
          "This is what the whole call was built for. Demanding money to settle an invented case is the scam itself, whatever name the caller uses.",
          "पूरी कॉल इसी के लिए रची गई थी। गढ़े हुए केस को निपटाने के नाम पर पैसे माँगना ही ठगी है, कॉल करने वाला चाहे कोई भी नाम ले।",
          "পুরো কলটা এর জন্যই সাজানো হয়েছিল। বানানো মামলা মেটানোর নামে টাকা চাওয়াই আসল প্রতারণা, কলার যে নামই ব্যবহার করুক।",
        ),
        safe: t(
          "Refuse, hang up and report at 1930",
          "मना करूँ, कॉल काटूँ और 1930 पर रिपोर्ट करूँ",
          "না বলব, কল কেটে ১৯৩০-এ রিপোর্ট করব",
        ),
        risky: t(
          "Transfer the money to clear my name",
          "नाम साफ़ करने के लिए पैसे भेज दूँ",
          "নাম পরিষ্কার করতে টাকা পাঠিয়ে দেব",
        ),
        safeFirst: true,
      },
    ],
    summary: t(
      "Fake authority, fear, secrecy, then money. If a call follows this path, it is a scam script, not an investigation.",
      "नकली अधिकार, डर, चुप्पी और फिर पैसे। अगर कॉल इसी रास्ते पर चले, तो यह जाँच नहीं, ठगी की स्क्रिप्ट है।",
      "ভুয়ো কর্তৃত্ব, ভয়, গোপনীয়তা, তারপর টাকা। কোনো কল এই পথে চললে সেটা তদন্ত নয়, প্রতারণার ছক।",
    ),
    actions: [
      t(
        "Hang up. You can always call back on an official number you look up yourself.",
        "कॉल काटें। आप खुद खोजे गए आधिकारिक नंबर पर कभी भी वापस कॉल कर सकते हैं।",
        "কল কেটে দিন। নিজে খুঁজে পাওয়া অফিসিয়াল নম্বরে পরে যেকোনো সময় ফোন করতে পারেন।",
      ),
      t(
        "Tell someone you trust, even if the caller forbids it.",
        "किसी भरोसेमंद व्यक्ति को बताएँ, भले ही कॉल करने वाला मना करे।",
        "বিশ্বাসের কাউকে জানান, কলার নিষেধ করলেও।",
      ),
      report,
    ],
    sourceIds: [
      "mha-cyber-impersonation",
      "pib-trai-impersonation",
      "cybercrime",
    ],
  },
  {
    id: "task-job",
    lessonId: "task-jobs",
    emoji: "promo",
    title: t(
      "The part-time “like” job",
      "पार्ट-टाइम “लाइक” वाली नौकरी",
      "পার্ট-টাইম ‘লাইক’-এর কাজ",
    ),
    subtitle: t(
      "Small payouts first, then the deposits.",
      "पहले छोटी कमाई, फिर पैसे जमा करने की माँग।",
      "আগে ছোট রোজগার, তারপর টাকা জমার দাবি।",
    ),
    steps: [
      {
        channel: "chat",
        speaker: t(
          "Unknown recruiter on WhatsApp",
          "व्हाट्सऐप पर अनजान रिक्रूटर",
          "হোয়াটসঅ্যাপে অচেনা রিক্রুটার",
        ),
        message: t(
          "Hi! Earn ₹3,000–₹8,000 a day from home. Just like YouTube videos, 10 minutes a day. Interested?",
          "नमस्ते! घर बैठे रोज़ ₹3,000–₹8,000 कमाइए। बस यूट्यूब वीडियो लाइक करने हैं, दिन में 10 मिनट। दिलचस्पी है?",
          "নমস্কার! বাড়িতে বসে রোজ ₹৩,০০০–₹৮,০০০ আয় করুন। শুধু ইউটিউব ভিডিও লাইক করতে হবে, দিনে ১০ মিনিট। আগ্রহী?",
        ),
        tactic: t(
          "Too-good-to-be-true offer",
          "हक़ीक़त से ज़्यादा अच्छा ऑफ़र",
          "বাস্তবের চেয়ে বেশি ভালো প্রস্তাব",
        ),
        reveal: t(
          "An unsolicited message offering high pay for tiny tasks is the usual opening of a task scam.",
          "बिना माँगे आया संदेश, जो छोटे-से काम के लिए बड़ी कमाई का वादा करे, टास्क ठगी की आम शुरुआत है।",
          "না-চাওয়া মেসেজে সামান্য কাজের জন্য মোটা রোজগারের প্রস্তাব—টাস্ক প্রতারণার এটাই সাধারণ শুরু।",
        ),
        safe: t(
          "Ignore it and block the number",
          "अनदेखा करके नंबर ब्लॉक करूँ",
          "উপেক্ষা করে নম্বরটা ব্লক করব",
        ),
        risky: t(
          "Reply: “Yes, I’m interested”",
          "जवाब दूँ: “हाँ, दिलचस्पी है”",
          "উত্তর দেব: ‘হ্যাঁ, আগ্রহী’",
        ),
        safeFirst: true,
      },
      {
        channel: "chat",
        speaker: t(
          "Unknown recruiter on WhatsApp",
          "व्हाट्सऐप पर अनजान रिक्रूटर",
          "হোয়াটসঅ্যাপে অচেনা রিক্রুটার",
        ),
        message: t(
          "Well done! You liked 3 videos and ₹150 has been sent to your UPI. Ready for more tasks?",
          "शाबाश! आपने 3 वीडियो लाइक किए और ₹150 आपके UPI में भेज दिए गए हैं। और टास्क करेंगे?",
          "দারুণ! আপনি ৩টি ভিডিও লাইক করেছেন, ₹১৫০ আপনার UPI-তে পাঠানো হয়েছে। আরও টাস্ক করবেন?",
        ),
        tactic: t(
          "Bait: a small real payment",
          "चारा: छोटा असली भुगतान",
          "টোপ: ছোট আসল টাকা",
        ),
        reveal: t(
          "Real money really arrives, so the job feels genuine. This small payment is an investment in your trust.",
          "सच में पैसे आते हैं, तो नौकरी असली लगती है। यह छोटा भुगतान आपके भरोसे में किया गया निवेश है।",
          "সত্যিই টাকা আসে, তাই কাজটা আসল মনে হয়। এই ছোট টাকা আসলে আপনার বিশ্বাস কেনার বিনিয়োগ।",
        ),
        safe: t(
          "Stop here: a small payment doesn’t prove the job is real",
          "यहीं रुकूँ: छोटा भुगतान नौकरी असली होने का सबूत नहीं",
          "এখানেই থামব: ছোট টাকা চাকরি আসল হওয়ার প্রমাণ নয়",
        ),
        risky: t(
          "Great, send me more tasks",
          "बढ़िया, और टास्क भेजिए",
          "দারুণ, আরও টাস্ক পাঠান",
        ),
        safeFirst: false,
      },
      {
        channel: "chat",
        speaker: t(
          "Telegram “VIP task” group",
          "टेलीग्राम “VIP टास्क” ग्रुप",
          "টেলিগ্রামের ‘VIP টাস্ক’ গ্রুপ",
        ),
        message: t(
          "Welcome to the VIP group! Prepaid task: deposit ₹1,000 and get ₹1,300 back in 30 minutes.",
          "VIP ग्रुप में स्वागत है! प्रीपेड टास्क: ₹1,000 जमा कीजिए और 30 मिनट में ₹1,300 वापस पाइए।",
          "VIP গ্রুপে স্বাগত! প্রিপেইড টাস্ক: ₹১,০০০ জমা দিন, ৩০ মিনিটে ₹১,৩০০ ফেরত পান।",
        ),
        tactic: t("The first deposit", "पहली जमा राशि", "প্রথম জমার টাকা"),
        reveal: t(
          "Now you are asked to pay in order to earn. This is the turning point that I4C describes in task-based job frauds.",
          "अब आपसे कमाने के लिए पैसे माँगे जा रहे हैं। I4C ने टास्क वाली नौकरी की ठगी में ठीक इसी मोड़ के बारे में बताया है।",
          "এবার আয় করতে আপনাকে টাকা দিতে বলা হচ্ছে। টাস্কভিত্তিক চাকরির প্রতারণায় I4C ঠিক এই মোড়ের কথাই বলেছে।",
        ),
        safe: t(
          "Refuse: paying money to do a job is the warning sign",
          "मना करूँ: काम करने के लिए पैसे देना ही चेतावनी है",
          "না বলব: কাজ করতে টাকা দেওয়াটাই সতর্কসংকেত",
        ),
        risky: t("Deposit ₹1,000", "₹1,000 जमा कर दूँ", "₹১,০০০ জমা দেব"),
        safeFirst: true,
      },
      {
        channel: "app",
        speaker: t("The task website", "टास्क वेबसाइट", "টাস্ক ওয়েবসাইট"),
        message: t(
          "Your balance: ₹24,600. Account frozen due to a task error. Pay ₹15,000 to unlock withdrawals.",
          "आपका बैलेंस: ₹24,600। टास्क में गलती के कारण खाता फ़्रीज़। निकासी खोलने के लिए ₹15,000 भरिए।",
          "আপনার ব্যালান্স: ₹২৪,৬০০। টাস্কে ভুলের কারণে অ্যাকাউন্ট ফ্রিজ। টাকা তোলা চালু করতে ₹১৫,০০০ দিন।",
        ),
        tactic: t(
          "Frozen balance",
          "फ़्रीज़ किया बैलेंस",
          "ফ্রিজ করা ব্যালান্স",
        ),
        reveal: t(
          "The balance is just a number on their website. Each “unlock” payment is usually followed by another.",
          "बैलेंस उनकी वेबसाइट पर लिखा बस एक नंबर है। हर “अनलॉक” भुगतान के बाद अक्सर एक और माँग आती है।",
          "ব্যালান্স ওদের ওয়েবসাইটে লেখা একটা সংখ্যা মাত্র। প্রতিটি ‘আনলক’ পেমেন্টের পর সাধারণত আরেকটা দাবি আসে।",
        ),
        safe: t(
          "Stop paying and report at 1930",
          "पैसे देना बंद करूँ और 1930 पर रिपोर्ट करूँ",
          "টাকা দেওয়া বন্ধ করে ১৯৩০-এ রিপোর্ট করব",
        ),
        risky: t(
          "Pay ₹15,000 to unlock my money",
          "अपने पैसे खुलवाने के लिए ₹15,000 भर दूँ",
          "নিজের টাকা ছাড়াতে ₹১৫,০০০ দিয়ে দেব",
        ),
        safeFirst: false,
      },
    ],
    summary: t(
      "Small payouts to build trust, then deposits, then a frozen balance. A job that asks you to pay is the warning.",
      "भरोसा जीतने के लिए छोटी कमाई, फिर जमा राशि, फिर फ़्रीज़ बैलेंस। जो नौकरी आपसे पैसे माँगे, वही चेतावनी है।",
      "বিশ্বাস জিততে ছোট রোজগার, তারপর জমার টাকা, তারপর ফ্রিজ করা ব্যালান্স। যে কাজ আপনার কাছে টাকা চায়, সেটাই সতর্কসংকেত।",
    ),
    actions: [
      t(
        "Never deposit money to earn, or to withdraw what you earned.",
        "कमाने के लिए या अपनी कमाई निकालने के लिए कभी पैसे जमा न करें।",
        "আয় করতে বা নিজের রোজগার তুলতে কখনো টাকা জমা দেবেন না।",
      ),
      t(
        "Leave the group and block the contact.",
        "ग्रुप छोड़ें और संपर्क ब्लॉक करें।",
        "গ্রুপ ছেড়ে দিন আর যোগাযোগটি ব্লক করুন।",
      ),
      report,
    ],
    sourceIds: ["mha-task-jobs", "cybercrime"],
  },
  {
    id: "trading-app",
    lessonId: "trading-apps",
    emoji: "returns",
    title: t(
      "The VIP stock-tips group",
      "VIP स्टॉक टिप्स ग्रुप",
      "VIP স্টক টিপস গ্রুপ",
    ),
    subtitle: t(
      "Screenshots, a private app, then a fee to withdraw.",
      "स्क्रीनशॉट, एक निजी ऐप, फिर निकासी की फ़ीस।",
      "স্ক্রিনশট, একটা ব্যক্তিগত অ্যাপ, তারপর টাকা তোলার ফি।",
    ),
    steps: [
      {
        channel: "chat",
        speaker: t(
          "“Stock mentor”, group admin",
          "“स्टॉक मेंटर”, ग्रुप एडमिन",
          "‘স্টক মেন্টর’, গ্রুপ অ্যাডমিন",
        ),
        message: t(
          "Welcome to VIP Profit Club 📈 Our members made 300% this month. See the screenshots! Today’s free tip is inside.",
          "VIP प्रॉफ़िट क्लब में स्वागत है 📈 हमारे सदस्यों ने इस महीने 300% कमाया। स्क्रीनशॉट देखिए! आज की मुफ़्त टिप अंदर है।",
          "VIP প্রফিট ক্লাবে স্বাগত 📈 আমাদের সদস্যরা এই মাসে ৩০০% লাভ করেছেন। স্ক্রিনশট দেখুন! আজকের ফ্রি টিপ ভেতরে।",
        ),
        tactic: t(
          "Social proof",
          "दूसरों की कामयाबी का दिखावा",
          "অন্যদের সাফল্যের প্রদর্শনী",
        ),
        reveal: t(
          "Groups are filled with profit screenshots and praise, sometimes using famous investors’ names or photos. SEBI warns about this kind of impersonation and misleading testimonials.",
          "ग्रुप मुनाफ़े के स्क्रीनशॉट और तारीफ़ों से भरे होते हैं, कई बार मशहूर निवेशकों के नाम या फ़ोटो के साथ। सेबी ऐसी नकली पहचान और भ्रामक प्रशंसापत्रों के बारे में चेतावनी देता है।",
          "গ্রুপগুলো লাভের স্ক্রিনশট আর প্রশংসায় ভরা থাকে, কখনো নামী বিনিয়োগকারীদের নাম বা ছবিসহ। সেবি এমন ভুয়ো পরিচয় আর বিভ্রান্তিকর প্রশংসাপত্র নিয়ে সতর্ক করে।",
        ),
        safe: t("Leave the group", "ग्रुप छोड़ दूँ", "গ্রুপ ছেড়ে দেব"),
        risky: t(
          "Stay and follow the tips",
          "ग्रुप में रहकर टिप्स मानूँ",
          "গ্রুপে থেকে টিপস মেনে চলব",
        ),
        safeFirst: false,
      },
      {
        channel: "chat",
        speaker: t(
          "“Stock mentor”, group admin",
          "“स्टॉक मेंटर”, ग्रुप एडमिन",
          "‘স্টক মেন্টর’, গ্রুপ অ্যাডমিন",
        ),
        message: t(
          "For guaranteed 30% monthly returns, use our institutional trading app. Download it from this link. It isn’t on the Play Store.",
          "हर महीने 30% गारंटीड रिटर्न के लिए हमारा इंस्टिट्यूशनल ट्रेडिंग ऐप इस्तेमाल कीजिए। इस लिंक से डाउनलोड करें। यह प्ले स्टोर पर नहीं है।",
          "প্রতি মাসে ৩০% গ্যারান্টিড রিটার্নের জন্য আমাদের ইনস্টিটিউশনাল ট্রেডিং অ্যাপ ব্যবহার করুন। এই লিঙ্ক থেকে ডাউনলোড করুন। এটা প্লে স্টোরে নেই।",
        ),
        tactic: t(
          "Guaranteed returns + an unverified app",
          "गारंटीड रिटर्न + बिना जाँचा ऐप",
          "গ্যারান্টিড রিটার্ন + যাচাইহীন অ্যাপ",
        ),
        reveal: t(
          "Two warning signs at once: a guarantee of high returns, and an app from a link instead of a registered broker. SEBI warns about fake trading apps spread through such links.",
          "एक साथ दो चेतावनी संकेत: ऊँचे रिटर्न की गारंटी, और रजिस्टर्ड ब्रोकर के बजाय लिंक से आया ऐप। सेबी ऐसे लिंक से फैलाए जाने वाले नकली ट्रेडिंग ऐप के बारे में चेताता है।",
          "একসঙ্গে দুটি সতর্কসংকেত: বেশি রিটার্নের গ্যারান্টি, আর নথিভুক্ত ব্রোকারের বদলে লিঙ্ক থেকে আসা অ্যাপ। এমন লিঙ্কে ছড়ানো ভুয়ো ট্রেডিং অ্যাপ নিয়ে সেবি সতর্ক করে।",
        ),
        safe: t(
          "First check the broker on SEBI’s registered list",
          "पहले सेबी की रजिस्टर्ड सूची में ब्रोकर जाँचूँ",
          "আগে সেবির নথিভুক্ত তালিকায় ব্রোকার যাচাই করব",
        ),
        risky: t(
          "Install the app from the link",
          "लिंक से ऐप इंस्टॉल कर लूँ",
          "লিঙ্ক থেকে অ্যাপ ইনস্টল করব",
        ),
        safeFirst: true,
      },
      {
        channel: "app",
        speaker: t("The trading app", "ट्रेडिंग ऐप", "ট্রেডিং অ্যাপ"),
        message: t(
          "Congratulations! Your ₹50,000 is now ₹1,80,000 🎉 Add more to unlock premium IPO allotment.",
          "बधाई! आपके ₹50,000 अब ₹1,80,000 हो गए 🎉 प्रीमियम IPO अलॉटमेंट पाने के लिए और पैसे डालिए।",
          "অভিনন্দন! আপনার ₹৫০,০০০ এখন ₹১,৮০,০০০ 🎉 প্রিমিয়াম IPO অ্যালটমেন্ট পেতে আরও টাকা দিন।",
        ),
        tactic: t(
          "Fake profits on screen",
          "स्क्रीन पर नकली मुनाफ़ा",
          "স্ক্রিনে ভুয়ো লাভ",
        ),
        reveal: t(
          "A fake app can display any number it likes. Profits on a screen are not money in your bank.",
          "नकली ऐप कोई भी नंबर दिखा सकता है। स्क्रीन पर दिखता मुनाफ़ा बैंक में पैसा नहीं है।",
          "ভুয়ো অ্যাপ যা খুশি সংখ্যা দেখাতে পারে। স্ক্রিনে দেখা লাভ মানেই ব্যাংকে টাকা নয়।",
        ),
        safe: t(
          "Add nothing more and verify the platform",
          "और पैसे न डालूँ और प्लेटफ़ॉर्म की जाँच करूँ",
          "আর টাকা দেব না, প্ল্যাটফর্ম যাচাই করব",
        ),
        risky: t(
          "Add ₹1,00,000 more",
          "₹1,00,000 और डाल दूँ",
          "আরও ₹১,০০,০০০ দেব",
        ),
        safeFirst: false,
      },
      {
        channel: "app",
        speaker: t("The trading app", "ट्रेडिंग ऐप", "ট্রেডিং অ্যাপ"),
        message: t(
          "Withdrawal requested. Pay 20% service tax (₹36,000) first to release your profits.",
          "निकासी का अनुरोध मिला। मुनाफ़ा पाने के लिए पहले 20% सर्विस टैक्स (₹36,000) भरिए।",
          "টাকা তোলার অনুরোধ পাওয়া গেছে। লাভ পেতে আগে ২০% সার্ভিস ট্যাক্স (₹৩৬,০০০) দিন।",
        ),
        tactic: t("A fee to withdraw", "निकासी के लिए फ़ीस", "টাকা তুলতে ফি"),
        reveal: t(
          "Blocked withdrawals with a fee demand are a sign SEBI lists for fake trading apps. Paying usually leads to yet another fee.",
          "निकासी रोककर फ़ीस माँगना सेबी के बताए नकली ट्रेडिंग ऐप के संकेतों में है। भुगतान करने पर अक्सर एक और फ़ीस आ जाती है।",
          "টাকা তোলা আটকে ফি চাওয়া ভুয়ো ট্রেডিং অ্যাপের সেই লক্ষণ, যার কথা সেবি বলে। টাকা দিলে সাধারণত আরেকটা ফি হাজির হয়।",
        ),
        safe: t(
          "Refuse to pay and report it",
          "भुगतान से मना करूँ और रिपोर्ट करूँ",
          "টাকা দিতে না বলে রিপোর্ট করব",
        ),
        risky: t(
          "Pay the tax to get my profits",
          "मुनाफ़ा पाने के लिए टैक्स भर दूँ",
          "লাভ পেতে ট্যাক্স দিয়ে দেব",
        ),
        safeFirst: true,
      },
    ],
    summary: t(
      "Social proof, guaranteed returns, a private app, fake profits, then fees. Invest only through registered intermediaries you check yourself.",
      "दूसरों की कामयाबी का दिखावा, गारंटीड रिटर्न, निजी ऐप, नकली मुनाफ़ा और फिर फ़ीस। सिर्फ़ उन रजिस्टर्ड मध्यस्थों से निवेश करें जिन्हें आपने खुद जाँचा हो।",
      "অন্যদের সাফল্যের প্রদর্শনী, গ্যারান্টিড রিটার্ন, ব্যক্তিগত অ্যাপ, ভুয়ো লাভ, তারপর ফি। শুধু নিজে যাচাই করা নথিভুক্ত মধ্যস্থতাকারীর মাধ্যমে বিনিয়োগ করুন।",
    ),
    actions: [
      t(
        "Check registration on SEBI’s official list before investing.",
        "निवेश से पहले सेबी की आधिकारिक सूची में रजिस्ट्रेशन जाँचें।",
        "বিনিয়োগের আগে সেবির অফিসিয়াল তালিকায় নথিভুক্তি যাচাই করুন।",
      ),
      t(
        "Never install a trading app from a chat link.",
        "चैट में आए लिंक से कभी ट्रेडिंग ऐप इंस्टॉल न करें।",
        "চ্যাটে আসা লিঙ্ক থেকে কখনো ট্রেডিং অ্যাপ ইনস্টল করবেন না।",
      ),
      report,
    ],
    sourceIds: [
      "sebi-social-media",
      "sebi-fake-apps",
      "sebi-scams",
      "sebi-registry",
    ],
  },
  {
    id: "upi-qr",
    lessonId: "upi-pin",
    emoji: "lock",
    title: t(
      "The cashback QR code",
      "कैशबैक वाला QR कोड",
      "ক্যাশব্যাকের QR কোড",
    ),
    subtitle: t(
      "“Scan and enter your PIN to receive.”",
      "“पैसे पाने के लिए स्कैन करके PIN डालिए।”",
      "‘টাকা পেতে স্ক্যান করে PIN দিন।’",
    ),
    steps: [
      {
        channel: "call",
        speaker: t(
          "Caller from a “cashback team”",
          "“कैशबैक टीम” से कॉलर",
          "‘ক্যাশব্যাক টিম’ থেকে কলার",
        ),
        message: t(
          "Congratulations! You have won ₹5,000 cashback. A QR code is coming to you on WhatsApp. Scan it to receive the money.",
          "बधाई हो! आपने ₹5,000 कैशबैक जीता है। आपको व्हाट्सऐप पर QR कोड भेजा जा रहा है। पैसे पाने के लिए उसे स्कैन कीजिए।",
          "অভিনন্দন! আপনি ₹৫,০০০ ক্যাশব্যাক জিতেছেন। হোয়াটসঅ্যাপে আপনাকে একটা QR কোড পাঠানো হচ্ছে। টাকা পেতে সেটা স্ক্যান করুন।",
        ),
        tactic: t("A surprise prize", "अचानक इनाम", "হঠাৎ পুরস্কার"),
        reveal: t(
          "An unexpected prize creates excitement, and excitement lowers your guard. Remember: you never need to scan a code to receive money.",
          "अचानक मिला इनाम उत्साह जगाता है, और उत्साह में सावधानी कम हो जाती है। याद रखें: पैसे पाने के लिए कभी स्कैन नहीं करना पड़ता।",
          "হঠাৎ পুরস্কার উত্তেজনা জাগায়, আর উত্তেজনায় সতর্কতা কমে যায়। মনে রাখবেন: টাকা পেতে কখনো স্ক্যান করতে হয় না।",
        ),
        safe: t(
          "Say no: I don’t need to scan anything to receive money",
          "मना करूँ: पैसे पाने के लिए कुछ स्कैन नहीं करना होता",
          "না বলব: টাকা পেতে কিছু স্ক্যান করতে হয় না",
        ),
        risky: t(
          "Okay, send me the QR code",
          "ठीक है, QR कोड भेजिए",
          "ঠিক আছে, QR কোড পাঠান",
        ),
        safeFirst: false,
      },
      {
        channel: "chat",
        speaker: t(
          "The same caller, on WhatsApp",
          "वही कॉलर, व्हाट्सऐप पर",
          "সেই কলার, হোয়াটসঅ্যাপে",
        ),
        message: t(
          "[QR code] Scan this in your UPI app and enter your PIN to receive ₹5,000. Hurry, the offer ends in 10 minutes!",
          "[QR कोड] इसे अपने UPI ऐप में स्कैन करें और ₹5,000 पाने के लिए PIN डालें। जल्दी कीजिए, ऑफ़र 10 मिनट में खत्म!",
          "[QR কোড] এটা আপনার UPI অ্যাপে স্ক্যান করে ₹৫,০০০ পেতে PIN দিন। তাড়াতাড়ি করুন, অফার ১০ মিনিটে শেষ!",
        ),
        tactic: t(
          "PIN request + time pressure",
          "PIN की माँग + समय का दबाव",
          "PIN চাওয়া + সময়ের চাপ",
        ),
        reveal: t(
          "RBI is clear: entering a PIN or OTP is not required to receive money. Entering your PIN here would approve a payment from your account.",
          "आरबीआई साफ़ कहता है: पैसे पाने के लिए PIN या OTP डालने की ज़रूरत नहीं होती। यहाँ PIN डालने का मतलब होगा अपने खाते से भुगतान को मंज़ूरी देना।",
          "আরবিআই স্পষ্ট বলে: টাকা পেতে PIN বা OTP দিতে হয় না। এখানে PIN দিলে আপনার অ্যাকাউন্ট থেকে টাকা পাঠানোয় সম্মতি দেওয়া হবে।",
        ),
        safe: t(
          "Don’t enter my PIN, and block the sender",
          "PIN न डालूँ और भेजने वाले को ब्लॉक करूँ",
          "PIN দেব না, প্রেরককে ব্লক করব",
        ),
        risky: t(
          "Enter my PIN quickly before the offer ends",
          "ऑफ़र खत्म होने से पहले जल्दी PIN डाल दूँ",
          "অফার শেষ হওয়ার আগে তাড়াতাড়ি PIN দিয়ে দেব",
        ),
        safeFirst: true,
      },
      {
        channel: "sms",
        speaker: t(
          "Your bank, then the caller again",
          "आपका बैंक, फिर वही कॉलर",
          "আপনার ব্যাংক, তারপর আবার সেই কলার",
        ),
        message: t(
          "Bank SMS: ₹5,000 debited from your account. Caller: “Sorry, technical error! Scan this second code to get a ₹10,000 refund.”",
          "बैंक का SMS: आपके खाते से ₹5,000 कटे। कॉलर: “माफ़ कीजिए, तकनीकी गड़बड़ी! ₹10,000 रिफ़ंड के लिए यह दूसरा कोड स्कैन कीजिए।”",
          "ব্যাংকের SMS: আপনার অ্যাকাউন্ট থেকে ₹৫,০০০ কাটা হয়েছে। কলার: ‘দুঃখিত, প্রযুক্তিগত গোলমাল! ₹১০,০০০ রিফান্ড পেতে এই দ্বিতীয় কোডটা স্ক্যান করুন।’",
        ),
        tactic: t(
          "The “refund” repeat",
          "“रिफ़ंड” के नाम पर दोबारा",
          "‘রিফান্ডের’ নামে আবার",
        ),
        reveal: t(
          "A “refund” that needs another scan and PIN is the same trick again. A real refund does not need your PIN.",
          "जिस “रिफ़ंड” के लिए फिर से स्कैन और PIN चाहिए, वह वही चाल दोबारा है। असली रिफ़ंड के लिए आपका PIN नहीं चाहिए होता।",
          "যে ‘রিফান্ডের’ জন্য আবার স্ক্যান আর PIN লাগে, সেটা একই চাল আবার। আসল রিফান্ডে আপনার PIN লাগে না।",
        ),
        safe: t(
          "Stop, and call my bank’s official helpline and 1930",
          "रुकूँ, और बैंक की आधिकारिक हेल्पलाइन व 1930 पर कॉल करूँ",
          "থামব, আর ব্যাংকের অফিসিয়াল হেল্পলাইন ও ১৯৩০-এ ফোন করব",
        ),
        risky: t(
          "Scan again to get my refund",
          "रिफ़ंड पाने के लिए दोबारा स्कैन करूँ",
          "রিফান্ড পেতে আবার স্ক্যান করব",
        ),
        safeFirst: false,
      },
    ],
    summary: t(
      "A prize, a QR code, a PIN, then a fake refund. Your UPI PIN sends money; it never receives it.",
      "इनाम, QR कोड, PIN, और फिर नकली रिफ़ंड। UPI PIN से पैसे जाते हैं, आते नहीं।",
      "পুরস্কার, QR কোড, PIN, তারপর ভুয়ো রিফান্ড। UPI PIN দিলে টাকা যায়, আসে না।",
    ),
    actions: [
      t(
        "Never enter your UPI PIN to receive money.",
        "पैसे पाने के लिए कभी UPI PIN न डालें।",
        "টাকা পেতে কখনো UPI PIN দেবেন না।",
      ),
      t(
        "Don’t scan QR codes sent by strangers.",
        "अनजान लोगों के भेजे QR कोड स्कैन न करें।",
        "অচেনা লোকের পাঠানো QR কোড স্ক্যান করবেন না।",
      ),
      t(
        "If money is lost, call 1930 and your bank right away.",
        "पैसे कट जाएँ तो तुरंत 1930 और अपने बैंक को कॉल करें।",
        "টাকা কেটে গেলে এখনই ১৯৩০ আর আপনার ব্যাংকে ফোন করুন।",
      ),
    ],
    sourceIds: ["rbi-qr-receive", "cybercrime"],
  },
];
