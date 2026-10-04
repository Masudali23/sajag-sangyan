package org.sajag.app;

import static org.junit.Assert.*;
import java.util.List;
import java.util.Locale;
import org.junit.Test;

public class VoiceTextTest {
    @Test public void languageAllowlistRejectsUnexpectedProviderLocales() {
        assertTrue(VoiceText.supportedLanguage("en-IN"));
        assertTrue(VoiceText.supportedLanguage("hi-IN"));
        assertTrue(VoiceText.supportedLanguage("bn-IN"));
        assertFalse(VoiceText.supportedLanguage(null));
        assertFalse(VoiceText.supportedLanguage("en-US"));
        assertFalse(VoiceText.supportedLanguage("hi-IN\n"));
        assertFalse(VoiceText.supportedLanguage("bn-BD"));
    }

    @Test public void chunkingPreservesEveryCharacterAndStaysWithinProviderLimit() {
        String text = "निवेश में जोखिम को समझें। ".repeat(300) + " End.";
        List<String> chunks = VoiceText.chunks(text, 4000);
        assertTrue(chunks.size() > 1);
        assertEquals(text, String.join("", chunks));
        for (String chunk : chunks) assertTrue(chunk.length() <= 4000);
    }

    @Test public void emojiIsNeverSplitAcrossUtterances() {
        String text = "x".repeat(3999) + "😀" + "y".repeat(4000);
        List<String> chunks = VoiceText.chunks(text, 4000);
        assertEquals(text, String.join("", chunks));
        for (String chunk : chunks) {
            assertFalse(Character.isHighSurrogate(chunk.charAt(chunk.length() - 1)));
            assertFalse(Character.isLowSurrogate(chunk.charAt(0)));
            assertTrue(chunk.length() <= 4000);
        }
    }

    @Test public void emptyInputProducesNoUtterance() {
        assertTrue(VoiceText.chunks("", 4000).isEmpty());
    }

    @Test public void bengaliTextIsPreservedAcrossProviderSizedUtterances() {
        String text = "বিনিয়োগের আগে ঝুঁকি আর খরচ বুঝুন। ".repeat(350);
        List<String> chunks = VoiceText.chunks(text, 4000);
        assertTrue(chunks.size() > 1);
        assertEquals(text, String.join("", chunks));
        for (String chunk : chunks) assertTrue(chunk.length() <= 4000);
    }

    @Test public void offlineBengaliPrefersExactLocaleWithoutOtherLanguageFallback() {
        Locale bn = Locale.forLanguageTag("bn-IN");
        assertEquals(3, VoiceText.voicePreference(bn, bn, false, true));
        assertEquals(2, VoiceText.voicePreference(bn, Locale.forLanguageTag("bn-BD"), false, true));
        assertEquals(-1, VoiceText.voicePreference(bn, Locale.forLanguageTag("hi-IN"), false, true));
        assertEquals(-1, VoiceText.voicePreference(bn, Locale.forLanguageTag("en-IN"), false, true));
    }

    @Test public void networkBengaliIsAllowedButUninstalledAndInvalidVoicesAreRejected() {
        Locale bn = Locale.forLanguageTag("bn-IN");
        assertEquals(1, VoiceText.voicePreference(bn, bn, true, true));
        assertEquals(-1, VoiceText.voicePreference(bn, bn, true, false));
        assertEquals(-1, VoiceText.voicePreference(bn, bn, false, false));
        assertEquals(-1, VoiceText.voicePreference(bn, null, false, true));
        assertEquals(-1, VoiceText.voicePreference(bn, Locale.ROOT, false, true));
        assertEquals("Bengali", VoiceText.languageName("bn-IN"));
    }

    @Test public void englishAndHindiKeepTheirMatchingLocalVoiceBehavior() {
        Locale en = Locale.forLanguageTag("en-IN");
        Locale hi = Locale.forLanguageTag("hi-IN");
        assertEquals(3, VoiceText.voicePreference(en, en, false, true));
        assertEquals(2, VoiceText.voicePreference(en, Locale.US, false, true));
        assertEquals(3, VoiceText.voicePreference(hi, hi, false, true));
        assertEquals(-1, VoiceText.voicePreference(hi, en, false, true));
    }

    @Test public void localSameLanguageOutranksExactNetworkLocale() {
        Locale bn = Locale.forLanguageTag("bn-IN");
        assertTrue(VoiceText.voicePreference(bn, Locale.forLanguageTag("bn-BD"), false, true)
            > VoiceText.voicePreference(bn, bn, true, true));
        assertEquals(0, VoiceText.voicePreference(bn, Locale.forLanguageTag("bn-BD"), true, true));
    }

    @Test public void legacyIso3LocaleCanConfirmSafeSetLanguageWithoutForeignFallback() {
        assertTrue(VoiceText.sameLanguage(Locale.forLanguageTag("bn-IN"), new Locale("ben", "IND")));
        assertTrue(VoiceText.sameLanguage(Locale.forLanguageTag("hi-IN"), new Locale("hin", "IND")));
        assertFalse(VoiceText.sameLanguage(Locale.forLanguageTag("bn-IN"), new Locale("hin", "IND")));
        assertFalse(VoiceText.sameLanguage(Locale.forLanguageTag("bn-IN"), new Locale("not-a-language")));
    }

    @Test(expected = IllegalArgumentException.class)
    public void invalidProviderChunkLimitFailsRatherThanLooping() {
        VoiceText.chunks("😀", 1);
    }
}
