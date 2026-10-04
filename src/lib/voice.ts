import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type VoiceLanguage = "en-IN" | "hi-IN" | "bn-IN";
export type VoiceErrorCode = "permission-denied" | "unavailable" | "no-speech" | "language-unavailable" | "network" | "busy" | "cancelled" | "failed" | "consent-required";
export type VoiceCapabilities = { platform: "android" | "web"; speechInput: boolean; onDeviceInput: boolean; readAloud: boolean };

const messages: Record<VoiceErrorCode, string> = {
  "permission-denied": "Microphone access was denied. Allow it in app or browser settings, or type the claim.",
  unavailable: "Voice is unavailable here. Check the device's speech settings or use text.",
  "no-speech": "No clear speech was heard. Tap the microphone and try again.",
  "language-unavailable": "The selected language is unavailable in this speech service. Check its installed language support or use text.",
  network: "The speech provider could not connect. Use an installed offline language or type the claim.",
  busy: "Another voice request is in progress. Wait a moment and try again.",
  cancelled: "Voice was stopped.",
  failed: "Voice could not finish. Check the device's speech settings or use text.",
  "consent-required": "Confirm voice consent before enabling the microphone.",
};

export class VoiceError extends Error {
  constructor(public readonly code: VoiceErrorCode, message = messages[code]) {
    super(message);
    this.name = "VoiceError";
  }
}

interface NativeVoice {
  capabilities(): Promise<Omit<VoiceCapabilities, "platform">>;
  listen(options: { language: VoiceLanguage; consent: true; requestId: string }): Promise<{ text: string }>;
  cancelListening(): Promise<void>;
  speak(options: { language: VoiceLanguage; text: string; publicContent: true }): Promise<void>;
  openVoiceDataSettings(options: { userInitiated: true }): Promise<void>;
  stopSpeaking(): Promise<void>;
  addListener(name: "listening", listener: (event: { requestId: string }) => void): Promise<PluginListenerHandle>;
}
const nativeVoice = registerPlugin<NativeVoice>("SajagVoice");
const isAndroid = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
const asVoiceError = (error: unknown): VoiceError => {
  if (error instanceof VoiceError) return error;
  const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "failed";
  // Use stable local messages; never expose provider errors containing spoken text.
  return new VoiceError(Object.hasOwn(messages, code) ? code as VoiceErrorCode : code === "UNIMPLEMENTED" || code === "UNAVAILABLE" ? "unavailable" : "failed");
};

interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;
function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const browser = window as Window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export async function getVoiceCapabilities(): Promise<VoiceCapabilities> {
  if (isAndroid()) {
    try { return { ...await nativeVoice.capabilities(), platform: "android" }; }
    catch (error) { throw asVoiceError(error); }
  }
  return {
    platform: "web", speechInput: Boolean(recognitionConstructor()), onDeviceInput: false,
    readAloud: typeof window !== "undefined" && Boolean(window.speechSynthesis) && typeof SpeechSynthesisUtterance !== "undefined",
  };
}

type Operation = { cancel: () => Promise<void> };
let input: Operation | undefined;
let reader: Operation | undefined;
let requestSequence = 0;
function languageAllowed(language: string): language is VoiceLanguage { return language === "en-IN" || language === "hi-IN" || language === "bn-IN"; }
function missingVoice(language: VoiceLanguage): VoiceError {
  const name = { "en-IN": "English", "hi-IN": "Hindi", "bn-IN": "Bengali" }[language];
  return new VoiceError("language-unavailable", `No usable ${name} voice is available. Connect to the internet for an online voice, or install the ${name} voice in the device's text-to-speech settings.`);
}
function boundedTranscript(text: string): string {
  let bounded = text.replaceAll("\0", "").trim().slice(0, 6000);
  if (/[\uD800-\uDBFF]$/.test(bounded)) bounded = bounded.slice(0, -1);
  return bounded;
}

export function listenForSpeech(options: { language: VoiceLanguage; consent: true; onListening?: () => void }): Promise<string> {
  if (options.consent !== true) return Promise.reject(new VoiceError("consent-required"));
  if (!languageAllowed(options.language)) return Promise.reject(new VoiceError("language-unavailable"));
  if (input) return Promise.reject(new VoiceError("busy"));
  void stopReadAloud();
  const android = isAndroid();
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let startedNative = false;
    let listener: PluginListenerHandle | undefined;
    let recognition: Recognition | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (listener) void listener.remove().catch(() => {});
      if (recognition) {
        recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
        try { recognition.abort(); } catch { /* Already ended. */ }
      }
      if (input === operation) input = undefined;
    };
    const finish = (error?: VoiceError, text?: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error); else resolve(text ?? "");
    };
    const operation: Operation = {
      cancel: async () => {
        if (settled) return;
        finish(new VoiceError("cancelled"));
        if (startedNative) await nativeVoice.cancelListening().catch(() => {});
      },
    };
    input = operation;
    const onListening = () => {
      if (!settled) options.onListening?.();
    };
    if (android) {
      const requestId = `voice-${++requestSequence}`;
      void (async () => {
        try {
          listener = await nativeVoice.addListener("listening", event => {
            if (event.requestId === requestId) onListening();
          });
          if (settled) { await listener.remove(); return; }
          startedNative = true;
          const result = await nativeVoice.listen({ language: options.language, consent: true, requestId });
          const text = boundedTranscript(result.text);
          finish(text ? undefined : new VoiceError("no-speech"), text);
        } catch (error) { finish(asVoiceError(error)); }
      })();
      return;
    }
    const Constructor = recognitionConstructor();
    if (!Constructor) { finish(new VoiceError("unavailable")); return; }
    try {
      recognition = new Constructor();
      recognition.lang = options.language;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = onListening;
      recognition.onresult = event => {
        const text = boundedTranscript(event.results[0]?.[0]?.transcript ?? "");
        finish(text ? undefined : new VoiceError("no-speech"), text);
      };
      recognition.onerror = event => {
        const codes: Record<string, VoiceErrorCode> = {
          "not-allowed": "permission-denied", "service-not-allowed": "permission-denied",
          "no-speech": "no-speech", "language-not-supported": "language-unavailable",
          network: "network", aborted: "cancelled", "audio-capture": "unavailable",
        };
        finish(new VoiceError(codes[event.error] ?? "failed"));
      };
      recognition.onend = () => finish(new VoiceError("no-speech"));
      timeout = setTimeout(() => finish(new VoiceError("no-speech")), 35000);
      recognition.start();
    } catch (error) { finish(asVoiceError(error)); }
  });
}

export async function cancelListening(): Promise<void> { await input?.cancel(); }

export function readAloud(options: { text: string; language: VoiceLanguage; publicContent: true }): Promise<void> {
  if (options.publicContent !== true) return Promise.reject(new VoiceError("consent-required", "Read-aloud is only for Sajag's public explanations and lessons."));
  if (!languageAllowed(options.language)) return Promise.reject(new VoiceError("language-unavailable"));
  const text = options.text.trim();
  if (!text || text.length > 24000) return Promise.reject(new VoiceError("failed"));
  if (input) return Promise.reject(new VoiceError("busy"));
  void stopReadAloud();
  const android = isAndroid();
  return new Promise<void>((resolve, reject) => {
    let settled = false;
    let startedNative = false;
    let voiceTimer: ReturnType<typeof setTimeout> | undefined;
    let playbackTimer: ReturnType<typeof setTimeout> | undefined;
    let utterance: SpeechSynthesisUtterance | undefined;
    const synthesis = !android && typeof window !== "undefined" ? window.speechSynthesis : undefined;
    const cleanup = () => {
      if (voiceTimer) clearTimeout(voiceTimer);
      if (playbackTimer) clearTimeout(playbackTimer);
      synthesis?.removeEventListener("voiceschanged", voicesLoaded);
      if (utterance) utterance.onend = utterance.onerror = null;
      if (reader === operation) reader = undefined;
    };
    const finish = (error?: VoiceError) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (error) reject(error); else resolve();
    };
    const operation: Operation = {
      cancel: async () => {
        if (settled) return;
        finish(new VoiceError("cancelled"));
        if (startedNative) await nativeVoice.stopSpeaking().catch(() => {});
        else synthesis?.cancel();
      },
    };
    reader = operation;
    let networkFallbackUsed = false;
    function matchingVoices(local: boolean) {
      const normalized = (tag: string) => tag.replaceAll("_", "-").toLowerCase();
      const prefix = options.language.split("-")[0];
      return (synthesis?.getVoices() ?? []).filter(voice => voice.localService === local && normalized(voice.lang).split("-")[0] === prefix)
        .sort((a, b) => Number(normalized(b.lang) === options.language.toLowerCase()) - Number(normalized(a.lang) === options.language.toLowerCase()));
    }
    function startPlayback(voice: SpeechSynthesisVoice) {
      if (settled || !synthesis) return;
      if (voiceTimer) clearTimeout(voiceTimer);
      if (playbackTimer) clearTimeout(playbackTimer);
      if (utterance) utterance.onend = utterance.onerror = null;
      if (!voice.localService) networkFallbackUsed = true;
      try {
        const attempt = new SpeechSynthesisUtterance(text);
        utterance = attempt;
        attempt.lang = options.language;
        attempt.voice = voice;
        attempt.rate = 0.88;
        attempt.onend = () => { if (utterance === attempt) finish(); };
        attempt.onerror = event => {
          if (settled || utterance !== attempt) return;
          const missing = event.error === "language-unavailable" || event.error === "voice-unavailable";
          const networkVoice = missing && voice.localService && !networkFallbackUsed ? matchingVoices(false)[0] : undefined;
          if (networkVoice) { startPlayback(networkVoice); return; }
          finish(missing ? missingVoice(options.language) : new VoiceError(
            event.error === "canceled" || event.error === "interrupted" ? "cancelled"
              : event.error === "synthesis-unavailable" ? "unavailable" : event.error === "network" ? "network" : "failed",
          ));
        };
        playbackTimer = setTimeout(() => {
          finish(new VoiceError("failed"));
          synthesis.cancel();
        }, Math.min(600000, 15000 + text.length * 180));
        synthesis.speak(attempt);
      } catch (error) { finish(asVoiceError(error)); }
    }
    function chooseVoice(allowNetwork: boolean) {
      if (settled || utterance || !synthesis) return;
      const voice = matchingVoices(true)[0] ?? (allowNetwork ? matchingVoices(false)[0] : undefined);
      if (voice) startPlayback(voice);
    }
    function voicesLoaded() { chooseVoice(false); }
    if (android) {
      startedNative = true;
      void nativeVoice.speak({ text, language: options.language, publicContent: true }).then(() => finish(), error => {
        const mapped = asVoiceError(error);
        finish(mapped.code === "language-unavailable" ? missingVoice(options.language) : mapped);
      });
    } else if (!synthesis || typeof SpeechSynthesisUtterance === "undefined") {
      finish(new VoiceError("unavailable"));
    } else {
      synthesis.addEventListener("voiceschanged", voicesLoaded);
      // Give asynchronously installed/local voices priority before using a
      // same-language network provider for the explicitly public readout.
      voiceTimer = setTimeout(() => {
        chooseVoice(true);
        if (!settled && !utterance) finish(missingVoice(options.language));
      }, 2000);
      voicesLoaded();
    }
  });
}

export async function stopReadAloud(): Promise<void> { await reader?.cancel(); }

export async function openVoiceDataSettings(options: { userInitiated: true }): Promise<void> {
  if (options.userInitiated !== true) throw new VoiceError("consent-required");
  if (!isAndroid()) throw new VoiceError("unavailable");
  await cancelListening();
  await stopReadAloud();
  try { await nativeVoice.openVoiceDataSettings({ userInitiated: true }); }
  catch (error) { throw asVoiceError(error); }
}

// Navigating away or hiding a browser tab must not leave the microphone playing
// into a background page. Android also enforces this through native lifecycle hooks.
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => { void cancelListening(); void stopReadAloud(); });
  if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => {
    // A native microphone permission sheet may temporarily hide its WebView.
    // The native plugin knows when it is waiting for that sheet; it owns cleanup.
    if (document.hidden && !isAndroid()) { void cancelListening(); void stopReadAloud(); }
  });
}
