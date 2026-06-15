/**
 * CUSTOMER-UX-1D — customer-facing notification enrollment copy.
 * Technical strings remain in pushSubscriptionState (diagnostics / pushTrace).
 */

import type { PushSubscriptionState } from "@/lib/pushSubscriptionState";

type Lang = "ar" | "en";

export function getEnrollmentBenefitHeadline(language: Lang): string {
  return language === "ar"
    ? "هل تريد معرفة متى يصبح طلبك جاهزاً؟"
    : "Want to know when your order is ready?";
}

export function getEnrollmentBenefitBody(language: Lang): string {
  return language === "ar"
    ? "يمكننا إرسال إشعار إلى هاتفك فور جهوزية طلبك."
    : "We can send a notification to your phone as soon as your order is ready.";
}

export function getEnrollmentCtaLabel(language: Lang, isRetry: boolean): string {
  if (isRetry) {
    return language === "ar" ? "حاول مرة أخرى" : "Try again";
  }
  return language === "ar" ? "تفعيل الإشعارات" : "Enable Notifications";
}

export function getEnrollmentActivatingLabel(language: Lang): string {
  return language === "ar" ? "جاري تفعيل الإشعارات..." : "Enabling notifications...";
}

export function getEnrollmentSuccessTitle(language: Lang): string {
  return language === "ar" ? "تم تفعيل الإشعارات" : "Notifications enabled";
}

export function getEnrollmentSuccessBody(language: Lang): string {
  return language === "ar"
    ? "سنُعلمك عندما يصبح طلبك جاهزاً."
    : "We'll notify you when your order is ready.";
}

export function getEnrollmentPermissionDeniedTitle(language: Lang): string {
  return language === "ar"
    ? "الإشعارات محظورة حالياً."
    : "Notifications are currently blocked.";
}

export function getEnrollmentPermissionDeniedBody(language: Lang): string {
  return language === "ar"
    ? "يرجى السماح بالإشعارات ثم المحاولة مرة أخرى."
    : "Please allow notifications and try again.";
}

export function getEnrollmentIosStepsIntro(language: Lang): string {
  return language === "ar"
    ? "لتلقي الإشعارات على iPhone:"
    : "To receive notifications on iPhone:";
}

export function getEnrollmentIosSteps(language: Lang): string[] {
  if (language === "ar") {
    return [
      "اضغط مشاركة",
      "أضف MineuQR إلى الشاشة الرئيسية",
      "افتح MineuQR من الشاشة الرئيسية",
      "فعّل الإشعارات",
    ];
  }
  return [
    "Tap Share",
    "Add MineuQR to Home Screen",
    "Open MineuQR from Home Screen",
    "Enable notifications",
  ];
}

export function getEnrollmentGenericFailureBody(language: Lang): string {
  return language === "ar"
    ? "تعذّر تفعيل الإشعارات. يمكنك متابعة تتبع طلبك هنا."
    : "We couldn't enable notifications. You can still track your order here.";
}

export function getEnrollmentUnsupportedBody(language: Lang): string {
  return language === "ar"
    ? "لا يمكن تفعيل الإشعارات على هذا المتصفح. يمكنك متابعة تتبع طلبك على هذه الصفحة."
    : "Notifications aren't available in this browser. You can still track your order on this page.";
}

/** True when we show the benefit-first prompt (no technical details). */
export function shouldShowEnrollmentBenefitPrompt(
  state: PushSubscriptionState,
  activationAttempted: boolean
): boolean {
  if (activationAttempted) return false;
  return (
    state === "PERMISSION_REQUIRED" ||
    state === "NOT_SUPPORTED" ||
    state === "PERMISSION_DENIED"
  );
}

export function shouldShowIosInstallSteps(
  state: PushSubscriptionState,
  activationAttempted: boolean,
  isIosWithoutPush: boolean
): boolean {
  return activationAttempted && state === "NOT_SUPPORTED" && isIosWithoutPush;
}
