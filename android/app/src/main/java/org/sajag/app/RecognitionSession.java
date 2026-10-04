package org.sajag.app;

/** One consented request: at most one same-language system retry, no stale callbacks. */
final class RecognitionSession {
    final String language;
    private boolean active = true;
    private boolean onDevice;
    private boolean retried;
    private int attempt;

    RecognitionSession(String language) { this.language = language; }

    int start(boolean useOnDevice) {
        if (!active || attempt != 0) return 0;
        onDevice = useOnDevice;
        return ++attempt;
    }

    boolean isCurrent(int token) { return active && token > 0 && token == attempt; }

    int retrySystem(int failedAttempt, boolean languageMissing) {
        if (!isCurrent(failedAttempt) || !onDevice || retried || !languageMissing) return 0;
        retried = true;
        onDevice = false;
        // Invalidate the old recognizer before cancel/destroy can emit callbacks.
        return ++attempt;
    }

    void cancel() { active = false; }
}
