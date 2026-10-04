import { Capacitor } from "@capacitor/core";
import { MAX_CLAIM_LENGTH } from "../../shared/engine";

export type SharedMessage = { text: string; truncated: boolean };
export type ShareIntakeStatus =
  "none" | "loading" | "ready" | "empty" | "unavailable";

let pendingShare: SharedMessage | null = null;
let status: ShareIntakeStatus = "none";
let discard = false;
let expiry: ReturnType<typeof setTimeout> | undefined;
let signInHolds = 0;
let receivedAt = 0;
const SIGN_IN_RETENTION_MS = 15 * 60 * 1000;

function scheduleExpiry() {
  clearTimeout(expiry);
  if (!pendingShare) return;
  const remaining = Math.max(0, receivedAt + SIGN_IN_RETENTION_MS - Date.now());
  expiry = setTimeout(
    forgetSharedMessage,
    signInHolds ? remaining : Math.min(30_000, remaining),
  );
}

function boundedMessage(parts: string[]): SharedMessage | null {
  const value = [
    ...new Set(
      parts.map((part) => part.replaceAll("\0", "").trim()).filter(Boolean),
    ),
  ].join("\n\n");
  if (!value) return null;
  let end = Math.min(value.length, MAX_CLAIM_LENGTH);
  if (end < value.length && /[\uD800-\uDBFF]/.test(value[end - 1])) end--;
  return { text: value.slice(0, end), truncated: value.length > end };
}

function accept(message: SharedMessage | null) {
  if (discard || !/^\/check\/?$/.test(window.location.pathname)) return;
  pendingShare = message;
  status = message ? "ready" : "empty";
  receivedAt = Date.now();
  // A first sign-in may take longer than a lazy route. Text remains only in
  // memory, bounded to 15 minutes while the verification gate is mounted.
  scheduleExpiry();
}

function requestWorkerShare(): Promise<void> {
  status = "loading";
  return new Promise((resolve) => {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) {
      status = "unavailable";
      resolve();
      return;
    }
    const channel = new MessageChannel();
    let done = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (message?: SharedMessage) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      channel.port1.close();
      channel.port2.close();
      if (!discard) {
        if (message) accept(message);
        else status = "unavailable";
      }
      resolve();
    };
    timer = setTimeout(() => finish(), 4_000);
    channel.port1.onmessage = (event: MessageEvent<unknown>) => {
      const data = event.data as {
        type?: unknown;
        version?: unknown;
        status?: unknown;
        message?: { text?: unknown; truncated?: unknown };
      } | null;
      if (
        data?.type !== "SAJAG_SHARE_RESULT" ||
        data.version !== 1 ||
        data.status !== "ready" ||
        typeof data.message?.text !== "string" ||
        typeof data.message.truncated !== "boolean"
      ) {
        finish();
        return;
      }
      const message = boundedMessage([data.message.text]);
      if (!message) {
        finish();
        return;
      }
      message.truncated ||= data.message.truncated;
      finish(message);
    };
    channel.port1.onmessageerror = () => finish();
    try {
      worker.postMessage({ type: "SAJAG_TAKE_SHARE", version: 1 }, [
        channel.port2,
      ]);
    } catch {
      finish();
    }
  });
}

// Imported before React/router startup. Neither the resolved Promise nor router
// state contains the text: Check reads the transient slot and immediately clears
// it. Browsers receive only a fixed marker, never a claim-bearing URL.
function captureShare(): Promise<void> {
  const url = new URL(window.location.href);
  if (!/^\/check\/?$/.test(url.pathname)) return Promise.resolve();
  const hasLegacyQuery = ["text", "title", "url"].some((key) =>
    url.searchParams.has(key),
  );
  const hasPostMarker = url.searchParams.has("shared");
  if (!hasLegacyQuery && !hasPostMarker) return Promise.resolve();
  window.history.replaceState(window.history.state, "", "/check");
  if (hasLegacyQuery) {
    // Capacitor's verified Android local server bypasses the browser history/
    // HTTP-cache path. Regular browser GET shares are deliberately not accepted.
    if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android") {
      accept(
        boundedMessage(
          ["text", "url", "title"].map(
            (key) => url.searchParams.get(key) || "",
          ),
        ),
      );
    } else {
      status = "unavailable";
    }
    return Promise.resolve();
  }
  if (url.searchParams.get("shared") === "empty") {
    status = "empty";
    return Promise.resolve();
  }
  if (
    url.searchParams.get("shared") !== "1" ||
    !window.isSecureContext ||
    !("serviceWorker" in navigator)
  ) {
    status = "unavailable";
    return Promise.resolve();
  }
  return requestWorkerShare();
}

export const shareIntakeReady: Promise<void> = captureShare();

export function peekSharedMessage(): SharedMessage | null {
  return pendingShare;
}

export function getShareIntakeStatus(): ShareIntakeStatus {
  return status;
}

export function holdSharedMessageForSignIn(): () => void {
  signInHolds++;
  scheduleExpiry();
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    signInHolds = Math.max(0, signInHolds - 1);
    scheduleExpiry();
  };
}

export function forgetSharedMessage() {
  pendingShare = null;
  discard = true;
  clearTimeout(expiry);
  if (status === "ready") status = "unavailable";
}

window.addEventListener("pagehide", forgetSharedMessage);
