/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Realtime Platform admin view — consumes observability APIs only (SSOT).
 * Presentation unified via platform-ops-ui foundation.
 */

import { Activity, AlertTriangle, Radio, RefreshCw, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import {
  mapRealtimePresentationToOpsHealth,
  presentRealtimeOpsAlerts,
  resolveRealtimePlatformPresentationState,
} from "@/lib/admin/platform-ops/realtimePlatformPresentation";
import {
  normalizePlatformOpsHealth,
  PlatformOpsAlert,
  PlatformOpsAlertList,
  PlatformOpsDataTable,
  PlatformOpsEmptyState,
  PlatformOpsErrorState,
  PlatformOpsHeroSummary,
  PlatformOpsLoadingState,
  PlatformOpsMetricCard,
  PlatformOpsMetricGrid,
  PlatformOpsSection,
  PlatformOpsStatusBadge,
  PlatformOpsTableBody,
  PlatformOpsTableCell,
  PlatformOpsTableHead,
  PlatformOpsTableHeader,
  PlatformOpsTableRoot,
  PlatformOpsTableRow,
  PlatformOpsToolbar,
  PLATFORM_OPS_UI,
} from "@/design-system/platform-ops-ui";

function formatMs(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)} ms`;
}

function formatUpdatedAt(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function PlatformOpsRealtimeComposition() {
  const { t } = useLanguage();
  const gate = useAuthGate();
  const enabled = adminQueriesEnabled(
    gate.isPending,
    gate.isAuthenticated,
    gate.isAdmin
  );

  const dashboardQuery = trpc.realtime.observabilityDashboard.useQuery(
    undefined,
    { enabled, refetchInterval: enabled ? 15_000 : false }
  );
  const alertsQuery = trpc.realtime.observabilityAlerts.useQuery(undefined, {
    enabled,
    refetchInterval: enabled ? 15_000 : false,
  });

  const dash = dashboardQuery.data;
  const alerts = alertsQuery.data ?? dash?.alerts ?? [];

  if (dashboardQuery.isLoading) {
    return (
      <PlatformOpsLoadingState
        variant="kpi"
        count={4}
        label={t("admin.platformOps.realtime.loading")}
      />
    );
  }

  if (dashboardQuery.isError || !dash) {
    return (
      <PlatformOpsErrorState
        title={t("admin.platformOps.realtime.loadError")}
        message={t("admin.platformOps.realtime.loadErrorDesc")}
        retryLabel={t("admin.platformOps.realtime.retry")}
        onRetry={() => void dashboardQuery.refetch()}
        isFetching={dashboardQuery.isFetching}
        diagnosticHref="/admin/platform/diagnostics"
        diagnosticLabel={t("admin.platformOps.sections.diagnostics")}
      />
    );
  }

  const latency = dash.latency.publishToDeliver;
  const presentation = resolveRealtimePlatformPresentationState({
    platformEnabled: dash.platform.enabled,
    overallHealth: String(dash.platform.overallHealth),
  });
  const health = mapRealtimePresentationToOpsHealth(presentation);
  const healthLabel =
    presentation === "disabled_by_configuration"
      ? t("admin.platformOps.realtime.stateDisabled")
      : presentation === "unavailable"
        ? t("admin.platformOps.realtime.stateUnavailable")
        : presentation === "degraded"
          ? t("admin.platformOps.realtime.stateDegraded")
          : presentation === "healthy"
            ? t("admin.platformOps.realtime.stateHealthy")
            : String(dash.platform.overallHealth);
  const presentedAlerts = presentRealtimeOpsAlerts(alerts, dash.platform.enabled);
  const updated = formatUpdatedAt(dash.generatedAt);

  const heroDescription =
    presentation === "disabled_by_configuration"
      ? t("admin.platformOps.realtime.disabledDesc")
      : t("admin.platformOps.realtime.overviewDesc");

  return (
    <div className={PLATFORM_OPS_UI.workspace} data-slot="platform-ops-realtime">
      <PlatformOpsToolbar
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={dashboardQuery.isFetching}
            onClick={() => {
              void dashboardQuery.refetch();
              void alertsQuery.refetch();
            }}
          >
            <RefreshCw
              className={
                dashboardQuery.isFetching ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"
              }
              aria-hidden
            />
            {t("admin.platformOps.realtime.retry")}
          </Button>
        }
      />

      <PlatformOpsHeroSummary
        title={
          presentation === "disabled_by_configuration"
            ? t("admin.platformOps.realtime.disabledTitle")
            : t("admin.platformOps.realtime.overview")
        }
        description={heroDescription}
        health={health}
        healthLabel={healthLabel}
        lastUpdated={updated}
        lastUpdatedLabel={t("admin.platformOps.realtime.lastUpdated")}
        columns={4}
        alerts={
          presentedAlerts.length > 0 ? (
            <PlatformOpsAlertList>
              {presentedAlerts.slice(0, 3).map((alert) => (
                <PlatformOpsAlert
                  key={alert.id}
                  severity={alert.severity}
                  title={
                    alert.id === "platform_disabled"
                      ? t("admin.platformOps.realtime.disabledTitle")
                      : alert.id === "gateway_unavailable"
                        ? t("admin.platformOps.realtime.gatewayUnavailableTitle")
                        : alert.title
                  }
                  detail={
                    alert.id === "platform_disabled"
                      ? t("admin.platformOps.realtime.disabledDetail")
                      : alert.id === "gateway_unavailable"
                        ? t("admin.platformOps.realtime.gatewayUnavailableDetail")
                        : alert.detail
                  }
                />
              ))}
            </PlatformOpsAlertList>
          ) : null
        }
      >
        <PlatformOpsMetricCard
          label={t("admin.platformOps.realtime.kpiHealth")}
          value={healthLabel}
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.realtime.kpiEnabled")}
          value={
            dash.platform.enabled
              ? t("admin.platformOps.realtime.yes")
              : t("admin.platformOps.realtime.no")
          }
          tone="info"
          domain="information"
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.realtime.kpiConnections")}
          value={String(dash.connections.active)}
          tone="info"
          domain="analytics"
        />
        <PlatformOpsMetricCard
          label={t("admin.platformOps.realtime.kpiPeak")}
          value={String(dash.connections.peak)}
          tone="info"
          domain="analytics"
        />
      </PlatformOpsHeroSummary>

      <PlatformOpsSection
        title={t("admin.platformOps.realtime.connections")}
        icon={Activity}
      >
        <PlatformOpsMetricGrid columns={4}>
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.opened")}
            value={String(dash.connections.opened)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.closed")}
            value={String(dash.connections.closed)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.rejected")}
            value={String(dash.connections.rejected)}
            tone="warning"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.avgDuration")}
            value={formatMs(dash.connections.avgDurationMs)}
            tone="info"
            domain="analytics"
          />
        </PlatformOpsMetricGrid>
      </PlatformOpsSection>

      <PlatformOpsSection title={t("admin.platformOps.realtime.channels")}>
        <PlatformOpsDataTable
          empty={
            dash.channels.length === 0 ? (
              <PlatformOpsEmptyState
                icon={Radio}
                title={t("admin.platformOps.realtime.noChannels")}
              />
            ) : undefined
          }
        >
          <PlatformOpsTableRoot>
            <PlatformOpsTableHeader>
              <PlatformOpsTableRow>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colChannel")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colSubs")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colPublish")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colDeliver")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colP95")}
                </PlatformOpsTableHead>
              </PlatformOpsTableRow>
            </PlatformOpsTableHeader>
            <PlatformOpsTableBody>
              {dash.channels.map((ch) => (
                <PlatformOpsTableRow key={ch.channel}>
                  <PlatformOpsTableCell>{ch.channel}</PlatformOpsTableCell>
                  <PlatformOpsTableCell>{ch.subscribers}</PlatformOpsTableCell>
                  <PlatformOpsTableCell>{ch.publishes}</PlatformOpsTableCell>
                  <PlatformOpsTableCell>{ch.deliveries}</PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    {formatMs(ch.publishToDeliver.p95)}
                  </PlatformOpsTableCell>
                </PlatformOpsTableRow>
              ))}
            </PlatformOpsTableBody>
          </PlatformOpsTableRoot>
        </PlatformOpsDataTable>
      </PlatformOpsSection>

      <PlatformOpsSection title={t("admin.platformOps.realtime.latency")}>
        <PlatformOpsMetricGrid columns={4}>
          <PlatformOpsMetricCard
            label="P50"
            value={formatMs(latency.p50)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label="P95"
            value={formatMs(latency.p95)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label="P99"
            value={formatMs(latency.p99)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.worst")}
            value={formatMs(latency.worst)}
            tone="warning"
            domain="analytics"
          />
        </PlatformOpsMetricGrid>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.realtime.authorization")}
        icon={Shield}
      >
        <PlatformOpsMetricGrid columns={4}>
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.authSuccess")}
            value={String(dash.authorization.success)}
            tone="success"
            domain="information"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.authDenied")}
            value={String(dash.authorization.denied)}
            tone="warning"
            domain="information"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.ticketsIssued")}
            value={String(dash.authorization.ticketsIssued)}
            tone="info"
            domain="information"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.ticketsRevoked")}
            value={String(dash.authorization.ticketsRevoked)}
            tone="info"
            domain="information"
          />
        </PlatformOpsMetricGrid>
      </PlatformOpsSection>

      <PlatformOpsSection title={t("admin.platformOps.realtime.registry")}>
        <PlatformOpsMetricGrid columns={4}>
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.registrySize")}
            value={String(dash.registry.size)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.registryActive")}
            value={String(dash.registry.active)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.registryLookups")}
            value={String(dash.registry.lookups)}
            tone="info"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.avgLookup")}
            value={`${Math.round(dash.registry.avgLookupMicros)} µs`}
            tone="info"
            domain="analytics"
          />
        </PlatformOpsMetricGrid>
      </PlatformOpsSection>

      <PlatformOpsSection title={t("admin.platformOps.realtime.fallback")}>
        <PlatformOpsMetricGrid columns={2}>
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.fallbackActivations")}
            value={String(dash.fallback.activations)}
            tone="warning"
            domain="analytics"
          />
          <PlatformOpsMetricCard
            label={t("admin.platformOps.realtime.reconnects")}
            value={String(dash.fallback.reconnects)}
            tone="info"
            domain="analytics"
          />
        </PlatformOpsMetricGrid>
      </PlatformOpsSection>

      <PlatformOpsSection
        title={t("admin.platformOps.realtime.alerts")}
        icon={AlertTriangle}
      >
        <PlatformOpsAlertList
          empty={
            <PlatformOpsEmptyState
              icon={AlertTriangle}
              title={t("admin.platformOps.realtime.noAlerts")}
            />
          }
        >
          {presentedAlerts.map((alert) => (
            <PlatformOpsAlert
              key={alert.id}
              severity={alert.severity}
              title={
                alert.id === "platform_disabled"
                  ? t("admin.platformOps.realtime.disabledTitle")
                  : alert.id === "gateway_unavailable"
                    ? t("admin.platformOps.realtime.gatewayUnavailableTitle")
                    : alert.title
              }
              detail={
                alert.id === "platform_disabled"
                  ? t("admin.platformOps.realtime.disabledDetail")
                  : alert.id === "gateway_unavailable"
                    ? t("admin.platformOps.realtime.gatewayUnavailableDetail")
                    : alert.detail
              }
            />
          ))}
        </PlatformOpsAlertList>
      </PlatformOpsSection>

      <PlatformOpsSection title={t("admin.platformOps.realtime.adoption")}>
        <PlatformOpsDataTable>
          <PlatformOpsTableRoot>
            <PlatformOpsTableHeader>
              <PlatformOpsTableRow>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colSurface")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colState")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colSubs")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colHealth")}
                </PlatformOpsTableHead>
                <PlatformOpsTableHead>
                  {t("admin.platformOps.realtime.colP95")}
                </PlatformOpsTableHead>
              </PlatformOpsTableRow>
            </PlatformOpsTableHeader>
            <PlatformOpsTableBody>
              {dash.adoption.map((row) => (
                <PlatformOpsTableRow key={row.surfaceId}>
                  <PlatformOpsTableCell>{row.surfaceId}</PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    {row.migrationState}
                  </PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    {row.activeSubscribers}
                  </PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    <PlatformOpsStatusBadge
                      status={normalizePlatformOpsHealth(row.health)}
                      label={row.health}
                    />
                  </PlatformOpsTableCell>
                  <PlatformOpsTableCell>
                    {formatMs(row.latencyP95Ms)}
                  </PlatformOpsTableCell>
                </PlatformOpsTableRow>
              ))}
            </PlatformOpsTableBody>
          </PlatformOpsTableRoot>
        </PlatformOpsDataTable>
        <p className={`mt-2 ${PLATFORM_OPS_UI.metaText}`}>
          {t("admin.platformOps.realtime.ssotHint")}
        </p>
      </PlatformOpsSection>
    </div>
  );
}
