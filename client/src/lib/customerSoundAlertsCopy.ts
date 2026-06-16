/**
 * AUDIO-ENABLE-UX-1 — customer-facing sound-alert enable copy (not push/notifications).
 */

type Lang = "ar" | "en";

export function getSoundAlertsEnableCtaLabel(language: Lang): string {
  return language === "ar" ? "🔔 تفعيل التنبيهات الصوتية" : "🔔 Enable sound alerts";
}

export function getSoundAlertsEnableActivatingLabel(language: Lang): string {
  return language === "ar" ? "جاري التفعيل..." : "Enabling...";
}

export function getSoundAlertsEnableSuccessLabel(language: Lang): string {
  return language === "ar"
    ? "✅ تم تفعيل التنبيهات الصوتية"
    : "✅ Sound alerts enabled";
}
