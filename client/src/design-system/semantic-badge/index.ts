/**
 * SEMANTIC-STATUS-BADGE-SYSTEM-1
 * Official MineuQR Semantic Status Badge System — public barrel.
 *
 * Tone colors: SEMANTIC_TONE (semantic-card) via badgeTone registry
 * Domain meanings: platform owners (orders, sessions, settlement, …)
 * This package: badge chrome + status→tone maps only
 */
export {
  SEMANTIC_BADGE_TONES,
  resolveBadgeBaseTone,
  semanticBadgeToneClass,
  semanticBadgeDotClass,
  semanticBadgeHoverClass,
  type SemanticBadgeTone,
  type SemanticBadgeDensity,
} from "./tokens/badgeTone";

export {
  SEMANTIC_BADGE_BASE,
  SEMANTIC_BADGE_FOCUS,
  semanticBadgeSizeClass,
  semanticBadgeShell,
  type SemanticBadgeSize,
} from "./tokens/badgeSurface";

export {
  SemanticBadge,
  StatusBadge,
  OutlineBadge,
  CompactBadge,
  DotBadge,
  IconBadge,
  CountBadge,
  InteractiveBadge,
  type SemanticBadgeProps,
} from "./components/SemanticBadge";

export {
  mapOrderStatusToBadgeTone,
  mapTableSessionStatusToBadgeTone,
  mapHealthToneToBadgeTone,
  mapSecurityHealthToBadgeTone,
  mapFleetStatusToBadgeTone,
  mapRegisterDutyToBadgeTone,
  mapRegisterAvailabilityToBadgeTone,
  mapRegisterShiftToBadgeTone,
  mapCommercialStatusToBadgeTone,
  mapOfferTypeToBadgeTone,
  mapInvoiceStatusToBadgeTone,
  mapAuditSeverityToBadgeTone,
  mapSettlementStatusToBadgeTone,
  mapGateStatusToBadgeTone,
} from "./mappers/statusToneMappers";
