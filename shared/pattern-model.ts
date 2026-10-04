// On-device pattern model: a hashed character/word n-gram logistic regression trained on the
// project's synthetic development fixtures (scripts/pattern-model-train.py). It runs offline next
// to the rules, can add only a "potential" warning (never Strong) and never establishes safety.
// Features must match the Python trainer exactly; tests/pattern-model.test.ts checks parity.
import model from "../data/pattern-model.v1.json" with { type: "json" };
import { addAiFindings, analyzeClaim } from "./engine.ts";
import type { ClaimAnalysis, Finding, Language } from "./types.ts";

export const PATTERN_FINDING_ID = "pattern-match";
const SPECIAL = new Set(["$", "%", "@", "₹"]);
const DIGIT = /\p{Nd}/u;
const WORD = /[\p{L}\p{M}\p{N}]/u;
const encoder = new TextEncoder();

// Approximate Devanagari/Bengali -> Latin "sound key" tables (same order as the trainer).
const DEV_CONS = new Map(
  Object.entries({
    क: "k",
    ख: "kh",
    ग: "g",
    घ: "gh",
    ङ: "n",
    च: "ch",
    छ: "chh",
    ज: "j",
    झ: "jh",
    ञ: "n",
    ट: "t",
    ठ: "th",
    ड: "d",
    ढ: "dh",
    ण: "n",
    त: "t",
    थ: "th",
    द: "d",
    ध: "dh",
    न: "n",
    प: "p",
    फ: "ph",
    ब: "b",
    भ: "bh",
    म: "m",
    य: "y",
    र: "r",
    ल: "l",
    व: "v",
    श: "sh",
    ष: "sh",
    स: "s",
    ह: "h",
  }),
);
const DEV_VOW = new Map(
  Object.entries({
    अ: "a",
    आ: "aa",
    इ: "i",
    ई: "ii",
    उ: "u",
    ऊ: "uu",
    ऋ: "ri",
    ए: "e",
    ऐ: "ai",
    ओ: "o",
    औ: "au",
  }),
);
const DEV_MATRA = new Map(
  Object.entries({
    "ा": "aa",
    "ि": "i",
    "ी": "ii",
    "ु": "u",
    "ू": "uu",
    "ृ": "ri",
    "े": "e",
    "ै": "ai",
    "ो": "o",
    "ौ": "au",
  }),
);
const BN_CONS = new Map(
  Object.entries({
    ক: "k",
    খ: "kh",
    গ: "g",
    ঘ: "gh",
    ঙ: "ng",
    চ: "ch",
    ছ: "chh",
    জ: "j",
    ঝ: "jh",
    ঞ: "n",
    ট: "t",
    ঠ: "th",
    ড: "d",
    ঢ: "dh",
    ণ: "n",
    ত: "t",
    থ: "th",
    দ: "d",
    ধ: "dh",
    ন: "n",
    প: "p",
    ফ: "ph",
    ব: "b",
    ভ: "bh",
    ম: "m",
    য: "j",
    র: "r",
    ল: "l",
    শ: "sh",
    ষ: "sh",
    স: "s",
    হ: "h",
  }),
);
// Two-character keys never match one code point after NFC; kept for exact trainer parity.
const BN_EXTRA = new Map(
  Object.entries({ ড়: "r", ঢ়: "rh", য়: "y", ৎ: "t" }),
);
const BN_VOW = new Map(
  Object.entries({
    অ: "o",
    আ: "a",
    ই: "i",
    ঈ: "i",
    উ: "u",
    ঊ: "u",
    ঋ: "ri",
    এ: "e",
    ঐ: "oi",
    ও: "o",
    ঔ: "ou",
  }),
);
const BN_MATRA = new Map(
  Object.entries({
    "া": "a",
    "ি": "i",
    "ী": "i",
    "ু": "u",
    "ূ": "u",
    "ৃ": "ri",
    "ে": "e",
    "ৈ": "oi",
    "ো": "o",
    "ৌ": "ou",
  }),
);
const SIGNS = new Map(
  Object.entries({
    "ं": "n",
    "ँ": "n",
    "ः": "h",
    "্": "",
    "्": "",
    "़": "",
    "ং": "ng",
    "ঁ": "n",
    "ঃ": "h",
    "়": "",
  }),
);
const FOLDS: [string, string][] = [
  ["chh", "c"],
  ["ch", "c"],
  ["sh", "s"],
  ["ph", "f"],
  ["bh", "b"],
  ["kh", "k"],
  ["gh", "g"],
  ["jh", "j"],
  ["th", "t"],
  ["dh", "d"],
  ["w", "v"],
  ["z", "j"],
  ["q", "k"],
  ["x", "ks"],
  ["y", "i"],
  ["o", "a"],
  ["ee", "i"],
  ["oo", "u"],
  ["aa", "a"],
  ["ii", "i"],
  ["uu", "u"],
];

const weights = new Map<number, number>();
{
  let index = 0;
  model.indexDeltas.forEach((delta, i) => {
    index += delta;
    weights.set(index, model.weights[i] / model.scale);
  });
}

function fnv1a(text: string) {
  let hash = 0x811c9dc5;
  for (const byte of encoder.encode(text)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function patternTokens(text: string) {
  const out: string[] = [];
  let current = "";
  for (const ch of text.normalize("NFC").toLowerCase()) {
    if (DIGIT.test(ch)) current += "0";
    else if (WORD.test(ch)) current += ch;
    else {
      if (current) out.push(current);
      current = "";
      if (SPECIAL.has(ch)) out.push(ch);
    }
  }
  if (current) out.push(current);
  return out;
}

function transliterate(word: string) {
  const chars = Array.from(word);
  let out = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const consonant = DEV_CONS.get(ch) ?? BN_CONS.get(ch) ?? BN_EXTRA.get(ch);
    if (consonant !== undefined) {
      out += consonant;
      let next = chars[i + 1] ?? "";
      if (next === "़") {
        i++;
        next = chars[i + 1] ?? "";
      }
      // Inherent vowel unless a vowel sign or virama follows (folded below).
      if (!(
        DEV_MATRA.has(next) ||
        BN_MATRA.has(next) ||
        next === "्" ||
        next === "্"
      ))
        out += "a";
    } else
      out +=
        DEV_VOW.get(ch) ??
        BN_VOW.get(ch) ??
        DEV_MATRA.get(ch) ??
        BN_MATRA.get(ch) ??
        SIGNS.get(ch) ??
        ch;
  }
  return out;
}

export function soundKey(word: string) {
  let folded = transliterate(word);
  for (const [from, to] of FOLDS) folded = folded.split(from).join(to);
  let deduped = "";
  let last = "";
  for (const ch of folded) {
    if (ch !== last) deduped += ch;
    last = ch;
  }
  const points = Array.from(deduped);
  return points.length > 3 && points[points.length - 1] === "a"
    ? points.slice(0, -1).join("")
    : deduped;
}

function features(text: string) {
  const tokens = patternTokens(text);
  const keys = tokens.map(soundKey);
  const counts = new Map<number, number>();
  const add = (feature: string) => {
    const index = fnv1a(feature) % model.buckets;
    counts.set(index, (counts.get(index) ?? 0) + 1);
  };
  tokens.forEach((token, i) => {
    add(`w|${token}`);
    if (i + 1 < tokens.length) add(`b|${token}|${tokens[i + 1]}`);
    const padded = Array.from(` ${token} `);
    for (let n = 2; n <= 5 && n <= padded.length; n++)
      for (let start = 0; start + n <= padded.length; start++)
        add(`c|${padded.slice(start, start + n).join("")}`);
  });
  keys.forEach((key, i) => {
    add(`k|${key}`);
    if (i + 1 < keys.length) add(`kb|${key}|${keys[i + 1]}`);
    const padded = Array.from(` ${key} `);
    for (const n of [3, 4])
      for (let start = 0; start + n <= padded.length; start++)
        add(`s|${padded.slice(start, start + n).join("")}`);
  });
  return counts;
}

/** Probability-like score in [0, 1]; a similarity to reviewed examples, not a fraud verdict. */
export function patternScore(text: string) {
  const values = new Map<number, number>();
  let squares = 0;
  for (const [index, count] of features(text)) {
    const value = 1 + Math.log(count);
    values.set(index, value);
    squares += value * value;
  }
  const norm = Math.sqrt(squares) || 1;
  let total = 0;
  for (const [index, value] of values) {
    const weight = weights.get(index);
    if (weight !== undefined) total += weight * (value / norm);
  }
  return 1 / (1 + Math.exp(-(model.bias + total)));
}

export const PATTERN_THRESHOLD = model.threshold;

// The model also scores topics (refunds, dividends, credits), so it may warn only when the
// message asks the reader to act. Genuine credit/status notices ask nothing and stay unflagged.
// Chosen on development and private validation data before sealed scoring.
const READER_ASK =
  /\b(pay|send|transfer|deposit|share|tell us|enter|scan|click|tap|install|download|call|contact|join|invest|register|verify|update|reply|buy|bhejo|bhej do|bhejiye|jama karo|jama karein|jama kar do|pay karo|daalo|daal do|batao|scan karo|click karo|download karo|install karo|call karo|join karo|lagao|jodo|invest karo|pathan|pathao|jama din|jama koro|janan|phone korun|join koro|jog korun|invest korun)\b|भेजें|भेजो|भेज दो|जमा करें|जमा करो|जमा कर दो|भुगतान करें|शेयर करें|बताएं|बताइए|बताओ|डालें|डालो|स्कैन|क्लिक|डाउनलोड|इंस्टॉल|संपर्क करें|कॉल करें|जुड़िए|जुड़ें|जोड़िए|खरीद लो|लगाइए|निवेश करें|दर्ज करें|পাঠান|পাঠাও|জমা দিন|জমা করো|জমা করুন|পেমেন্ট করুন|জানান|স্ক্যান|ক্লিক|ডাউনলোড|ইনস্টল|ফোন করুন|যোগ দিন|যুক্ত করুন|কিনে রাখুন|বিনিয়োগ করুন/iu;
export function asksReaderToAct(input: string) {
  return READER_ASK.test(input);
}

// The sentence that looks most like the reviewed scam examples, as an exact input excerpt.
function strongestSentence(input: string) {
  const sentences = input
    .split(/(?<=[.!?।\n])\s+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 6 && input.includes(part));
  let best = input.trim();
  let bestScore = -1;
  for (const sentence of sentences) {
    const score = patternScore(sentence);
    if (score > bestScore) {
      best = sentence;
      bestScore = score;
    }
  }
  return best.length > 300 ? best.slice(0, 300) : best;
}

const title = {
  en: "Wording resembles scam messages",
  hi: "शब्द धोखाधड़ी वाले संदेशों जैसे हैं",
  bn: "শব্দগুলো প্রতারণার বার্তার মতো",
};
const explanation = {
  en: "An on-device pattern check, trained on reviewed example messages, found wording that often appears in scam messages. This is a statistical similarity, not proof. Verify the sender and any payment or account request through a channel you already know is official.",
  hi: "समीक्षा किए गए उदाहरण संदेशों पर बनी, फ़ोन पर चलने वाली पैटर्न जाँच को ऐसे शब्द मिले जो अक्सर धोखाधड़ी वाले संदेशों में आते हैं। यह केवल सांख्यिकीय समानता है, प्रमाण नहीं। भेजने वाले और किसी भी भुगतान या खाते से जुड़े अनुरोध की जाँच ऐसे माध्यम से करें जिसे आप पहले से आधिकारिक जानते हैं।",
  bn: "পর্যালোচিত উদাহরণ বার্তার ভিত্তিতে তৈরি, ফোনেই চলা প্যাটার্ন যাচাই এমন শব্দ পেয়েছে যা প্রায়ই প্রতারণার বার্তায় থাকে। এটি শুধু পরিসংখ্যানগত মিল, প্রমাণ নয়। প্রেরক এবং টাকা বা অ্যাকাউন্ট সংক্রান্ত যেকোনো অনুরোধ আগে থেকে জানা সরকারি মাধ্যমে যাচাই করুন।",
};

/** A "potential"-tier warning when the model clears its validated threshold and the message
 * asks the reader to act; otherwise null. */
export function patternFinding(input: string): Finding | null {
  if (!asksReaderToAct(input) || patternScore(input) < PATTERN_THRESHOLD)
    return null;
  return {
    id: PATTERN_FINDING_ID,
    severity: "attention",
    title,
    explanation,
    excerpt: strongestSentence(input),
    sourceIds: ["rbi-beaware", "sebi-scams", "cybercrime"],
    origin: "local",
  };
}

/** The on-device check: rules first, then the pattern model only when no rule warning fired. */
export function analyzeMessage(
  text: string,
  language: Language,
): ClaimAnalysis {
  const analysis = analyzeClaim(text, language);
  if (analysis.findings.some((finding) => finding.severity === "attention"))
    return analysis;
  const pattern = patternFinding(analysis.input);
  if (!pattern) return analysis;
  // addAiFindings with no candidates only recomputes status, summary and sources.
  return {
    ...addAiFindings(
      { ...analysis, findings: [...analysis.findings, pattern] },
      [],
    ),
    aiAssisted: analysis.aiAssisted,
  };
}
