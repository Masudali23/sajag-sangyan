package org.sajag.app;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** User-initiated, single-session voice. Never records files or logs spoken text. */
@CapacitorPlugin(
    name = "SajagVoice",
    permissions = { @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO }) }
)
public class SajagVoicePlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private PluginCall listenCall;
    private RecognitionSession listenSession;
    private boolean permissionInFlight;
    private boolean stopped;
    private boolean resumed;
    private boolean destroyed;
    private Runnable listenTimeout;

    private TextToSpeech tts;
    private boolean ttsReady;
    private int ttsGeneration;
    private PluginCall speakCall;
    private String pendingText;
    private String pendingLanguage;
    private String lastUtterance;
    private int speakGeneration;
    private Runnable speakTimeout;
    private Runnable initTimeout;

    @PluginMethod
    public void capabilities(PluginCall call) {
        main.post(() -> {
            JSObject result = new JSObject();
            boolean onDevice = onDeviceAvailable();
            boolean system = false;
            boolean reader = false;
            try {
                system = SpeechRecognizer.isRecognitionAvailable(getContext());
                reader = !getContext().getPackageManager().queryIntentServices(
                    new Intent(TextToSpeech.Engine.INTENT_ACTION_TTS_SERVICE), 0
                ).isEmpty();
            } catch (RuntimeException ignored) { /* Report availability without logging content. */ }
            result.put("speechInput", onDevice || system);
            result.put("onDeviceInput", onDevice);
            result.put("readAloud", reader);
            call.resolve(result);
        });
    }

    // The inherited generic method must not bypass the explicit consent boundary.
    @Override
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        call.reject("Use the microphone button and confirm voice consent first.", "consent-required");
    }

    @PluginMethod
    public void listen(PluginCall call) {
        main.post(() -> {
            if (!Boolean.TRUE.equals(call.getBoolean("consent", false))) {
                call.reject("Confirm voice consent before enabling the microphone.", "consent-required");
                return;
            }
            if (!VoiceText.supportedLanguage(call.getString("language"))) {
                call.reject("Choose English, Hindi, or Bengali for voice input.", "language-unavailable");
                return;
            }
            if (destroyed || stopped || !resumed) {
                call.reject("Return to Sajag and tap the microphone again.", "cancelled");
                return;
            }
            if (listenCall != null || permissionInFlight) {
                call.reject("A microphone request is already in progress.", "busy");
                return;
            }
            finishSpeaking("cancelled", "Read-aloud stopped for microphone input.");
            listenCall = call;
            listenSession = new RecognitionSession(call.getString("language"));
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                permissionInFlight = true;
                try {
                    requestPermissionForAlias("microphone", call, "microphonePermissionResult");
                } catch (RuntimeException unavailable) {
                    permissionInFlight = false;
                    finishListening("permission-denied", "Allow microphone access in Android Settings > Apps > Sajag > Permissions.", null);
                }
                return;
            }
            startRecognizer(call);
        });
    }

    @PermissionCallback
    private void microphonePermissionResult(PluginCall call) {
        main.post(() -> {
            permissionInFlight = false;
            // A cancelled permission request can return a null released call.
            if (call == null || call != listenCall || destroyed || stopped) return;
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                finishListening("permission-denied", "Microphone permission was denied. Allow it in Android Settings > Apps > Sajag > Permissions, or type the claim.", null);
                return;
            }
            // Permission results can arrive while the permission sheet still
            // pauses the Activity. Resume, not the dialog, starts the microphone.
            if (resumed) startRecognizer(call);
        });
    }

    private boolean onDeviceAvailable() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return false;
        try { return SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()); }
        catch (RuntimeException unavailable) { return false; }
    }

    private void startRecognizer(PluginCall owner) {
        if (owner != listenCall || destroyed || stopped || !resumed) return;
        RecognitionSession session = listenSession;
        if (session == null) return;
        boolean onDevice = onDeviceAvailable();
        int attempt = session.start(onDevice);
        if (attempt == 0) return;
        // One deadline for the whole consented request, including its retry.
        listenTimeout = () -> {
            if (listenCall == owner && listenSession == session)
                finishListening("no-speech", "Voice input timed out. Tap the microphone to try again.", null);
        };
        main.postDelayed(listenTimeout, 35000);
        startRecognizerAttempt(owner, session, attempt, onDevice);
    }

    private boolean currentAttempt(PluginCall owner, RecognitionSession session, int attempt) {
        return owner == listenCall && session == listenSession && session.isCurrent(attempt)
            && resumed && !stopped && !destroyed;
    }

    private void startRecognizerAttempt(PluginCall owner, RecognitionSession session, int attempt, boolean onDevice) {
        if (!currentAttempt(owner, session, attempt)) return;
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            finishListening("permission-denied", "Allow microphone access in Android Settings > Apps > Sajag > Permissions.", null);
            return;
        }
        try {
            if (onDevice) {
                recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            } else if (SpeechRecognizer.isRecognitionAvailable(getContext())) {
                recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            } else {
                finishListening("unavailable", "No Android speech service is installed or enabled. Enable a speech service in Android Settings, or type the claim.", null);
                return;
            }
            recognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {
                    if (!currentAttempt(owner, session, attempt)) return;
                    JSObject event = new JSObject();
                    event.put("requestId", owner.getString("requestId", ""));
                    notifyListeners("listening", event);
                }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rmsdB) {}
                @Override public void onBufferReceived(byte[] buffer) { /* Never retain raw audio. */ }
                @Override public void onEndOfSpeech() {}
                @Override public void onPartialResults(Bundle results) {}
                @Override public void onEvent(int eventType, Bundle params) {}
                @Override public void onError(int error) {
                    if (!currentAttempt(owner, session, attempt)) return;
                    boolean languageMissing = error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED
                        || error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE;
                    int retry = session.retrySystem(attempt, languageMissing);
                    if (retry != 0) {
                        releaseRecognizer();
                        // Re-enter the main queue so cancel/pause can invalidate this
                        // session before any standard-service microphone start.
                        main.post(() -> startRecognizerAttempt(owner, session, retry, false));
                        return;
                    }
                    String code;
                    String message;
                    switch (error) {
                        case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                            code = "permission-denied";
                            message = "Allow microphone access in Android Settings > Apps > Sajag > Permissions.";
                            break;
                        case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED:
                        case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE:
                            code = "language-unavailable";
                            message = "This speech service has no " + VoiceText.languageName(owner.getString("language")) + " model. Install that language in Android speech-recognition settings or type the claim.";
                            break;
                        case SpeechRecognizer.ERROR_NETWORK:
                        case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                        case SpeechRecognizer.ERROR_SERVER:
                        case SpeechRecognizer.ERROR_SERVER_DISCONNECTED:
                            code = "network";
                            message = "Your phone's speech service could not connect. Use an installed offline speech language or type the claim.";
                            break;
                        case SpeechRecognizer.ERROR_NO_MATCH:
                        case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                            code = "no-speech";
                            message = "No clear speech was heard. Tap the microphone and try again.";
                            break;
                        case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                        case SpeechRecognizer.ERROR_TOO_MANY_REQUESTS:
                            code = "busy";
                            message = "The phone's speech service is busy. Wait a moment and try again.";
                            break;
                        default:
                            code = "failed";
                            message = "Voice input stopped. Check the phone's microphone privacy switch and speech service, or type the claim.";
                    }
                    finishListening(code, message, null);
                }
                @Override public void onResults(Bundle results) {
                    if (!currentAttempt(owner, session, attempt)) return;
                    ArrayList<String> matches = results == null ? null : results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    String text = matches == null || matches.isEmpty() ? "" : SharedText.boundedPlainText(matches.get(0));
                    if (text.isEmpty()) finishListening("no-speech", "No clear speech was heard. Try again or type the claim.", null);
                    else finishListening(null, null, text);
                }
            });
            Intent request = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            request.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            request.putExtra(RecognizerIntent.EXTRA_LANGUAGE, session.language);
            request.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            request.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
            request.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, onDevice);
            // No audio source/output URI or save-audio extras are supplied.
            recognizer.startListening(request);
        } catch (SecurityException denied) {
            finishListening("permission-denied", "Allow microphone access in Android Settings > Apps > Sajag > Permissions.", null);
        } catch (RuntimeException unavailable) {
            finishListening("unavailable", "The Android speech service could not start. Check Android speech settings or type the claim.", null);
        }
    }

    @PluginMethod
    public void cancelListening(PluginCall call) {
        main.post(() -> {
            finishListening("cancelled", "Voice input cancelled.", null);
            call.resolve();
        });
    }

    private void finishListening(String code, String message, String text) {
        PluginCall owner = listenCall;
        listenCall = null;
        if (listenSession != null) listenSession.cancel();
        listenSession = null;
        if (listenTimeout != null) main.removeCallbacks(listenTimeout);
        listenTimeout = null;
        releaseRecognizer();
        if (owner != null) {
            if (code != null) owner.reject(message, code);
            else {
                JSObject result = new JSObject();
                result.put("text", text);
                owner.resolve(result);
            }
        }
    }

    private void releaseRecognizer() {
        SpeechRecognizer previous = recognizer;
        recognizer = null;
        if (previous != null) {
            try { previous.cancel(); } catch (RuntimeException ignored) {}
            try { previous.destroy(); } catch (RuntimeException ignored) {}
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        main.post(() -> {
            if (!Boolean.TRUE.equals(call.getBoolean("publicContent", false))) {
                call.reject("Read-aloud is only for Sajag's public explanations and lessons.", "consent-required");
                return;
            }
            String text = call.getString("text", "").trim();
            String language = call.getString("language", "");
            if (!VoiceText.supportedLanguage(language)) {
                call.reject("Choose English, Hindi, or Bengali for read-aloud.", "language-unavailable");
                return;
            }
            if (text.isEmpty() || text.length() > VoiceText.MAX_READ_LENGTH) {
                call.reject("Select between 1 and 24,000 characters to read aloud.", "failed");
                return;
            }
            if (destroyed || stopped || !resumed) {
                call.reject("Return to Sajag to read aloud.", "cancelled");
                return;
            }
            if (listenCall != null || permissionInFlight) {
                call.reject("Finish microphone input before starting read-aloud.", "busy");
                return;
            }
            finishSpeaking("cancelled", "A new read-aloud request was started.");
            speakCall = call;
            pendingText = text;
            pendingLanguage = language;
            if (ttsReady && tts != null) startSpeaking();
            else initializeReader();
        });
    }

    private void initializeReader() {
        if (tts != null) return; // The one pending initialization serves the latest request.
        final int generation = ++ttsGeneration;
        try {
            // A failed constructor can call onInit synchronously. Always post.
            tts = new TextToSpeech(getContext(), status -> main.post(() -> {
                if (destroyed || generation != ttsGeneration || tts == null) return;
                if (initTimeout != null) main.removeCallbacks(initTimeout);
                initTimeout = null;
                if (status != TextToSpeech.SUCCESS) {
                    finishSpeaking("unavailable", "Enable a text-to-speech engine in Android Settings > Accessibility > Text-to-speech output.");
                    releaseReader();
                    return;
                }
                ttsReady = true;
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String utteranceId) {}
                    @Override public void onDone(String utteranceId) {
                        main.post(() -> {
                            if (utteranceId != null && utteranceId.equals(lastUtterance)) finishSpeaking(null, null);
                        });
                    }
                    @Override public void onError(String utteranceId) { onError(utteranceId, TextToSpeech.ERROR); }
                    @Override public void onError(String utteranceId, int errorCode) {
                        main.post(() -> {
                            if (!currentUtterance(utteranceId)) return;
                            String code = errorCode == TextToSpeech.ERROR_NOT_INSTALLED_YET ? "language-unavailable"
                                : errorCode == TextToSpeech.ERROR_NETWORK || errorCode == TextToSpeech.ERROR_NETWORK_TIMEOUT ? "network" : "failed";
                            finishSpeaking(code, "Read-aloud could not finish. Check the installed voice in Android text-to-speech settings.");
                        });
                    }
                    @Override public void onStop(String utteranceId, boolean interrupted) {
                        main.post(() -> {
                            if (currentUtterance(utteranceId)) finishSpeaking("cancelled", "Read-aloud stopped.");
                        });
                    }
                });
                if (speakCall != null && resumed && !stopped) startSpeaking();
            }));
            initTimeout = () -> {
                if (generation != ttsGeneration || ttsReady) return;
                finishSpeaking("unavailable", "The text-to-speech engine did not start. Check Android text-to-speech settings.");
                releaseReader();
            };
            main.postDelayed(initTimeout, 10000);
        } catch (RuntimeException unavailable) {
            finishSpeaking("unavailable", "The text-to-speech engine could not start. Check Android text-to-speech settings.");
            releaseReader();
        }
    }

    private void startSpeaking() {
        if (speakCall == null || tts == null || !ttsReady || !resumed || stopped || destroyed) return;
        try {
            Locale requested = Locale.forLanguageTag(pendingLanguage);
            List<Voice> candidates = new ArrayList<>();
            Set<Voice> voices = tts.getVoices();
            if (voices != null) {
                for (Voice voice : voices) {
                    if (voiceScore(requested, voice) >= 0) candidates.add(voice);
                }
            }
            candidates.sort((left, right) -> Integer.compare(voiceScore(requested, right), voiceScore(requested, left)));
            boolean selected = false;
            for (Voice voice : candidates) {
                if (tts.setVoice(voice) == TextToSpeech.SUCCESS) {
                    Voice actual = tts.getVoice();
                    if (actual == null || voiceScore(requested, actual) >= 0) {
                        selected = true;
                        break;
                    }
                }
            }
            // Legacy engines can omit getVoices(). Ask for the exact language,
            // then verify the resulting language before any text is submitted.
            if (!selected && tts.isLanguageAvailable(requested) >= TextToSpeech.LANG_AVAILABLE
                && tts.setLanguage(requested) >= TextToSpeech.LANG_AVAILABLE) {
                Voice actual = tts.getVoice();
                selected = actual != null ? voiceScore(requested, actual) >= 0
                    : VoiceText.sameLanguage(requested, tts.getLanguage());
            }
            if (!selected) {
                finishSpeaking("language-unavailable", "No usable " + VoiceText.languageName(pendingLanguage) + " voice is available. Open voice settings to install that language, or read the text.");
                return;
            }
            tts.setSpeechRate(0.88f);
            final int session = ++speakGeneration;
            List<String> chunks = VoiceText.chunks(pendingText, TextToSpeech.getMaxSpeechInputLength());
            long timeoutMs = Math.min(600000L, 15000L + pendingText.length() * 180L);
            pendingText = null;
            pendingLanguage = null;
            lastUtterance = session + ":" + (chunks.size() - 1);
            speakTimeout = () -> {
                if (speakGeneration == session && speakCall != null) finishSpeaking("failed", "Read-aloud timed out. Try a shorter passage.");
            };
            main.postDelayed(speakTimeout, timeoutMs);
            for (int index = 0; index < chunks.size(); index++) {
                if (tts.speak(chunks.get(index), TextToSpeech.QUEUE_ADD, null, session + ":" + index) != TextToSpeech.SUCCESS) {
                    finishSpeaking("failed", "Read-aloud could not start. Check Android text-to-speech settings.");
                    return;
                }
            }
        } catch (RuntimeException unavailable) {
            finishSpeaking("failed", "Read-aloud could not start. Check Android text-to-speech settings.");
        }
    }

    private int voiceScore(Locale requested, Voice voice) {
        Set<String> features = voice.getFeatures();
        boolean installed = features == null || !features.contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED);
        return VoiceText.voicePreference(requested, voice.getLocale(), voice.isNetworkConnectionRequired(), installed);
    }

    @PluginMethod
    public void openVoiceDataSettings(PluginCall call) {
        main.post(() -> {
            if (!Boolean.TRUE.equals(call.getBoolean("userInitiated", false))) {
                call.reject("Tap the voice settings button to open Android settings.", "consent-required");
                return;
            }
            if (!resumed || stopped || destroyed || getActivity() == null) {
                call.reject("Return to Sajag to open voice settings.", "cancelled");
                return;
            }
            finishListening("cancelled", "Voice settings opened.", null);
            finishSpeaking("cancelled", "Voice settings opened.");
            try {
                Intent install = new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA);
                String engine = tts == null ? null : tts.getDefaultEngine();
                if (engine != null && !engine.isEmpty()) install.setPackage(engine);
                try { getActivity().startActivity(install); }
                catch (ActivityNotFoundException missingInstaller) {
                    getActivity().startActivity(new Intent(Settings.ACTION_SETTINGS));
                }
                call.resolve();
            } catch (RuntimeException unavailable) {
                call.reject("Open Android Settings > Text-to-speech output > Install voice data.", "unavailable");
            }
        });
    }

    private boolean currentUtterance(String id) {
        return speakCall != null && id != null && id.startsWith(speakGeneration + ":");
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        main.post(() -> {
            finishSpeaking("cancelled", "Read-aloud stopped.");
            call.resolve();
        });
    }

    private void finishSpeaking(String code, String message) {
        PluginCall owner = speakCall;
        speakCall = null;
        pendingText = null;
        pendingLanguage = null;
        lastUtterance = null;
        ++speakGeneration;
        if (speakTimeout != null) main.removeCallbacks(speakTimeout);
        speakTimeout = null;
        if (tts != null && ttsReady) {
            try { tts.stop(); } catch (RuntimeException ignored) {}
        }
        if (owner != null) {
            if (code == null) owner.resolve();
            else owner.reject(message, code);
        }
    }

    private void releaseReader() {
        ++ttsGeneration;
        if (initTimeout != null) main.removeCallbacks(initTimeout);
        initTimeout = null;
        TextToSpeech previous = tts;
        tts = null;
        ttsReady = false;
        if (previous != null) {
            try { previous.shutdown(); } catch (RuntimeException ignored) {}
        }
    }

    // Capacitor forwards Activity lifecycle hooks synchronously on the main
    // thread. Mark state immediately so already-queued bridge work cannot start
    // a microphone or utterance behind an obscuring Activity.
    @Override protected void handleOnStart() { stopped = false; }
    @Override protected void handleOnResume() {
        resumed = true;
        if (!stopped && !destroyed && listenCall != null && !permissionInFlight && recognizer == null
            && getPermissionState("microphone") == PermissionState.GRANTED) startRecognizer(listenCall);
    }
    @Override protected void handleOnPause() {
        resumed = false;
        // A permission dialog can pause the Activity. Wait for its result.
        if (!permissionInFlight) finishListening("cancelled", "Voice input stopped when Sajag left the foreground.", null);
        finishSpeaking("cancelled", "Read-aloud stopped when Sajag left the foreground.");
    }
    @Override protected void handleOnStop() {
        stopped = true;
        resumed = false;
        finishListening("cancelled", "Voice input stopped when Sajag left the foreground.", null);
        finishSpeaking("cancelled", "Read-aloud stopped when Sajag left the foreground.");
    }
    @Override protected void handleOnDestroy() {
        destroyed = true;
        resumed = false;
        finishListening("cancelled", "Sajag closed.", null);
        finishSpeaking("cancelled", "Sajag closed.");
        releaseReader();
    }
}
