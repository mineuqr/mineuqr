/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Domain → badge tone mappers.
 * Status meanings stay in platform owners; this file only maps to presentation tones.
 */
import type { OrderLifecycleStatus } from "@/lib/orderStatusDisplay";
import type { SemanticBadgeTone } from "../tokens/badgeTone";

/** Order Platform statuses → badge tone */
export function mapOrderStatusToBadgeTone(
  status: OrderLifecycleStatus | string
): SemanticBadgeTone {
  switch (status) {
    case "pending":
      return "pending";
    case "preparing":
      return "processing";
    case "ready":
      return "completed";
    case "served":
      return "archived";
    case "cancelled":
      return "cancelled";
    default:
      return "neutral";
  }
}

/** Operational table / session board presentation statuses */
export function mapTableSessionStatusToBadgeTone(
  status: "open" | "paid" | "complimentary" | "available" | "occupied" | string
): SemanticBadgeTone {
  switch (status) {
    case "open":
    case "occupied":
      return "success";
    case "paid":
      return "info";
    case "complimentary":
      return "accent";
    case "available":
      return "neutral";
    default:
      return "neutral";
  }
}

/** Print / workspace healthTone() → badge tone */
export function mapHealthToneToBadgeTone(
  tone: "ok" | "warn" | "bad" | "muted" | string
): SemanticBadgeTone {
  switch (tone) {
    case "ok":
      return "success";
    case "warn":
      return "warning";
    case "bad":
      return "danger";
    case "muted":
    default:
      return "neutral";
  }
}

/** Security health → badge tone */
export function mapSecurityHealthToBadgeTone(
  status: "healthy" | "warning" | "critical" | string
): SemanticBadgeTone {
  switch (status) {
    case "healthy":
      return "success";
    case "warning":
      return "warning";
    case "critical":
      return "danger";
    default:
      return "neutral";
  }
}

/** Fleet operator status → badge tone */
export function mapFleetStatusToBadgeTone(
  kind: "online" | "offline" | "needs_attention" | "never_seen" | string
): SemanticBadgeTone {
  switch (kind) {
    case "online":
      return "success";
    case "offline":
    case "needs_attention":
      return "warning";
    case "never_seen":
    default:
      return "neutral";
  }
}

/** Register duty presentation tone → badge tone */
export function mapRegisterDutyToBadgeTone(
  tone: "open" | "suspended" | "closed" | string
): SemanticBadgeTone {
  switch (tone) {
    case "open":
      return "success";
    case "suspended":
      return "warning";
    case "closed":
    default:
      return "neutral";
  }
}

export function mapRegisterAvailabilityToBadgeTone(
  tone: "ready" | "unavailable" | string
): SemanticBadgeTone {
  return tone === "ready" ? "info" : "disabled";
}

export function mapRegisterShiftToBadgeTone(
  tone: "active" | "none" | string
): SemanticBadgeTone {
  return tone === "active" ? "accent" : "neutral";
}

/**
 * Commercial subscription presentation states → badge tone.
 * Status determination remains external (commercial platform).
 */
export function mapCommercialStatusToBadgeTone(
  status:
    | "trial"
    | "active"
    | "grace"
    | "suspended"
    | "expired"
    | "canceled"
    | "cancelled"
    | "inactive"
    | string
): SemanticBadgeTone {
  switch (status) {
    case "trial":
      return "info";
    case "active":
      return "success";
    case "grace":
    case "suspended":
      return "warning";
    case "expired":
      return "danger";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "inactive":
    default:
      return "disabled";
  }
}

/** Offer type tags (marketing) → badge tone — not domain lifecycle */
export function mapOfferTypeToBadgeTone(
  type: "daily" | "weekly" | "monthly" | string
): SemanticBadgeTone {
  switch (type) {
    case "daily":
      return "danger";
    case "weekly":
      return "warning";
    case "monthly":
      return "success";
    default:
      return "neutral";
  }
}

/** Invoice / payment history status → badge tone */
export function mapInvoiceStatusToBadgeTone(
  status: "paid" | "pending" | "failed" | "refunded" | string
): SemanticBadgeTone {
  switch (status) {
    case "paid":
      return "success";
    case "pending":
      return "pending";
    case "failed":
    case "refunded":
      return "danger";
    default:
      return "neutral";
  }
}

/** Audit event severity → badge tone */
export function mapAuditSeverityToBadgeTone(
  severity: "error" | "warn" | "info" | string
): SemanticBadgeTone {
  switch (severity) {
    case "error":
      return "danger";
    case "warn":
      return "warning";
    default:
      return "neutral";
  }
}

/** Settlement record status → badge tone */
export function mapSettlementStatusToBadgeTone(
  status: "settled" | "paid" | "refunded" | "complimentary" | "voided" | string
): SemanticBadgeTone {
  switch (status) {
    case "settled":
    case "paid":
      return "success";
    case "refunded":
      return "danger";
    case "complimentary":
      return "accent";
    case "voided":
      return "disabled";
    default:
      return "neutral";
  }
}

/** Commercial gate consolidation status → badge tone */
export function mapGateStatusToBadgeTone(
  status:
    | "MIGRATED"
    | "ACTIVE"
    | "NEEDS_MIGRATION"
    | "REDUNDANT"
    | "KEEP_TEMPORARY"
    | string
): SemanticBadgeTone {
  switch (status) {
    case "MIGRATED":
      return "success";
    case "ACTIVE":
      return "info";
    case "NEEDS_MIGRATION":
      return "danger";
    case "REDUNDANT":
    case "KEEP_TEMPORARY":
    default:
      return "neutral";
  }
}
