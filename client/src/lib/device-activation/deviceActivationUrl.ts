/** Canonical device activation entry path (DEVICE-PROVISIONING-UX-2). */
export const DEVICE_ACTIVATION_PATH = "/device";

const PRODUCTION_DEVICE_ACTIVATION_URL = "https://www.mineuqr.com/device";

/** Operator-facing activation URL shown during provisioning. */
export function getDeviceActivationUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return `${window.location.origin}${DEVICE_ACTIVATION_PATH}`;
    }
  }
  return PRODUCTION_DEVICE_ACTIVATION_URL;
}
