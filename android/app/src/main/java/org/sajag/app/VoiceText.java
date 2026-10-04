package org.sajag.app;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.MissingResourceException;

/** Pure text handling; no microphone, file, or network access. */
final class VoiceText {
    static final int MAX_READ_LENGTH = 24000;

    private VoiceText() {}

    static boolean supportedLanguage(String language) {
        return "en-IN".equals(language) || "hi-IN".equals(language) || "bn-IN".equals(language);
    }

    static String languageName(String language) {
        if ("bn-IN".equals(language)) return "Bengali";
        if ("hi-IN".equals(language)) return "Hindi";
        if ("en-IN".equals(language)) return "English";
        return "selected language";
    }

    static int voicePreference(Locale requested, Locale candidate, boolean networkRequired, boolean installed) {
        if (!installed || !sameLanguage(requested, candidate)) return -1;
        // A local same-language voice outranks an exact-locale network voice.
        return (networkRequired ? 0 : 2) + (requested.equals(candidate) ? 1 : 0);
    }

    static boolean sameLanguage(Locale requested, Locale candidate) {
        if (requested == null || candidate == null || requested.getLanguage().isEmpty()
            || candidate.getLanguage().isEmpty()) return false;
        if (requested.getLanguage().equals(candidate.getLanguage())) return true;
        // Legacy TTS getLanguage() may return ISO-3 codes (ben/hin/eng).
        try { return requested.getISO3Language().equals(candidate.getISO3Language()); }
        catch (MissingResourceException invalidLocale) { return false; }
    }

    static List<String> chunks(String text, int maxLength) {
        if (maxLength < 2) throw new IllegalArgumentException("Chunk size too small");
        List<String> result = new ArrayList<>();
        for (int start = 0; start < text.length();) {
            int end = Math.min(start + maxLength, text.length());
            if (end < text.length() && Character.isHighSurrogate(text.charAt(end - 1))) end--;
            // Prefer a sentence/word boundary without making tiny chunks.
            if (end < text.length()) {
                for (int split = end - 1; split > start + maxLength / 2; split--) {
                    if (Character.isWhitespace(text.charAt(split))) {
                        end = split + 1;
                        break;
                    }
                }
            }
            result.add(text.substring(start, end));
            start = end;
        }
        return result;
    }
}
