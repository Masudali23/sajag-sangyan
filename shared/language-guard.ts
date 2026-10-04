// Display protection only. This never changes the text used by the checker or
// treats swearing as evidence of fraud. Offsets map back to the original text,
// so scripts, combining marks and personal-data placeholders remain intact.
const offensive =
  /(?<![\p{L}\p{M}\p{N}])(?:fuck(?:ing|ed|er|ers)?|motherfuck(?:er|ers|ing)?|shit(?:ty|head)?|bullshit|bitch(?:es)?|bastard(?:s)?|asshole(?:s)?|cunt(?:s)?|dickhead(?:s)?|chutiya|chutiye|chutiye?y?|madarchod|bhenchod|behenchod|bhosdike|harami|gandu|haramzada|saale|saala|चूतिया|चुतिया|चूतिये|मादरचोद|बहनचोद|भोसड़ीके|हरामी|गांडू|साले|साला|कमीने|हरामज़ादा|हरामजादा|বোকাচোদা|বোকাচোদা(?:র)?|চোদনা|শুয়োরের\s+বাচ্চা|শুয়োরের\s+বাচ্চা|হারামি|হারামজাদা|শালা|শালে|মাদারচোদ|bokachoda|bokachodar|madarchod)(?![\p{L}\p{M}\p{N}])/gu;

export function maskOffensiveLanguage(text: string): {
  text: string;
  hasMaskedWords: boolean;
} {
  const characters = [...text];
  const ranges: { start: number; end: number }[] = [];
  // Match both normal word boundaries and the shadow used for inserted-symbol
  // evasion. Joining punctuation alone would miss "word,next" or "word-off".
  for (const joinSeparators of [false, true]) {
    let normalized = "";
    const offsets: { start: number; end: number }[] = [];
    let offset = 0;
    for (const [index, char] of characters.entries()) {
      const start = offset;
      offset += char.length;
      const insertedSeparator =
        joinSeparators &&
        /[\p{S}\p{P}]/u.test(char) &&
        /[\p{L}\p{M}]/u.test(characters[index - 1] ?? "") &&
        /[\p{L}\p{M}]/u.test(characters[index + 1] ?? "");
      if (insertedSeparator) continue;
      const normalizedChar = char
        .normalize("NFKC")
        .toLowerCase()
        .replace(/\p{Cf}/gu, "");
      normalized += normalizedChar;
      for (let i = 0; i < normalizedChar.length; i++)
        offsets.push({ start, end: offset });
    }
    for (const match of normalized.matchAll(offensive))
      ranges.push({
        start: offsets[match.index]!.start,
        end: offsets[match.index + match[0].length - 1]!.end,
      });
  }
  const merged: { start: number; end: number }[] = [];
  for (const range of ranges.sort(
    (a, b) => a.start - b.start || a.end - b.end,
  )) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end)
      previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  let masked = text;
  for (const range of merged.reverse())
    masked = masked.slice(0, range.start) + "••••" + masked.slice(range.end);
  return { text: masked, hasMaskedWords: ranges.length > 0 };
}
