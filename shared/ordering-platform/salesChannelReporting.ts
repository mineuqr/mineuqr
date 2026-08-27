/**
 * ORDERING-CHANNEL-GOVERNANCE-1 / REPORTING-SALES-CHANNEL-ANALYTICS-1
 *
 * Sales channel reporting vocabulary — derived from Ordering Channel Registry.
 * Reporting MUST consume OrderingChannelId only (no identityScope inference).
 * Live Table QR (`qr`, including sessioned table guests) maps to reporting id `qr`,
 * not the unused `table_session` → `table` bucket.
 */

import {
  mapOrderingChannelToSalesChannel,
  orderingChannelDisplayName,
  reportingSalesChannelLabel as registryReportingLabel,
  reportingVisibleSalesChannelIds,
  resolveReportingSalesChannel,
  REPORTING_SALES_CHANNEL_UNASSIGNED,
  isRegisteredOrderingChannelId,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_MOBILE,
  ORDERING_CHANNEL_WAITER_TABLET,
  type OrderingChannelId,
} from "./orderingChannelRegistry";

/** @deprecated Prefer registry — kept for existing imports. */
export const REPORTING_SALES_CHANNEL_TABLE = "table" as const;
export const REPORTING_SALES_CHANNEL_WAITER = "waiter" as const;
export const REPORTING_SALES_CHANNEL_QR = "qr" as const;
export const REPORTING_SALES_CHANNEL_KIOSK = "kiosk" as const;
export const REPORTING_SALES_CHANNEL_MOBILE = "mobile" as const;

export const REPORTING_SALES_CHANNEL_CATALOG = reportingVisibleSalesChannelIds();

export type ReportingSalesChannelId =
  | (typeof REPORTING_SALES_CHANNEL_TABLE)
  | (typeof REPORTING_SALES_CHANNEL_WAITER)
  | (typeof REPORTING_SALES_CHANNEL_QR)
  | (typeof REPORTING_SALES_CHANNEL_KIOSK)
  | (typeof REPORTING_SALES_CHANNEL_MOBILE)
  | typeof REPORTING_SALES_CHANNEL_UNASSIGNED
  | (string & {});

/** @deprecated Use registry display names. */
export const REPORTING_SALES_CHANNEL_LABELS = Object.freeze({
  en: {
    table: "Table Sessions",
    waiter: "Waiter Orders",
    qr: "QR Ordering",
    kiosk: "Self Ordering Kiosk",
    mobile: "Mobile Ordering",
    unassigned: "Unassigned",
  },
  ar: {
    table: "جلسات الطاولات",
    waiter: "طلبات الويتر",
    qr: "الطلب عبر QR",
    kiosk: "كيوسك الطلب الذاتي",
    mobile: "الطلب عبر الجوال",
    unassigned: "غير معيّن",
  },
} as const);

export const isKnownOrderingChannelId = isRegisteredOrderingChannelId;

export {
  mapOrderingChannelToSalesChannel,
  resolveReportingSalesChannel,
  REPORTING_SALES_CHANNEL_UNASSIGNED,
  ORDERING_CHANNEL_TABLE_SESSION,
  ORDERING_CHANNEL_QR,
  ORDERING_CHANNEL_KIOSK,
  ORDERING_CHANNEL_MOBILE,
  ORDERING_CHANNEL_WAITER_TABLET,
  type OrderingChannelId,
};

export function reportingSalesChannelLabel(
  channelId: string,
  language: "en" | "ar"
): string {
  const fromRegistry = registryReportingLabel(channelId, language);
  if (fromRegistry !== channelId) return fromRegistry;
  const map = REPORTING_SALES_CHANNEL_LABELS[language] as Record<string, string>;
  return map[channelId] ?? orderingChannelDisplayName(channelId, language);
}
