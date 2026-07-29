/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Shared Platform Operations UI Foundation — public barrel.
 *
 * Facades over MineuQR design-system primitives.
 * Presentation only — no business logic, APIs, permissions, or routing.
 */

export {
  PLATFORM_OPS_HEALTH_STATUSES,
  PLATFORM_OPS_ALERT_SEVERITIES,
  mapPlatformOpsHealthToBadgeTone,
  mapPlatformOpsAlertToBadgeTone,
  normalizePlatformOpsHealth,
  type PlatformOpsHealthStatus,
  type PlatformOpsAlertSeverity,
} from "./status";

export { PLATFORM_OPS_UI, type PlatformOpsHeroColumns } from "./tokens";

export { PlatformOpsStatusBadge } from "./PlatformOpsStatusBadge";
export {
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
} from "./PlatformOpsMetricCard";
export type { PlatformOpsMetricCardProps } from "./PlatformOpsMetricCard";
export { PlatformOpsSection } from "./PlatformOpsSection";
export { PlatformOpsHeroSummary } from "./PlatformOpsHeroSummary";
export { PlatformOpsHeaderMeta } from "./PlatformOpsHeaderMeta";
export {
  PlatformOpsTable,
  PlatformOpsTableFrame,
  PlatformOpsTableScroll,
  PlatformOpsTableDesktop,
  PlatformOpsTableMobile,
  PlatformOpsTableRoot,
  PlatformOpsTableHeader,
  PlatformOpsTableBody,
  PlatformOpsTableRow,
  PlatformOpsTableHead,
  PlatformOpsTableCell,
  PlatformOpsTableActions,
  PlatformOpsTablePagination,
  PlatformOpsTableEmpty,
  PlatformOpsTableLoading,
  PlatformOpsTableError,
  PlatformOpsTableSkeleton,
  PlatformOpsTableStatusCell,
  PlatformOpsDataTable,
} from "./PlatformOpsTable";
export {
  PlatformOpsToolbar,
  PlatformOpsToolbarFilters,
} from "./PlatformOpsToolbar";
export { PlatformOpsAlert, PlatformOpsAlertList } from "./PlatformOpsAlert";
export {
  PlatformOpsEmptyState,
  PlatformOpsLoadingState,
  PlatformOpsRefreshingState,
  PlatformOpsErrorState,
} from "./PlatformOpsStates";
export { PlatformOpsChartFrame } from "./PlatformOpsChartFrame";
export { PlatformOpsModuleTile } from "./PlatformOpsModuleTile";
