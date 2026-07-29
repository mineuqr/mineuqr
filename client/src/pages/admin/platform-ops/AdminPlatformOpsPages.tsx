/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * Platform Operations workspace pages.
 */

import { PlatformOpsWorkspaceShell } from "@/components/admin/platform-ops/PlatformOpsWorkspaceShell";
import { PlatformOpsOverviewComposition } from "@/components/admin/platform-ops/PlatformOpsOverviewComposition";
import { PlatformOpsRealtimeComposition } from "@/components/admin/platform-ops/PlatformOpsRealtimeComposition";
import { PlatformOpsHealthComposition } from "@/components/admin/platform-ops/PlatformOpsHealthComposition";
import { PlatformOpsPerformanceComposition } from "@/components/admin/platform-ops/PlatformOpsPerformanceComposition";
import { PlatformOpsRuntimeComposition } from "@/components/admin/platform-ops/PlatformOpsRuntimeComposition";
import { PlatformOpsReservedSection } from "@/components/admin/platform-ops/PlatformOpsReservedSection";
import type { PlatformOpsSectionId } from "@/lib/admin/platform-ops/platformOpsSections";

function PlatformOpsPage({ sectionId }: { sectionId: PlatformOpsSectionId }) {
  return (
    <PlatformOpsWorkspaceShell sectionId={sectionId}>
      {sectionId === "overview" ? <PlatformOpsOverviewComposition /> : null}
      {sectionId === "realtime" ? <PlatformOpsRealtimeComposition /> : null}
      {sectionId === "health" ? <PlatformOpsHealthComposition /> : null}
      {sectionId === "performance" ? (
        <PlatformOpsPerformanceComposition />
      ) : null}
      {sectionId === "devices" ? (
        <PlatformOpsReservedSection sectionId="devices" />
      ) : null}
      {sectionId === "jobs" ? (
        <PlatformOpsRuntimeComposition surface="jobs" />
      ) : null}
      {sectionId === "events" ? (
        <PlatformOpsRuntimeComposition surface="events" />
      ) : null}
      {sectionId === "audit" ? (
        <PlatformOpsReservedSection sectionId="audit" />
      ) : null}
      {sectionId === "diagnostics" ? (
        <PlatformOpsRuntimeComposition surface="diagnostics" />
      ) : null}
    </PlatformOpsWorkspaceShell>
  );
}

export function AdminPlatformOpsOverviewPage() {
  return <PlatformOpsPage sectionId="overview" />;
}
export function AdminPlatformOpsRealtimePage() {
  return <PlatformOpsPage sectionId="realtime" />;
}
export function AdminPlatformOpsHealthPage() {
  return <PlatformOpsPage sectionId="health" />;
}
export function AdminPlatformOpsPerformancePage() {
  return <PlatformOpsPage sectionId="performance" />;
}
export function AdminPlatformOpsDevicesPage() {
  return <PlatformOpsPage sectionId="devices" />;
}
export function AdminPlatformOpsJobsPage() {
  return <PlatformOpsPage sectionId="jobs" />;
}
export function AdminPlatformOpsEventsPage() {
  return <PlatformOpsPage sectionId="events" />;
}
export function AdminPlatformOpsAuditPage() {
  return <PlatformOpsPage sectionId="audit" />;
}
export function AdminPlatformOpsDiagnosticsPage() {
  return <PlatformOpsPage sectionId="diagnostics" />;
}
