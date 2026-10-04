import type { User } from "@supabase/supabase-js";

export const MAX_PROFILE_NAME = 80;
export function cleanProfileName(value: unknown): string {
  return typeof value === "string"
    ? value
        .normalize("NFC")
        .replace(/[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, "")
        .trim()
        .slice(0, MAX_PROFILE_NAME)
        .replace(/[\uD800-\uDBFF]$/, "")
    : "";
}
export function profileFor(user: User | null) {
  const name = cleanProfileName(user?.user_metadata?.full_name);
  const email = user?.email || "";
  const words = (name || email.split("@")[0]).split(/\s+/).filter(Boolean);
  const segmenter =
    typeof Intl.Segmenter === "function"
      ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
      : null;
  const initial = (word: string) =>
    segmenter
      ? [...segmenter.segment(word)][0]?.segment || ""
      : [...word][0] || "";
  const initials =
    words.length > 1
      ? initial(words[0]) + initial(words.at(-1)!)
      : initial(words[0] || "S");
  return {
    name,
    email,
    label: name || email,
    initials: initials.toLocaleUpperCase(),
  };
}
export function validEmailCode(value: string): boolean {
  return /^[0-9]{6,10}$/.test(value.trim());
}
