package org.sajag.app;

/** Bounds untrusted share content before it is handed to the local web screen. */
final class SharedText {
    static final int MAX_LENGTH = 6000;

    private SharedText() {}

    static String boundedPlainText(CharSequence value) {
        if (value == null || value.length() == 0) {
            return "";
        }

        int end = Math.min(value.length(), MAX_LENGTH);
        if (end < value.length() && Character.isHighSurrogate(value.charAt(end - 1))) {
            end--;
        }
        // toString drops styled spans. Keep scripts, URLs and markup as literal
        // text; Uri.Builder encodes the query and the web screen uses a textarea.
        return value.subSequence(0, end).toString().replace("\u0000", "").trim();
    }
}
