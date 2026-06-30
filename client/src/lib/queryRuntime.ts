import { useEffect } from "react";

/** Single dashboard order poll interval (was 5s / 10s / 15s). */
export const DASHBOARD_ORDER_LIST_POLL_MS = 10_000;

/** Customer order status page (PR-CUX-1B). */
export const CUSTOMER_ORDER_STATUS_POLL_MS = 8_000;

export function customerOrderStatusQueryOptions(
  enabled: boolean,
  status?: string | null
) {
  const terminal = status === "served" || status === "cancelled";
  return {
    enabled,
    refetchInterval:
      enabled && !terminal ? CUSTOMER_ORDER_STATUS_POLL_MS : false,
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

export function opsSettlementSummaryQueryOptions(enabled: boolean) {
  return {
    enabled,
    refetchInterval: enabled ? DASHBOARD_ORDER_LIST_POLL_MS : false,
  } as const;
}

export function opsSettlementTrendQueryOptions(enabled: boolean) {
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
