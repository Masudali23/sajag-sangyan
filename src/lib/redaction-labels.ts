import type { Language } from "../../shared/types";
// Display-only labels: detection, model grounding and stored evidence retain
// the exact redacted string. Never translate the words supplied by the user.
export function displayRedactions(text: string, language: Language): string {
  if (language !== "bn") return text;
  const labels: Record<string, string> = {
    "secret removed": "গোপন তথ্য মুছে দেওয়া হয়েছে",
    "number removed": "নম্বর মুছে দেওয়া হয়েছে",
    "ID removed": "পরিচয় নম্বর মুছে দেওয়া হয়েছে",
    "email removed": "ইমেল মুছে দেওয়া হয়েছে",
    "phone removed": "ফোন নম্বর মুছে দেওয়া হয়েছে",
  };
  return text.replace(
    /\[(secret removed|number removed|ID removed|email removed|phone removed)\]/g,
    (_, key: string) => `[${labels[key]}]`,
  );
}
