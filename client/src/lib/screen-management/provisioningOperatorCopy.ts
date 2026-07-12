import type {
  ProvisioningActivationState,
  ProvisioningPairingState,
  ProvisioningStatus,
} from "@/lib/screen-provisioning/provisioningSessionContract";

/** SCREEN-MANAGEMENT-UX-1D — operator-facing provisioning copy (presentation only). */

const STATUS_LABELS: Record<ProvisioningStatus, { en: string; ar: string }> = {
  created: { en: "Ready to set up", ar: "جاهزة للإعداد" },
  credentials_ready: { en: "Ready to connect", ar: "جاهزة للاتصال" },
  waiting_for_pairing: { en: "Waiting for connection", ar: "في انتظار الاتصال" },
  pairing: { en: "Connecting", ar: "جاري الاتصال" },
  connected: { en: "Connected", ar: "متصل" },
  activating: { en: "Starting up", ar: "جاري التشغيل" },
  operational: { en: "Online", ar: "متصل" },
  expired: { en: "Setup expired", ar: "انتهت جلسة الإعداد" },
  cancelled: { en: "Cancelled", ar: "ملغاة" },
  failed: { en: "Setup failed", ar: "فشل الإعداد" },
};

const PAIRING_LABELS: Record<ProvisioningPairingState, { en: string; ar: string }> = {
  unpaired: { en: "Not connected", ar: "غير متصل" },
  pairing: { en: "Connecting", ar: "جاري الاتصال" },
  paired: { en: "Connected", ar: "متصل" },
  revoked: { en: "Access removed", ar: "تم إلغاء الوصول" },
  unknown: { en: "Unknown", ar: "غير معروف" },
};

const ACTIVATION_LABELS: Record<ProvisioningActivationState, { en: string; ar: string }> = {
  pending: { en: "Waiting", ar: "في الانتظار" },
  loading_configuration: { en: "Loading settings", ar: "تحميل الإعدادات" },
  loading_capabilities: { en: "Preparing screen", ar: "تحضير الشاشة" },
  loading_runtime: { en: "Starting screen", ar: "تشغيل الشاشة" },
  operational: { en: "Online", ar: "متصل" },
  blocked: { en: "Needs attention", ar: "يحتاج انتباه" },
  failed: { en: "Failed", ar: "فشل" },
};

export function provisioningStatusLabel(status: ProvisioningStatus, language: string): string {
  const isAr = language === "ar";
  const label = STATUS_LABELS[status];
  return label ? (isAr ? label.ar : label.en) : status;
}

export function provisioningPairingStateLabel(state: ProvisioningPairingState, language: string): string {
  const isAr = language === "ar";
  const label = PAIRING_LABELS[state];
  return label ? (isAr ? label.ar : label.en) : state;
}

export function provisioningActivationStateLabel(
  state: ProvisioningActivationState,
  language: string
): string {
  const isAr = language === "ar";
  const label = ACTIVATION_LABELS[state];
  return label ? (isAr ? label.ar : label.en) : state;
}

export function regenerateCredentialConfirmationCopy(language: string): {
  title: string;
  body: string;
  confirm: string;
  cancel: string;
} {
  const isAr = language === "ar";
  return {
    title: isAr ? "إعادة توليد الاعتماد؟" : "Regenerate Credential?",
    body: isAr
      ? "سيُلغى الوصول الحالي على أي جهاز فتح هذه الشاشة. افتح الشاشة من جديد على كل جهاز باستخدام QR أو رابط الإعداد الجديد."
      : "Current access will be cancelled on any device that already opened this screen. Open the screen again on each device using the new QR code or setup link.",
    confirm: isAr ? "إعادة توليد الاعتماد" : "Regenerate Credential",
    cancel: isAr ? "إلغاء" : "Cancel",
  };
}
