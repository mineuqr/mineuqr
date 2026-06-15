/**
 * CUSTOMER-UX-1D — customer-facing notification enrollment copy.
 */

type Lang = "ar" | "en";

export function getEnrollmentCtaLabel(language: Lang): string {
  return language === "ar" ? "تفعيل الإشعارات" : "Enable Notifications";
}

export function getEnrollmentActivatingLabel(language: Lang): string {
  return language === "ar" ? "جاري تفعيل الإشعارات..." : "Enabling notifications...";
}

export function getEnrollmentSuccessTitle(language: Lang): string {
  return language === "ar" ? "تم تفعيل الإشعارات" : "Notifications enabled";
}
