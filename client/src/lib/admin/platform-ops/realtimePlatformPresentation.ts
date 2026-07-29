/**
 * REALTIME-PRODUCTION-ENABLEMENT-1
 * Presentation mapping — disabled-by-config ≠ gateway unavailable.
 * Does not change observability collectors or health ownership SSOT.
 */

export type RealtimePlatformPresentationState =
  | "healthy"
  | "degraded"
  | "disabled_by_configuration"
  | "unavailable"
  | "unknown";

export type RealtimePresentedAlert = {
  id: string;
  severity: "info" | "success" | "warning" | "critical";
  title: string;
  detail: string;
};

type AlertLike = {
  id: string;
  severity: string;
  title: string;
  detail: string;
};

export function resolveRealtimePlatformPresentationState(input: {
  platformEnabled: boolean;
  overallHealth: string;
}): RealtimePlatformPresentationState {
  if (!input.platformEnabled) return "disabled_by_configuration";
  const h = input.overallHealth.toLowerCase();
  if (h === "healthy") return "healthy";
  if (h === "warning" || h === "degraded") return "degraded";
  if (h === "unavailable") return "unavailable";
  return "unknown";
}

/** Map presentation state → Platform Ops status badge status. */
export function mapRealtimePresentationToOpsHealth(
  state: RealtimePlatformPresentationState
): "healthy" | "warning" | "degraded" | "unavailable" | "unknown" {
  switch (state) {
    case "healthy":
      return "healthy";
    case "degraded":
      return "degraded";
    case "disabled_by_configuration":
      return "unknown";
    case "unavailable":
      return "unavailable";
    default:
      return "unknown";
  }
}

/**
 * Present alerts with explicit disabled semantics.
 * Filters/rewrites misleading gateway_unavailable + platform_disabled pairs.
 */
export function presentRealtimeOpsAlerts(
  alerts: readonly AlertLike[],
  platformEnabled: boolean
): RealtimePresentedAlert[] {
  const out: RealtimePresentedAlert[] = [];

  if (!platformEnabled) {
    out.push({
      id: "platform_disabled",
      severity: "info",
      title: "Realtime Platform Disabled",
      detail: "platform_disabled",
    });
  }

  for (const alert of alerts) {
    if (!platformEnabled) {
      // Drop critical gateway noise when intentionally disabled.
      if (
        alert.id === "gateway_unavailable" ||
        alert.detail === "platform_disabled" ||
        alert.id === "platform_disabled"
      ) {
        continue;
      }
    }

    if (
      platformEnabled &&
      (alert.id === "gateway_unavailable" || alert.detail === "gateway_shutdown")
    ) {
      out.push({
        id: "gateway_unavailable",
        severity: "critical",
        title: "Realtime Gateway Unavailable",
        detail: "gateway_shutdown",
      });
      continue;
    }

    const severity =
      alert.severity === "critical" ||
      alert.severity === "warning" ||
      alert.severity === "info" ||
      alert.severity === "success"
        ? alert.severity
        : "info";

    out.push({
      id: alert.id,
      severity,
      title: alert.title,
      detail: alert.detail,
    });
  }

  return out;
}
