/**
 * BACKGROUND-NOTIFICATIONS-1A — shared READY push notification copy (Arabic-first).
 */

export type ReadyPushLanguage = "ar" | "en";

export type ReadyPushCopy = {
  title: string;
  body: string;
  language: ReadyPushLanguage;
};

export function buildReadyPushCopy(
  orderNumber: string,
  language: ReadyPushLanguage = "ar"
): ReadyPushCopy {
  return {
    title: language === "ar" ? "طلبك جاهز" : "Your order is ready",
    body: orderNumber,
    language,
  };
}

export function buildReadyPushUrl(slug: string, trackingToken: string): string {
  return `/menu/${encodeURIComponent(slug)}/order/${encodeURIComponent(trackingToken)}`;
}
