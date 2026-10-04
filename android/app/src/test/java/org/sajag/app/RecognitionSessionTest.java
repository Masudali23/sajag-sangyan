package org.sajag.app;

import static org.junit.Assert.*;
import org.junit.Test;

public class RecognitionSessionTest {
    @Test public void missingOnDeviceLanguageRetriesSystemOnlyOnceInSameLanguage() {
        RecognitionSession session = new RecognitionSession("bn-IN");
        int local = session.start(true);
        int system = session.retrySystem(local, true);
        assertTrue(system > local);
        assertEquals("bn-IN", session.language);
        assertFalse(session.isCurrent(local));
        assertTrue(session.isCurrent(system));
        assertEquals(0, session.retrySystem(system, true));
        assertEquals(0, session.retrySystem(local, true));
    }

    @Test public void standardRecognizerDoesNotLoopOnMissingLanguage() {
        RecognitionSession session = new RecognitionSession("hi-IN");
        int system = session.start(false);
        assertEquals(0, session.retrySystem(system, true));
        assertTrue(session.isCurrent(system));
    }

    @Test public void nonLanguageErrorsDoNotStartFallback() {
        RecognitionSession session = new RecognitionSession("en-IN");
        int local = session.start(true);
        assertEquals(0, session.retrySystem(local, false));
        assertTrue(session.isCurrent(local));
    }

    @Test public void cancelledPermissionOrCaptureCannotStartRetry() {
        RecognitionSession session = new RecognitionSession("bn-IN");
        int local = session.start(true);
        session.cancel();
        assertEquals(0, session.retrySystem(local, true));
        assertFalse(session.isCurrent(local));
        assertEquals(0, session.start(false));
    }

    @Test public void cancelOrPauseBetweenRetryAndQueuedStartInvalidatesIt() {
        RecognitionSession session = new RecognitionSession("hi-IN");
        int system = session.retrySystem(session.start(true), true);
        session.cancel();
        assertFalse(session.isCurrent(system));
        assertEquals(0, session.retrySystem(system, true));
    }

    @Test public void completedOldRequestCannotAffectNewConsentSession() {
        RecognitionSession old = new RecognitionSession("bn-IN");
        int oldAttempt = old.start(true);
        old.cancel();
        RecognitionSession current = new RecognitionSession("en-IN");
        int currentAttempt = current.start(true);
        assertFalse(old.isCurrent(oldAttempt));
        assertTrue(current.isCurrent(currentAttempt));
    }

    @Test public void duplicateResumeCannotStartAnotherInitialAttempt() {
        RecognitionSession session = new RecognitionSession("bn-IN");
        int first = session.start(true);
        assertEquals(0, session.start(true));
        assertEquals(0, session.start(false));
        assertTrue(session.isCurrent(first));
        assertFalse(session.isCurrent(0));
    }
}
