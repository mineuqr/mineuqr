/** RUNTIME-BOOTSTRAP-CONTRACT-1 — diagnostic fingerprint (never used for auth). */

export type OperationalScreenRuntimeFingerprint = {
  schemaVersion: 1;
  appVersion: string;
  runtime: "operational-screen-web";
  platform: "web";
  userAgent: string;
  browser: string;
  viewport: { width: number; height: number };
  screen: { width: number; height: number; pixelRatio: number };
  orientation: "portrait" | "landscape";
  browserLocale: string;
  capabilities: {
    touch: boolean;
    fullscreen: boolean;
    serviceWorker: boolean;
    camera: boolean;
  };
  bootstrapId: string;
  collectedAt: string;
};

function detectBrowser(userAgent: string): string {
  if (userAgent.includes("Edg/")) return "edge";
  if (userAgent.includes("Chrome/")) return "chrome";
  if (userAgent.includes("Firefox/")) return "firefox";
  if (userAgent.includes("Safari/")) return "safari";
  return "unknown";
}

export function collectRuntimeFingerprint(bootstrapId: string): OperationalScreenRuntimeFingerprint {
  const viewport = {
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  };
  const screenDims = {
    width: typeof window !== "undefined" ? window.screen.width : 0,
    height: typeof window !== "undefined" ? window.screen.height : 0,
    pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
  };
  const userAgent =
    typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 256) : "";

  return {
    schemaVersion: 1,
    appVersion: import.meta.env.VITE_APP_VERSION ?? "web",
    runtime: "operational-screen-web",
    platform: "web",
    userAgent,
    browser: detectBrowser(userAgent),
    viewport,
    screen: screenDims,
    orientation: viewport.width >= viewport.height ? "landscape" : "portrait",
    browserLocale: typeof navigator !== "undefined" ? navigator.language : "unknown",
    capabilities: {
      touch: typeof window !== "undefined" && "ontouchstart" in window,
      fullscreen: typeof document !== "undefined" && document.fullscreenEnabled === true,
      serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
      camera:
        typeof navigator !== "undefined" &&
        !!navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function",
    },
    bootstrapId,
    collectedAt: new Date().toISOString(),
  };
}
