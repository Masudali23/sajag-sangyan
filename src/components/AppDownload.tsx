import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { ArrowDownToLine, Smartphone } from "lucide-react";
import { useApp } from "../lib/preferences";

export function AppDownload() {
  const { t } = useApp();
  const [release, setRelease] = useState<{
    version: string;
    bytes: number;
    sha256: string;
  } | null>(null);
  const native = Capacitor.isNativePlatform();
  useEffect(() => {
    if (native) return;
    const controller = new AbortController();
    void fetch("/downloads/latest.json", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        if (
          data.schemaVersion === 1 &&
          typeof data.versionName === "string" &&
          /^\d+(\.\d+){1,3}$/.test(data.versionName) &&
          Number.isSafeInteger(data.bytes) &&
          data.bytes > 0 &&
          typeof data.sha256 === "string" &&
          /^[a-f0-9]{64}$/.test(data.sha256)
        )
          setRelease({
            version: data.versionName,
            bytes: data.bytes,
            sha256: data.sha256,
          });
      })
      .catch(() => {
        /* The fixed download URL remains available without metadata. */
      });
    return () => controller.abort();
  }, [native]);
  if (native) return null;
  return (
    <div className="app-download">
      <div className="download-heading">
        <Smartphone size={22} />
        <div>
          <h3>{t("Sajag for Android", "Android के लिए Sajag")}</h3>
          <p>
            {t(
              "Native voice and WhatsApp sharing",
              "डिवाइस की आवाज़ और WhatsApp से शेयर",
            )}
          </p>
        </div>
      </div>
      <a
        className="button primary full"
        href="/downloads/Sajag-Android-Debug.apk"
        download="Sajag-Android-Debug.apk"
      >
        <ArrowDownToLine size={18} />
        {t("Download Android APK", "Android APK डाउनलोड करें")}
      </a>
      <p className="small-text muted">
        {release
          ? t(
              `Version ${release.version} · ${(release.bytes / 1048576).toFixed(1)} MB · Android 7+`,
              `संस्करण ${release.version} · ${(release.bytes / 1048576).toFixed(1)} MB · Android 7+`,
              `সংস্করণ ${release.version} · ${(release.bytes / 1048576).toFixed(1)} MB · Android 7+`,
            )
          : t(
              "Android 7 or later · Internet needed to download",
              "Android 7 या नया · डाउनलोड के लिए इंटरनेट चाहिए",
            )}
      </p>
      <p className="small-text muted">
        {t(
          "Debug-signed prototype, for testing. Android may ask you to allow installation from your browser. On iPhone: Safari → Share → Add to Home Screen.",
          "टेस्ट के लिए डिबग-साइन किया प्रोटोटाइप। Android ब्राउज़र से इंस्टॉल करने की अनुमति माँग सकता है। iPhone पर: Safari → शेयर → होम स्क्रीन पर जोड़ें।",
          "পরীক্ষার জন্য ডিবাগ-সাইন করা প্রোটোটাইপ। Android ব্রাউজার থেকে ইনস্টল করার অনুমতি চাইতে পারে। iPhone-এ: Safari → Share → Add to Home Screen।",
        )}
      </p>
      {release && (
        <details className="download-checksum">
          <summary>
            {t("Check the file checksum", "फ़ाइल का चेकसम देखें")}
          </summary>
          <code>SHA-256: {release.sha256}</code>
        </details>
      )}
    </div>
  );
}
