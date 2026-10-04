import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({
  platform: "web",
  capabilities: vi.fn(), listen: vi.fn(), cancelListening: vi.fn(),
  speak: vi.fn(), stopSpeaking: vi.fn(), openVoiceDataSettings: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
}));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native.platform === "android", getPlatform: () => native.platform },
  registerPlugin: () => native,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function flush() { for (let step = 0; step < 6; step++) await Promise.resolve(); }
type VoiceModule = typeof import("../src/lib/voice");
let voice: VoiceModule;

class BrowserRecognition {
  static latest: BrowserRecognition;
  lang = "";
  continuous = true;
  interimResults = true;
  maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  abort = vi.fn();
  constructor() { BrowserRecognition.latest = this; }
}
class BrowserUtterance {
  lang = "";
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(public text: string) {}
}
class BrowserSynthesis extends EventTarget {
  voices: SpeechSynthesisVoice[] = [];
  getVoices = vi.fn(() => this.voices);
  speak = vi.fn<(utterance: BrowserUtterance) => void>();
  cancel = vi.fn();
}
const localVoice = (lang = "hi-IN", localService = true): SpeechSynthesisVoice => ({
  lang, localService, name: "Test voice", voiceURI: "test", default: false,
});
let browser: EventTarget & { SpeechRecognition?: typeof BrowserRecognition; speechSynthesis: BrowserSynthesis };
let doc: EventTarget & { hidden: boolean };

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  native.platform = "web";
  for (const [name, value] of Object.entries(native)) if (name !== "platform" && typeof value === "function") value.mockReset();
  native.cancelListening.mockResolvedValue(undefined);
  native.stopSpeaking.mockResolvedValue(undefined);
  native.openVoiceDataSettings.mockResolvedValue(undefined);
  native.removeListener.mockResolvedValue(undefined);
  native.addListener.mockResolvedValue({ remove: native.removeListener });
  native.capabilities.mockResolvedValue({ speechInput: true, onDeviceInput: true, readAloud: true });
  browser = Object.assign(new EventTarget(), { SpeechRecognition: BrowserRecognition, speechSynthesis: new BrowserSynthesis() });
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("window", browser);
  vi.stubGlobal("document", doc);
  vi.stubGlobal("SpeechSynthesisUtterance", BrowserUtterance);
  voice = await import("../src/lib/voice");
});
afterEach(async () => {
  await voice.cancelListening();
  await voice.stopReadAloud();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("voice permission and native routing", () => {
  it.each(["web", "android"])("refuses non-public readouts on %s before contacting any provider", async platform => {
    native.platform = platform;
    // @ts-expect-error Exercise the runtime boundary for an unreviewed call site.
    await expect(voice.readAloud({ text: "Private claim", language: "bn-IN" })).rejects.toMatchObject({ code: "consent-required" });
    expect(native.speak).not.toHaveBeenCalled();
    expect(browser.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it("opens Android voice settings only after an explicit action and never asks for a microphone", async () => {
    native.platform = "android";
    // @ts-expect-error Exercise the runtime gesture flag.
    await expect(voice.openVoiceDataSettings({ userInitiated: false })).rejects.toMatchObject({ code: "consent-required" });
    expect(native.openVoiceDataSettings).not.toHaveBeenCalled();
    await voice.openVoiceDataSettings({ userInitiated: true });
    expect(native.openVoiceDataSettings).toHaveBeenCalledWith({ userInitiated: true });
    expect(native.listen).not.toHaveBeenCalled();
  });

  it("keeps Android settings unavailable on web and masks native provider failures", async () => {
    await expect(voice.openVoiceDataSettings({ userInitiated: true })).rejects.toMatchObject({ code: "unavailable" });
    expect(native.openVoiceDataSettings).not.toHaveBeenCalled();
    native.platform = "android";
    native.openVoiceDataSettings.mockRejectedValue({ code: "unavailable", message: "private-provider-state" });
    const error = await voice.openVoiceDataSettings({ userInitiated: true }).catch(error => error);
    expect(error.code).toBe("unavailable");
    expect(error.message).not.toContain("private-provider");
  });

  it("queries Android capabilities without requesting microphone access", async () => {
    native.platform = "android";
    await expect(voice.getVoiceCapabilities()).resolves.toEqual({ platform: "android", speechInput: true, onDeviceInput: true, readAloud: true });
    expect(native.listen).not.toHaveBeenCalled();
  });

  it("refuses a missing consent flag before calling the provider", async () => {
    native.platform = "android";
    // @ts-expect-error Test the runtime boundary as well as its stricter type.
    await expect(voice.listenForSpeech({ language: "hi-IN", consent: false })).rejects.toMatchObject({ code: "consent-required" });
    expect(native.listen).not.toHaveBeenCalled();
    expect(native.addListener).not.toHaveBeenCalled();
  });

  it.each([
    ["en-IN", "Understand the risk"],
    ["hi-IN", "निवेश को समझें"],
    ["bn-IN", "বিনিয়োগের ঝুঁকি বুঝুন"],
  ] as const)("uses the Android bridge for %s and emits listening only for its own request", async (language, transcript) => {
    native.platform = "android";
    const result = deferred<{ text: string }>();
    native.listen.mockReturnValue(result.promise);
    const onListening = vi.fn();
    const listening = voice.listenForSpeech({ language, consent: true, onListening });
    await flush();
    const request = native.listen.mock.calls[0]![0];
    const notify = native.addListener.mock.calls[0]![1];
    notify({ requestId: "stale-request" });
    expect(onListening).not.toHaveBeenCalled();
    notify({ requestId: request.requestId });
    expect(onListening).toHaveBeenCalledOnce();
    result.resolve({ text: `  ${transcript}\0  ` });
    await expect(listening).resolves.toBe(transcript);
    expect(native.removeListener).toHaveBeenCalledOnce();
    expect(request).toMatchObject({ consent: true, language });
  });

  it("never starts a late native request after cancelling listener registration", async () => {
    native.platform = "android";
    const registration = deferred<{ remove: typeof native.removeListener }>();
    native.addListener.mockReturnValue(registration.promise);
    const result = voice.listenForSpeech({ language: "en-IN", consent: true }).catch(error => error);
    await voice.cancelListening();
    registration.resolve({ remove: native.removeListener });
    await flush();
    expect(await result).toMatchObject({ code: "cancelled" });
    expect(native.listen).not.toHaveBeenCalled();
    expect(native.removeListener).toHaveBeenCalledOnce();
  });

  it("cancels a pending native microphone permission request and ignores its late result", async () => {
    native.platform = "android";
    const result = deferred<{ text: string }>();
    native.listen.mockReturnValue(result.promise);
    const listening = voice.listenForSpeech({ language: "en-IN", consent: true }).catch(error => error);
    await flush();
    await voice.cancelListening();
    expect(native.cancelListening).toHaveBeenCalledOnce();
    result.resolve({ text: "Must not replace typed text" });
    expect(await listening).toMatchObject({ code: "cancelled" });
  });

  it("preserves stable denied errors without exposing a provider's raw message", async () => {
    native.platform = "android";
    native.listen.mockRejectedValue({ code: "permission-denied", message: "raw-secret-spoken-text" });
    const error = await voice.listenForSpeech({ language: "hi-IN", consent: true }).catch(error => error);
    expect(error).toBeInstanceOf(voice.VoiceError);
    expect(error.code).toBe("permission-denied");
    expect(error.message).not.toContain("raw-secret");
  });

  it("blocks overlapping input and read-aloud while microphone input is pending", async () => {
    const active = voice.listenForSpeech({ language: "en-IN", consent: true }).catch(error => error);
    await expect(voice.listenForSpeech({ language: "hi-IN", consent: true })).rejects.toMatchObject({ code: "busy" });
    await expect(voice.readAloud({ publicContent: true, text: "Read", language: "en-IN" })).rejects.toMatchObject({ code: "busy" });
    await voice.cancelListening();
    expect(await active).toMatchObject({ code: "cancelled" });
  });

  it.each(["en-IN", "hi-IN", "bn-IN"] as const)("uses native %s TTS and resolves only on native playback completion", async language => {
    native.platform = "android";
    const playback = deferred<void>();
    native.speak.mockReturnValue(playback.promise);
    const finished = vi.fn();
    const result = voice.readAloud({ publicContent: true, text: "  Learn about risk  ", language }).then(finished);
    await flush();
    expect(native.speak).toHaveBeenCalledWith({ text: "Learn about risk", language, publicContent: true });
    expect(finished).not.toHaveBeenCalled();
    playback.resolve();
    await result;
    expect(finished).toHaveBeenCalledOnce();
  });

  it("stops native TTS and rejects the old playback as cancelled", async () => {
    native.platform = "android";
    native.speak.mockReturnValue(new Promise(() => {}));
    const result = voice.readAloud({ publicContent: true, text: "Read", language: "hi-IN" }).catch(error => error);
    await voice.stopReadAloud();
    expect(native.stopSpeaking).toHaveBeenCalledOnce();
    expect(await result).toMatchObject({ code: "cancelled" });
  });

  it("reports a missing Bengali dictation model without retrying another language", async () => {
    native.platform = "android";
    native.listen.mockRejectedValue({ code: "language-unavailable", message: "provider-private-transcript" });
    const error = await voice.listenForSpeech({ language: "bn-IN", consent: true }).catch(error => error);
    expect(error.code).toBe("language-unavailable");
    expect(error.message).not.toContain("provider-private");
    expect(error.message).not.toContain("text-to-speech");
    expect(native.listen).toHaveBeenCalledOnce();
    expect(native.listen.mock.calls[0]![0].language).toBe("bn-IN");
  });

  it("clearly reports missing native Bengali read-aloud without requesting microphone access", async () => {
    native.platform = "android";
    native.speak.mockRejectedValue({ code: "language-unavailable", message: "provider-private-content" });
    const error = await voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" }).catch(error => error);
    expect(error.code).toBe("language-unavailable");
    expect(error.message).toContain("Bengali");
    expect(error.message).not.toContain("provider-private");
    expect(native.speak).toHaveBeenCalledOnce();
    expect(native.listen).not.toHaveBeenCalled();
  });
});

describe("browser voice fallback", () => {
  it("reports capabilities without creating a recognizer", async () => {
    await expect(voice.getVoiceCapabilities()).resolves.toEqual({ platform: "web", speechInput: true, onDeviceInput: false, readAloud: true });
    delete browser.SpeechRecognition;
    await expect(voice.getVoiceCapabilities()).resolves.toMatchObject({ speechInput: false });
  });

  it("configures one-shot language input and caps returned text without splitting emoji", async () => {
    const listening = voice.listenForSpeech({ language: "hi-IN", consent: true });
    const recognition = BrowserRecognition.latest;
    expect(recognition).toMatchObject({ lang: "hi-IN", continuous: false, interimResults: false, maxAlternatives: 1 });
    recognition.onresult?.({ results: [[{ transcript: "a".repeat(5999) + "😀more" }]] });
    await expect(listening).resolves.toHaveLength(5999);
    expect(recognition.abort).toHaveBeenCalledOnce();
  });

  it.each([
    ["not-allowed", "permission-denied"], ["network", "network"],
    ["language-not-supported", "language-unavailable"], ["no-speech", "no-speech"],
  ])("maps the %s browser error to %s", async (browserError, code) => {
    const listening = voice.listenForSpeech({ language: "en-IN", consent: true }).catch(error => error);
    BrowserRecognition.latest.onerror?.({ error: browserError });
    expect(await listening).toMatchObject({ code });
  });

  it("expires a silent browser recognizer and detaches callbacks", async () => {
    const result = voice.listenForSpeech({ language: "en-IN", consent: true }).catch(error => error);
    await vi.advanceTimersByTimeAsync(35000);
    expect(await result).toMatchObject({ code: "no-speech" });
    expect(BrowserRecognition.latest.onresult).toBeNull();
    expect(BrowserRecognition.latest.abort).toHaveBeenCalledOnce();
  });

  it("waits for voiceschanged before selecting a local Hindi voice", async () => {
    const result = voice.readAloud({ publicContent: true, text: "जोखिम को समझें", language: "hi-IN" });
    expect(browser.speechSynthesis.speak).not.toHaveBeenCalled();
    browser.speechSynthesis.voices = [localVoice("hi-IN", false), localVoice()];
    browser.speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    const utterance = browser.speechSynthesis.speak.mock.calls[0]![0];
    expect(utterance.voice?.localService).toBe(true);
    expect(utterance.lang).toBe("hi-IN");
    utterance.onend?.();
    await result;
  });

  it("uses a same-language network voice when no local voice loads", async () => {
    browser.speechSynthesis.voices = [localVoice("hi-IN", false)];
    const result = voice.readAloud({ publicContent: true, text: "Read", language: "hi-IN" }).catch(error => error);
    await vi.advanceTimersByTimeAsync(2000);
    const utterance = browser.speechSynthesis.speak.mock.calls[0]![0];
    expect(utterance.voice?.localService).toBe(false);
    expect(utterance.voice?.lang).toBe("hi-IN");
    utterance.onend?.();
    await result;
  });

  it("prefers a later local Bengali locale over an exact network voice", async () => {
    browser.speechSynthesis.voices = [localVoice("bn-IN", false)];
    const result = voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" });
    await vi.advanceTimersByTimeAsync(500);
    expect(browser.speechSynthesis.speak).not.toHaveBeenCalled();
    browser.speechSynthesis.voices.push(localVoice("bn-BD"));
    browser.speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    const utterance = browser.speechSynthesis.speak.mock.calls[0]![0];
    expect(utterance.voice?.lang).toBe("bn-BD");
    expect(utterance.voice?.localService).toBe(true);
    utterance.onend?.();
    await result;
  });

  it("cancelling before the network fallback deadline prevents online playback", async () => {
    browser.speechSynthesis.voices = [localVoice("bn-IN", false)];
    const result = voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" }).catch(error => error);
    await voice.stopReadAloud();
    await vi.advanceTimersByTimeAsync(3000);
    browser.speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    expect(await result).toMatchObject({ code: "cancelled" });
    expect(browser.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it("retries a missing local voice once online and ignores stale callbacks", async () => {
    browser.speechSynthesis.voices = [localVoice("bn-IN"), localVoice("bn-IN", false)];
    const finished = vi.fn();
    const result = voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" }).then(finished);
    const local = browser.speechSynthesis.speak.mock.calls[0]![0];
    const staleEnd = local.onend;
    const staleError = local.onerror;
    local.onerror?.({ error: "voice-unavailable" });
    expect(browser.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    const online = browser.speechSynthesis.speak.mock.calls[1]![0];
    expect(online.voice?.localService).toBe(false);
    expect(online.lang).toBe("bn-IN");
    staleEnd?.();
    staleError?.({ error: "voice-unavailable" });
    await flush();
    expect(finished).not.toHaveBeenCalled();
    expect(browser.speechSynthesis.speak).toHaveBeenCalledTimes(2);
    online.onend?.();
    await result;
    expect(finished).toHaveBeenCalledOnce();
  });

  it("does not loop when the network voice also lacks the language", async () => {
    browser.speechSynthesis.voices = [localVoice("hi-IN"), localVoice("hi-IN", false)];
    const result = voice.readAloud({ publicContent: true, text: "जोखिम समझें", language: "hi-IN" }).catch(error => error);
    browser.speechSynthesis.speak.mock.calls[0]![0].onerror?.({ error: "language-unavailable" });
    browser.speechSynthesis.speak.mock.calls[1]![0].onerror?.({ error: "language-unavailable" });
    expect(await result).toMatchObject({ code: "language-unavailable" });
    expect(browser.speechSynthesis.speak).toHaveBeenCalledTimes(2);
  });

  it("cancels an active network retry and ignores a late completion", async () => {
    browser.speechSynthesis.voices = [localVoice("bn-IN"), localVoice("bn-IN", false)];
    const result = voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" }).catch(error => error);
    browser.speechSynthesis.speak.mock.calls[0]![0].onerror?.({ error: "voice-unavailable" });
    const lateEnd = browser.speechSynthesis.speak.mock.calls[1]![0].onend;
    await voice.stopReadAloud();
    lateEnd?.();
    expect(await result).toMatchObject({ code: "cancelled" });
    expect(browser.speechSynthesis.cancel).toHaveBeenCalledOnce();
  });

  it("stopping while voices load prevents later playback", async () => {
    const result = voice.readAloud({ publicContent: true, text: "Read", language: "hi-IN" }).catch(error => error);
    await voice.stopReadAloud();
    browser.speechSynthesis.voices = [localVoice()];
    browser.speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    await vi.advanceTimersByTimeAsync(3000);
    expect(await result).toMatchObject({ code: "cancelled" });
    expect(browser.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it("times out missing installed voice lists with an actionable language error", async () => {
    const result = voice.readAloud({ publicContent: true, text: "Read", language: "hi-IN" }).catch(error => error);
    await vi.advanceTimersByTimeAsync(2000);
    expect(await result).toMatchObject({ code: "language-unavailable" });
  });

  it("cancels browser recognition when the tab becomes hidden", async () => {
    const result = voice.listenForSpeech({ language: "en-IN", consent: true }).catch(error => error);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(await result).toMatchObject({ code: "cancelled" });
  });

  it("lets the native lifecycle own a permission sheet's visibility transition", async () => {
    native.platform = "android";
    const pending = deferred<{ text: string }>();
    native.listen.mockReturnValue(pending.promise);
    const result = voice.listenForSpeech({ language: "hi-IN", consent: true });
    await flush();
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(native.cancelListening).not.toHaveBeenCalled();
    pending.resolve({ text: "Allowed after consent" });
    await expect(result).resolves.toBe("Allowed after consent");
  });

  it("passes bn-IN to browser dictation and preserves the Bengali transcript", async () => {
    const result = voice.listenForSpeech({ language: "bn-IN", consent: true });
    expect(BrowserRecognition.latest.lang).toBe("bn-IN");
    BrowserRecognition.latest.onresult?.({ results: [[{ transcript: "  নিশ্চিত লাভের দাবি যাচাই করুন  " }]] });
    await expect(result).resolves.toBe("নিশ্চিত লাভের দাবি যাচাই করুন");
  });

  it("waits for Bengali voices added after the initial English/Hindi list and prefers bn-IN", async () => {
    browser.speechSynthesis.voices = [localVoice("en-IN"), localVoice("hi-IN")];
    const result = voice.readAloud({ publicContent: true, text: "বিনিয়োগে ঝুঁকি থাকে", language: "bn-IN" });
    await vi.advanceTimersByTimeAsync(300);
    expect(browser.speechSynthesis.speak).not.toHaveBeenCalled();
    browser.speechSynthesis.voices.push(localVoice("bn-BD"), localVoice("bn-IN", false), localVoice("bn-IN"));
    browser.speechSynthesis.dispatchEvent(new Event("voiceschanged"));
    const utterance = browser.speechSynthesis.speak.mock.calls[0]![0];
    expect(utterance.lang).toBe("bn-IN");
    expect(utterance.voice?.lang).toBe("bn-IN");
    expect(utterance.voice?.localService).toBe(true);
    expect(utterance.text).toBe("বিনিয়োগে ঝুঁকি থাকে");
    utterance.onend?.();
    await result;
  });

  it("can use another installed Bengali locale without falling back to English/Hindi", async () => {
    browser.speechSynthesis.voices = [localVoice("hi-IN"), localVoice("en-IN"), localVoice("bn-BD")];
    const result = voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" });
    const utterance = browser.speechSynthesis.speak.mock.calls[0]![0];
    expect(utterance.voice?.lang).toBe("bn-BD");
    utterance.onend?.();
    await result;
  });

  it("reports missing Bengali voice instead of selecting unrelated local or network voices", async () => {
    browser.speechSynthesis.voices = [localVoice("en-IN"), localVoice("hi-IN"), localVoice("hi-IN", false), localVoice("bnonsense-IN")];
    const result = voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" }).catch(error => error);
    await vi.advanceTimersByTimeAsync(2000);
    const error = await result;
    expect(error.code).toBe("language-unavailable");
    expect(error.message).toContain("Bengali");
    expect(browser.speechSynthesis.speak).not.toHaveBeenCalled();
  });

  it.each(["language-unavailable", "voice-unavailable"])("maps Bengali browser TTS %s errors to a Bengali voice message", async code => {
    browser.speechSynthesis.voices = [localVoice("bn-IN")];
    const result = voice.readAloud({ publicContent: true, text: "ঝুঁকি বুঝুন", language: "bn-IN" }).catch(error => error);
    browser.speechSynthesis.speak.mock.calls[0]![0].onerror?.({ error: code });
    const error = await result;
    expect(error.code).toBe("language-unavailable");
    expect(error.message).toContain("Bengali");
  });
});
