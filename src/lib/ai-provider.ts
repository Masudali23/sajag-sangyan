import { useEffect, useState } from "react";
import { API_BASE } from "./api";

export type AiProvider = "gemini" | "openai";

// Version 1 means /analyze binds consentProvider to the actual recipient.
// Older servers must not receive text under a different provider's disclosure.
export async function getAiProvider(
  signal?: AbortSignal,
): Promise<AiProvider | null> {
  const response = await fetch(`${API_BASE}/api/health`, {
    cache: "no-store",
    signal: signal ?? AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const health: unknown = await response.json();
  if (!health || typeof health !== "object") return null;
  const config = health as Record<string, unknown>;
  return config.aiConsentVersion === 1 &&
    config.aiAvailable === true &&
    (config.aiProvider === "gemini" || config.aiProvider === "openai")
    ? config.aiProvider
    : null;
}

export function useAiProvider(enabled: boolean) {
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setProvider(null);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 5000);
    setLoading(true);
    void getAiProvider(controller.signal)
      .then((value) => {
        if (active) setProvider(value);
      })
      .catch(() => {
        if (active) setProvider(null);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [enabled]);
  return { provider: enabled ? provider : null, loading, setProvider };
}
