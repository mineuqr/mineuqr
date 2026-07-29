import { useEffect } from "react";
import { activeOrderListStructuralSharing } from "@/lib/read-freshness/queryStructuralSharing";

/** Single dashboard order poll interval (was 5s / 10s / 15s). */
export const DASHBOARD_ORDER_LIST_POLL_MS = 10_000;

/**
 * ORDER-LIFECYCLE-LATENCY-REMEDIATION-1 — Mode A fallback for active lifecycle lists.
 * Cross-device observers; BroadcastChannel covers same-origin tabs faster.
 *
 * REALTIME-ORDERS-ADOPTION-1 — when realtime is live, poll becomes recovery cadence.
 */
export const OPERATIONAL_LIFECYCLE_POLL_MS = 3_000;

/** Recovery poll while Orders realtime connection is live (primary = SSE). */
export const OPERATIONAL_LIFECYCLE_REALTIME_RECOVERY_POLL_MS = 15_000;

/**
 * Customer order status page (PR-CUX-1B).
 * ORDER-STATE-PROPAGATION-REMEDIATION-1 — tightened from 8s (write-model poll;
 * independent of operational projection freshness governance).
 *
 * REALTIME-CUSTOMER-TRACKING-ADOPTION-1 — when realtime is live, poll is recovery.
 */
export const CUSTOMER_ORDER_STATUS_POLL_MS = 3_000;

/** Recovery poll while Customer Tracking realtime connection is live. */
export const CUSTOMER_ORDER_STATUS_REALTIME_RECOVERY_POLL_MS = 15_000;

export function customerOrderStatusQueryOptions(
  enabled: boolean,
  status?: string | null,
  options?: { realtimePrimary?: boolean }
) {
  const terminal = status === "served" || status === "cancelled";
  const pollMs = options?.realtimePrimary
    ? CUSTOMER_ORDER_STATUS_REALTIME_RECOVERY_POLL_MS
    : CUSTOMER_ORDER_STATUS_POLL_MS;
  return {
    enabled,
    refetchInterval:
      enabled && !terminal ? pollMs : false,
  } as const;
}

/** Single notification poll on dashboard (OrderAlertSystem). */
export const DASHBOARD_NOTIFICATION_POLL_MS = 10_000;

export function opsOverviewQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function opsActiveTablesBoardQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function opsActionCenterQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function opsActivityFeedQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function reportingBusinessSummaryQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function reportingBusinessTrendQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function reportingOperationalSnapshotQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function reportingOrderSalesQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function orderListQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function printWorkspaceListQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function orderReadListQueryOptions(
  enabled: boolean,
  options?: { realtimePrimary?: boolean }
) {
  const pollMs = options?.realtimePrimary
    ? OPERATIONAL_LIFECYCLE_REALTIME_RECOVERY_POLL_MS
    : OPERATIONAL_LIFECYCLE_POLL_MS;
  return {
    enabled,
    refetchInterval: enabled ? pollMs : false,
    staleTime: 0,
    structuralSharing: activeOrderListStructuralSharing,
  } as const;
}

/** Home snapshot: fetch once per visit, no 10s poll — reduces load vs full order.list polling (H-03). */
export function homeSnapshotOrderQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: false,
    staleTime: 120_000,
  } as const;
}

export function adminQueriesEnabled(
  authPending: boolean,
  isAuthenticated: boolean,
  isAdmin: boolean
): boolean {
  return !authPending && isAuthenticated && isAdmin;
}

export function restaurantQueriesEnabled(
  authPending: boolean,
  isAuthenticated: boolean,
  restaurantId: number
): boolean {
  return !authPending && isAuthenticated && restaurantId > 0;
}

const devPollRegistry = new Map<string, number>();

function devRegisterPoll(key: string, intervalMs: number) {
  if (!import.meta.env.DEV) return;
  const prev = devPollRegistry.get(key);
  if (prev !== undefined && prev !== intervalMs) {
    console.warn(
      `[QueryRuntime] duplicate poll registration for ${key}: ${prev}ms vs ${intervalMs}ms`
    );
  }
  devPollRegistry.set(key, intervalMs);
}

/** DEV-only: log protected query gating mistakes and duplicate pollers. */
export function useDevQueryRuntimeLog(
  procedure: string,
  opts: {
    enabled: boolean;
    authPending: boolean;
    isAuthenticated: boolean;
    pollMs?: number;
  }
) {
  useEffect(() => {
    if (!import.meta.env.DEV) return;

    if (opts.authPending && opts.enabled) {
      console.warn(
        `[QueryRuntime] ${procedure} query enabled while auth.me is still pending`
      );
    }

    if (!opts.authPending && opts.enabled && !opts.isAuthenticated) {
      console.warn(
        `[QueryRuntime] ${procedure} query enabled without authenticated session`
      );
    }

    if (opts.pollMs && opts.enabled) {
      devRegisterPoll(procedure, opts.pollMs);
    }
  }, [procedure, opts.enabled, opts.authPending, opts.isAuthenticated, opts.pollMs]);
}
