/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * Realtime Platform admin view — consumes observability APIs only (SSOT).
 */

import { Activity, AlertTriangle, Radio, Shield } from "lucide-react";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { AdminPageSection } from "@/components/admin/sections/AdminPageSection";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import {
  SemanticKpiCard,
  SEMANTIC_KPI_GRID,
} from "@/design-system/semantic-card";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { adminQueriesEnabled } from "@/lib/queryRuntime";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { cn } from "@/lib/utils";

function formatMs(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)} ms`;
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
      <p className="animate-pulse text-sm text-cyan-300/80">
        {t("admin.platformOps.realtime.loading")}
      </p>
    );
  }

  if (dashboardQuery.isError || !dash) {
    return (
      <AdminPageSection
        title={t("admin.platformOps.realtime.loadError")}
        description={t("admin.platformOps.realtime.loadErrorDesc")}
      >
        <p className="text-sm text-cyan-200/70">
          {t("admin.platformOps.realtime.ssotHint")}
        </p>
      </AdminPageSection>
    );
  }

  const latency = dash.latency.publishToDeliver;

  return (
    <div className={adminDash.opsWorkspace}>
      <AdminSection
        title={t("admin.platformOps.realtime.overview")}
        description={t("admin.platformOps.realtime.overviewDesc")}
        icon={Radio}
        density="console"
      >
        <div className={SEMANTIC_KPI_GRID.quad}>
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.kpiHealth")}
            value={String(dash.platform.overallHealth)}
            tone="info"
            domain="information"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.kpiEnabled")}
            value={
              dash.platform.enabled
                ? t("admin.platformOps.realtime.yes")
                : t("admin.platformOps.realtime.no")
            }
            tone="info"
            domain="information"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.kpiConnections")}
            value={String(dash.connections.active)}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.kpiPeak")}
            value={String(dash.connections.peak)}
            tone="info"
            domain="analytics"
          />
        </div>
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.connections")}
        icon={Activity}
        density="console"
      >
        <div className={SEMANTIC_KPI_GRID.quad}>
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.opened")}
            value={String(dash.connections.opened)}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.closed")}
            value={String(dash.connections.closed)}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.rejected")}
            value={String(dash.connections.rejected)}
            tone="warning"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.avgDuration")}
            value={formatMs(dash.connections.avgDurationMs)}
            tone="info"
            domain="analytics"
          />
        </div>
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.channels")}
        density="console"
      >
        <div className={cn(adminDash.opsTableWrap, "overflow-x-auto")}>
          <table className={adminDash.opsTable}>
            <thead>
              <tr>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colChannel")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colSubs")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colPublish")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colDeliver")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colP95")}
                </th>
              </tr>
            </thead>
            <tbody>
              {dash.channels.map((ch) => (
                <tr key={ch.channel}>
                  <td className={adminDash.opsTableCell}>{ch.channel}</td>
                  <td className={adminDash.opsTableCell}>{ch.subscribers}</td>
                  <td className={adminDash.opsTableCell}>{ch.publishes}</td>
                  <td className={adminDash.opsTableCell}>{ch.deliveries}</td>
                  <td className={adminDash.opsTableCell}>
                    {formatMs(ch.publishToDeliver.p95)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.latency")}
        density="console"
      >
        <div className={SEMANTIC_KPI_GRID.quad}>
          <SemanticKpiCard label="P50" value={formatMs(latency.p50)} tone="info" domain="analytics" />
          <SemanticKpiCard label="P95" value={formatMs(latency.p95)} tone="info" domain="analytics" />
          <SemanticKpiCard label="P99" value={formatMs(latency.p99)} tone="info" domain="analytics" />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.worst")}
            value={formatMs(latency.worst)}
            tone="warning"
            domain="analytics"
          />
        </div>
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.authorization")}
        icon={Shield}
        density="console"
      >
        <div className={SEMANTIC_KPI_GRID.quad}>
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.authSuccess")}
            value={String(dash.authorization.success)}
            tone="success"
            domain="information"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.authDenied")}
            value={String(dash.authorization.denied)}
            tone="warning"
            domain="information"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.ticketsIssued")}
            value={String(dash.authorization.ticketsIssued)}
            tone="info"
            domain="information"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.ticketsRevoked")}
            value={String(dash.authorization.ticketsRevoked)}
            tone="info"
            domain="information"
          />
        </div>
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.registry")}
        density="console"
      >
        <div className={SEMANTIC_KPI_GRID.quad}>
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.registrySize")}
            value={String(dash.registry.size)}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.registryActive")}
            value={String(dash.registry.active)}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.registryLookups")}
            value={String(dash.registry.lookups)}
            tone="info"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.avgLookup")}
            value={`${Math.round(dash.registry.avgLookupMicros)} µs`}
            tone="info"
            domain="analytics"
          />
        </div>
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.fallback")}
        density="console"
      >
        <div className={SEMANTIC_KPI_GRID.quad}>
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.fallbackActivations")}
            value={String(dash.fallback.activations)}
            tone="warning"
            domain="analytics"
          />
          <SemanticKpiCard
            label={t("admin.platformOps.realtime.reconnects")}
            value={String(dash.fallback.reconnects)}
            tone="info"
            domain="analytics"
          />
        </div>
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.alerts")}
        icon={AlertTriangle}
        density="console"
      >
        {alerts.length === 0 ? (
          <p className="text-sm text-cyan-200/70">
            {t("admin.platformOps.realtime.noAlerts")}
          </p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((alert) => (
              <li
                key={alert.id}
                className="rounded-lg border border-cyan-500/20 bg-slate-800/40 px-3 py-2"
              >
                <p className="text-sm font-semibold text-white">
                  [{alert.severity}] {alert.title}
                </p>
                <p className="text-xs text-cyan-300/80">{alert.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <AdminSection
        title={t("admin.platformOps.realtime.adoption")}
        density="console"
      >
        <div className={cn(adminDash.opsTableWrap, "overflow-x-auto")}>
          <table className={adminDash.opsTable}>
            <thead>
              <tr>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colSurface")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colState")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colSubs")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colHealth")}
                </th>
                <th className={adminDash.opsTableHead}>
                  {t("admin.platformOps.realtime.colP95")}
                </th>
              </tr>
            </thead>
            <tbody>
              {dash.adoption.map((row) => (
                <tr key={row.surfaceId}>
                  <td className={adminDash.opsTableCell}>{row.surfaceId}</td>
                  <td className={adminDash.opsTableCell}>
                    {row.migrationState}
                  </td>
                  <td className={adminDash.opsTableCell}>
                    {row.activeSubscribers}
                  </td>
                  <td className={adminDash.opsTableCell}>{row.health}</td>
                  <td className={adminDash.opsTableCell}>
                    {formatMs(row.latencyP95Ms)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-cyan-400/70">
          {t("admin.platformOps.realtime.ssotHint")}
        </p>
      </AdminSection>
    </div>
  );
}
