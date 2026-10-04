import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "org.sajag.app",
  appName: "Sajag",
  // The sync script supplies a filtered local staging directory for its child
  // process only; deployed APK downloads must never become native app assets.
  webDir: process.env.SAJAG_NATIVE_WEB_DIR || "dist",
  loggingBehavior: "none",
  backgroundColor: "#f5f5fb",
  server: { androidScheme: "https" },
  ios: { contentInset: "automatic" },
  plugins: {
    SystemBars: {
      style: "LIGHT",
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};
export default config;
