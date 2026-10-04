import { VoiceError } from "./voice";
import type { Localized } from "../../shared/types";

export function voiceFeedback(
  error: unknown,
  kind: "input" | "readout" = "input",
): Localized {
  const code = error instanceof VoiceError ? error.code : "failed";
  const copy: Record<string, Localized> = {
    "permission-denied": {
      en: "Microphone access is blocked. In Android Settings, open Apps → Sajag → Permissions → Microphone and allow access. On the web, use your browser’s site permissions. You can also type or paste.",
      hi: "माइक्रोफोन की अनुमति बंद है। Android की सेटिंग में ऐप्स → Sajag → अनुमतियाँ → माइक्रोफोन खोलकर अनुमति दें। वेबसाइट पर ब्राउज़र की साइट अनुमतियाँ देखें। लिख या पेस्ट भी कर सकते हैं।",
      bn: "মাইক্রোফোনের অনুমতি বন্ধ আছে। Android সেটিংসে Apps → Sajag → Permissions → Microphone খুলে অনুমতি দিন। ওয়েবসাইটে ব্রাউজারের সাইট অনুমতি দেখুন। লিখে বা পেস্ট করেও ব্যবহার করতে পারেন।",
    },
    unavailable: {
      en: "Speech input is not available on this device or browser. Check that a speech recognition service is installed and enabled, or type your message.",
      hi: "इस डिवाइस या ब्राउज़र पर बोलकर लिखना उपलब्ध नहीं है। जाँचें कि आवाज़ पहचानने की सेवा इंस्टॉल और चालू है, या संदेश लिखें।",
      bn: "এই ডিভাইস বা ব্রাউজারে কথা বলে লেখা যাচ্ছে না। ভয়েস শনাক্ত করার পরিষেবা ইনস্টল ও চালু আছে কি না দেখুন, অথবা বার্তা লিখুন।",
    },
    "no-speech": {
      en: "We couldn’t hear clear speech. Try again in a quieter place, or type your message.",
      hi: "आवाज़ साफ़ नहीं सुनाई दी। शांत जगह पर फिर कोशिश करें या संदेश लिखें।",
      bn: "আপনার কথা স্পষ্ট শোনা যায়নি। শান্ত জায়গায় আবার চেষ্টা করুন, অথবা বার্তা লিখুন।",
    },
    "language-unavailable": {
      en: "No usable voice was found for the selected language. Install the selected language’s voice data in your device’s text-to-speech settings, then try again. The full text stays available here.",
      hi: "चुनी हुई भाषा की उपयोग योग्य आवाज़ नहीं मिली। डिवाइस की टेक्स्ट-टू-स्पीच सेटिंग में चुनी हुई भाषा की आवाज़ इंस्टॉल करें, फिर कोशिश करें। पूरा पाठ यहाँ उपलब्ध है।",
      bn: "বাছাই করা ভাষার ব্যবহারযোগ্য ভয়েস পাওয়া যায়নি। ডিভাইসের টেক্সট-টু-স্পিচ সেটিংসে বাংলা ভয়েস ইনস্টল করে আবার চেষ্টা করুন। পুরো লেখাটি এখানেই পড়তে পারবেন।",
    },
    network: {
      en: "The speech service could not connect. Try an installed offline language, or type your message.",
      hi: "आवाज़ की सेवा से संपर्क नहीं हुआ। इंस्टॉल की गई ऑफलाइन भाषा आज़माएँ या संदेश लिखें।",
      bn: "ভয়েস পরিষেবায় সংযোগ করা যায়নি। ইনস্টল করা অফলাইন ভাষা ব্যবহার করুন, অথবা বার্তা লিখুন।",
    },
    busy: {
      en: "Another voice session is running. Stop it, then try again.",
      hi: "आवाज़ का दूसरा सत्र चल रहा है। उसे रोककर फिर कोशिश करें।",
      bn: "আরেকটি ভয়েস সেশন চলছে। সেটি বন্ধ করে আবার চেষ্টা করুন।",
    },
    failed: {
      en: "Voice could not start. Check your device’s speech settings, or use the text here.",
      hi: "आवाज़ की सुविधा शुरू नहीं हुई। डिवाइस की स्पीच सेटिंग जाँचें या यहाँ दिए पाठ का उपयोग करें।",
      bn: "ভয়েস চালু করা যায়নি। ডিভাইসের ভয়েস সেটিংস দেখুন, অথবা এখানকার লেখাটি ব্যবহার করুন।",
    },
  };
  if (kind === "readout" && code === "unavailable")
    return {
      en: "Read-aloud is unavailable on this device or browser. You can read the full text here.",
      hi: "इस डिवाइस या ब्राउज़र पर पढ़कर सुनाना उपलब्ध नहीं है। पूरा पाठ यहाँ पढ़ सकते हैं।",
      bn: "এই ডিভাইস বা ব্রাউজারে পড়ে শোনানো যাচ্ছে না। পুরো লেখাটি এখানেই পড়তে পারবেন।",
    };
  if (kind === "input" && code === "language-unavailable")
    return {
      en: "This speech language is unavailable. Enable the selected language in your device’s speech recognition settings, switch the app language, or type your message.",
      hi: "इस भाषा में आवाज़ पहचानना उपलब्ध नहीं है। डिवाइस की स्पीच सेटिंग में चुनी हुई भाषा चालू करें, ऐप की भाषा बदलें या संदेश लिखें।",
      bn: "এই ভাষায় কথা শনাক্ত করা যাচ্ছে না। ডিভাইসের ভয়েস সেটিংসে বাংলা চালু করুন, অ্যাপের ভাষা বদলান অথবা বার্তা লিখুন।",
    };
  return copy[code] ?? copy.failed;
}
