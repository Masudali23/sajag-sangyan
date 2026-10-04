import type { AiProvider } from "../lib/ai-provider";
import { useApp } from "../lib/preferences";

export function AiDataNotice({ provider }: { provider: AiProvider | null }) {
  const { t } = useApp();
  const cacheNotice = (
    <p data-testid="ai-cache-notice">
      {t(
        "To save the free AI allowance, the server may reuse warning types for an identical masked message for up to 6 hours. This cache stays in memory only and does not keep the message text.",
        "मुफ्त AI की सीमा बचाने के लिए सर्वर निजी जानकारी छिपाए गए एक जैसे संदेश पर पहले मिले चेतावनी प्रकारों का 6 घंटे तक फिर उपयोग कर सकता है। यह कैश केवल अस्थायी मेमोरी में रहता है और संदेश का पाठ नहीं रखता।",
        "বিনামূল্যে AI ব্যবহারের সীমা বাঁচাতে, ব্যক্তিগত তথ্য ঢাকার পর একই বার্তা আবার এলে সার্ভার আগের সতর্কতার ধরনগুলি ৬ ঘণ্টা পর্যন্ত আবার ব্যবহার করতে পারে। এই ক্যাশ শুধু অস্থায়ী মেমোরিতে থাকে; বার্তার লেখা এতে রাখা হয় না।",
      )}
    </p>
  );
  if (!provider)
    return (
      <div className="ai-data-notice">
        <p>
          {t(
            "Online AI is unavailable or its provider could not be confirmed. You can still check on this device.",
            "ऑनलाइन AI उपलब्ध नहीं है या उसके प्रदाता की पुष्टि नहीं हो सकी। आप डिवाइस पर जाँच कर सकते हैं।",
          )}
        </p>
        {cacheNotice}
      </div>
    );
  const name = provider === "gemini" ? "Google Gemini" : "OpenAI";
  return (
    <div className="ai-data-notice">
      <p>
        {t(
          `Only with your permission, masked message text goes to our server and ${name} for possible warning cues. AI may be wrong; it does not verify the message.`,
          `आपकी अनुमति पर ही निजी जानकारी छिपाया हुआ संदेश हमारे सर्वर और ${name} को संभावित चेतावनी संकेत खोजने के लिए जाता है। AI गलत हो सकता है; यह संदेश सत्यापित नहीं करता।`,
          `শুধু আপনি অনুমতি দিলে তবেই ব্যক্তিগত তথ্য ঢেকে দেওয়া বার্তাটি আমাদের সার্ভার ও ${name}-এর কাছে সম্ভাব্য সতর্কতার সংকেত খুঁজতে পাঠানো হয়। AI ভুল করতে পারে; এটি বার্তার সত্যতা যাচাই করে না।`,
        )}
      </p>
      <p>
        {t(
          "For this check, Sajag retrieves relevant passages from its curated official-guidance library and supplies them to AI. Accepted AI cues must cite those passages and quote your masked message. This does not authenticate the sender or establish that a message is safe.",
          "इस जाँच के लिए सजग आधिकारिक मार्गदर्शन के अपने समीक्षित संग्रह से संबंधित अंश खोजकर AI को देता है। स्वीकार किए गए AI संकेतों में उन अंशों का संदर्भ और निजी जानकारी छिपाए गए संदेश के शब्द होने चाहिए। इससे भेजने वाले की पहचान या संदेश का सुरक्षित होना साबित नहीं होता।",
          "এই যাচাইয়ের জন্য সজাগ সরকারি নির্দেশনার পর্যালোচিত সংগ্রহ থেকে প্রাসঙ্গিক অংশ খুঁজে AI-কে দেয়। AI-এর গ্রহণযোগ্য সংকেতে ওই অংশের উল্লেখ ও ব্যক্তিগত তথ্য ঢাকা বার্তার হুবহু শব্দ থাকতে হবে। এতে প্রেরকের পরিচয় বা বার্তা নিরাপদ কি না নিশ্চিত হয় না।",
        )}
      </p>
      <p>
        {provider === "gemini"
          ? t(
              "On Google's unpaid tier, submitted text and responses are used to improve its products and may be read by human reviewers. Remove personal, sensitive and confidential details; masking can miss them.",
              "Google की मुफ्त सेवा में भेजे गए पाठ और जवाब का उपयोग उसके उत्पाद बेहतर बनाने के लिए होता है और मानवीय समीक्षक इन्हें पढ़ सकते हैं। निजी, संवेदनशील और गोपनीय जानकारी हटा दें; जानकारी छिपाने में चूक हो सकती है।",
            )
          : t(
              "OpenAI's data-retention policies apply. Remove personal, sensitive and confidential details; masking can miss them.",
              "OpenAI की डेटा रखने की नीति लागू होती है। निजी, संवेदनशील और गोपनीय जानकारी हटा दें; जानकारी छिपाने में चूक हो सकती है।",
            )}
      </p>
      {cacheNotice}
      <a
        href={
          provider === "gemini"
            ? "https://ai.google.dev/gemini-api/terms#unpaid-services"
            : "https://developers.openai.com/api/docs/guides/your-data"
        }
        target="_blank"
        rel="noopener noreferrer"
      >
        {t(
          `${name} data terms`,
          `${name} की डेटा शर्तें`,
          `${name}-এর তথ্য ব্যবহারের শর্ত`,
        )}
      </a>
    </div>
  );
}
