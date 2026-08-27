/**
 * ORDERING-CHANNEL-GOVERNANCE-1 / CHANNEL-TAXONOMY-CLEANUP-1
 *
 * OrderingChannelId answers: how did this Order enter the operational system?
 * It does not answer how it was paid (Cashier Confirm → Collection Fact → PAID).
 * Session/table/fulfilment/actor are other dimensions — not this stamp.
 *
 * Live Place writers: qr, waiter_tablet, kiosk, cashier_pos.
 * table_session is registered for compatibility/eligibility lists only — no Place writer.
 * Reserved (no Place writer): mobile, marketplace, delivery_partner, call_center.
 *
 * Reporting maps from this registry only — never from identityScope / UI / payments.
 */

export const ORDERING_CHANNEL_TABLE_SESSION = "table_session" as const;
export const ORDERING_CHANNEL_QR = "qr" as const;
export const ORDERING_CHANNEL_KIOSK = "kiosk" as const;
export const ORDERING_CHANNEL_MOBILE = "mobile" as const;
export const ORDERING_CHANNEL_WAITER_TABLET = "waiter_tablet" as const;
export const ORDERING_CHANNEL_MARKETPLACE = "marketplace" as const;
export const ORDERING_CHANNEL_DELIVERY_PARTNER = "delivery_partner" as const;
export const ORDERING_CHANNEL_CALL_CENTER = "call_center" as const;
export const ORDERING_CHANNEL_CASHIER_POS = "cashier_pos" as const;

export type OrderingChannelId =
  | typeof ORDERING_CHANNEL_TABLE_SESSION
  | typeof ORDERING_CHANNEL_QR
  | typeof ORDERING_CHANNEL_KIOSK
  | typeof ORDERING_CHANNEL_MOBILE
  | typeof ORDERING_CHANNEL_WAITER_TABLET
  | typeof ORDERING_CHANNEL_MARKETPLACE
  | typeof ORDERING_CHANNEL_DELIVERY_PARTNER
  | typeof ORDERING_CHANNEL_CALL_CENTER
  | typeof ORDERING_CHANNEL_CASHIER_POS;

export type OrderingChannelLifecycle = "active" | "registered";

/**
 * Reporting product vocabulary id (Sales Channel Analytics buckets).
 * Distinct from OrderingChannelId when product naming differs (e.g. waiter_tablet → waiter).
 */
export type ReportingSalesChannelId = string;

export type OrderingChannelOrderingBehavior =
  | "guest_self_service"
  | "staff_assisted"
  | "partner"
  | "voice"
  | "unspecified";

export type OrderingChannelRegistryEntry = Readonly<{
  id: OrderingChannelId;
  lifecycle: OrderingChannelLifecycle;
  displayName: Readonly<{ en: string; ar: string }>;
  reportingSalesChannelId: ReportingSalesChannelId;
  /** When true, appears in Sales Channel Analytics catalog zeros. */
  reportingVisible: boolean;
  orderingBehavior: OrderingChannelOrderingBehavior;
}>;

/**
 * Central registry — display names, reporting visibility, lifecycle.
 * Do not hardcode channel labels elsewhere.
 */
export const ORDERING_CHANNEL_REGISTRY = [
  {
    id: ORDERING_CHANNEL_TABLE_SESSION,
    /** No production Place writer. Table guest QR stamps `qr` + optional sessionId. */
    lifecycle: "registered",
    displayName: { en: "Table Sessions", ar: "جلسات الطاولات" },
    reportingSalesChannelId: "table",
    reportingVisible: true,
    orderingBehavior: "guest_self_service",
  },
  {
    id: ORDERING_CHANNEL_WAITER_TABLET,
    lifecycle: "active",
    displayName: { en: "Waiter Orders", ar: "طلبات الويتر" },
    reportingSalesChannelId: "waiter",
    reportingVisible: true,
    orderingBehavior: "staff_assisted",
  },
  {
    id: ORDERING_CHANNEL_QR,
    lifecycle: "active",
    displayName: { en: "QR Ordering", ar: "الطلب عبر QR" },
    reportingSalesChannelId: "qr",
    reportingVisible: true,
    orderingBehavior: "guest_self_service",
  },
  {
    id: ORDERING_CHANNEL_KIOSK,
    lifecycle: "active",
    displayName: { en: "Self Ordering Kiosk", ar: "كيوسك الطلب الذاتي" },
    reportingSalesChannelId: "kiosk",
    reportingVisible: true,
    orderingBehavior: "guest_self_service",
  },
  {
    id: ORDERING_CHANNEL_MOBILE,
    lifecycle: "registered",
    displayName: { en: "Mobile App", ar: "تطبيق الجوال" },
    reportingSalesChannelId: "mobile",
    reportingVisible: true,
    orderingBehavior: "guest_self_service",
  },
  {
    id: ORDERING_CHANNEL_MARKETPLACE,
    lifecycle: "registered",
    displayName: { en: "Marketplace", ar: "السوق" },
    reportingSalesChannelId: "marketplace",
    reportingVisible: false,
    orderingBehavior: "partner",
  },
  {
    id: ORDERING_CHANNEL_DELIVERY_PARTNER,
    lifecycle: "registered",
    displayName: { en: "Delivery Partners", ar: "شركاء التوصيل" },
    reportingSalesChannelId: "delivery_partner",
    reportingVisible: false,
    orderingBehavior: "partner",
  },
  {
    id: ORDERING_CHANNEL_CALL_CENTER,
    lifecycle: "registered",
    displayName: { en: "Call Center", ar: "مركز الاتصال" },
    reportingSalesChannelId: "call_center",
    reportingVisible: false,
    orderingBehavior: "voice",
  },
  {
    id: ORDERING_CHANNEL_CASHIER_POS,
    /** Live POS sale writer. Entry channel only — not Collection Fact / PAID. */
    lifecycle: "active",
    displayName: { en: "Cashier POS", ar: "نقطة البيع" },
    reportingSalesChannelId: "cashier_pos",
    reportingVisible: false,
    orderingBehavior: "staff_assisted",
  },
] as const satisfies readonly OrderingChannelRegistryEntry[];

export const ORDERING_CHANNEL_IDS = ORDERING_CHANNEL_REGISTRY.map(
  (e) => e.id
) as unknown as readonly [
  OrderingChannelId,
  ...OrderingChannelId[],
];

const BY_ID = new Map<string, OrderingChannelRegistryEntry>(
  ORDERING_CHANNEL_REGISTRY.map((e) => [e.id, e])
);

/** Explicit missing-stamp bucket — NOT an inferred channel. */
export const REPORTING_SALES_CHANNEL_UNASSIGNED = "unassigned" as const;

export function isRegisteredOrderingChannelId(
  value: string | null | undefined
): value is OrderingChannelId {
  return typeof value === "string" && BY_ID.has(value.trim());
}

export function getOrderingChannelRegistryEntry(
  id: string | null | undefined
): OrderingChannelRegistryEntry | null {
  if (!id) return null;
  return BY_ID.get(id.trim()) ?? null;
}

export function orderingChannelDisplayName(
  id: string,
  language: "en" | "ar"
): string {
  const entry = getOrderingChannelRegistryEntry(id);
  if (entry) return entry.displayName[language];
  return id;
}

/** Reporting catalog zeros — channels with reportingVisible. */
export function reportingVisibleSalesChannelIds(): readonly string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of ORDERING_CHANNEL_REGISTRY) {
    if (!entry.reportingVisible) continue;
    if (seen.has(entry.reportingSalesChannelId)) continue;
    seen.add(entry.reportingSalesChannelId);
    ids.push(entry.reportingSalesChannelId);
  }
  return ids;
}

/**
 * Map OrderingChannelId → reporting sales channel id.
 * Unknown non-empty stamps pass through (extensibility without redesign).
 * Null/empty → unassigned (no inference).
 */
export function mapOrderingChannelToSalesChannel(
  orderingChannel: string | null | undefined
): string {
  if (!orderingChannel) return REPORTING_SALES_CHANNEL_UNASSIGNED;
  const trimmed = orderingChannel.trim();
  if (!trimmed) return REPORTING_SALES_CHANNEL_UNASSIGNED;
  const entry = getOrderingChannelRegistryEntry(trimmed);
  if (entry) return entry.reportingSalesChannelId;
  return trimmed;
}

/**
 * Reporting resolution — OrderingChannelId only.
 * identityScope MUST NOT be used (ORDERING-CHANNEL-GOVERNANCE-1).
 */
export function resolveReportingSalesChannel(input: {
  orderingChannel?: string | null;
  /** @deprecated Ignored — legacy parameter retained only for call-site migration safety. */
  identityScope?: string | null;
}): string {
  void input.identityScope;
  return mapOrderingChannelToSalesChannel(input.orderingChannel);
}

export function reportingSalesChannelLabel(
  channelId: string,
  language: "en" | "ar"
): string {
  if (channelId === REPORTING_SALES_CHANNEL_UNASSIGNED) {
    return language === "ar" ? "غير معيّن" : "Unassigned";
  }
  for (const entry of ORDERING_CHANNEL_REGISTRY) {
    if (entry.reportingSalesChannelId === channelId) {
      return entry.displayName[language];
    }
  }
  return channelId;
}

export function assertOrderingChannelId(
  value: string | null | undefined
): OrderingChannelId {
  if (!isRegisteredOrderingChannelId(value)) {
    throw new Error(
      `ORDERING-CHANNEL-GOVERNANCE-1: OrderingChannelId required before persistence (got ${String(value)})`
    );
  }
  return value;
}
