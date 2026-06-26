import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  shouldShowAuthorityOperatorAlert,
  type PrintingSetupStatus,
} from "@/lib/printing/printingReadinessAuthority";
import type { LegacyPrintingDiscoveryDiagnostics } from "@/lib/printing/legacyPrintingDiscovery";
import { AlertTriangle, Info, Server, Wifi, WifiOff } from "lucide-react";

function authorityAlertTitle(status: PrintingSetupStatus, isAr: boolean): string {
  if (status.operationalState === "BLOCKED") {
    return isAr ? "يتطلب تدخل الدعم" : "Support Action Required";
  }
  if (status.operationalState === "DEGRADED") {
    return isAr ? "الطباعة تحتاج انتباه" : "Printing Needs Attention";
  }
  return isAr ? "إعداد الطباعة غير مكتمل" : "Printing Setup Incomplete";
}

export function PrinterDiscoveryDiagnosticsPanel({
  data,
  setupStatus,
  isAr,
  isLoading,
}: {
  data: LegacyPrintingDiscoveryDiagnostics | undefined;
  setupStatus: PrintingSetupStatus | undefined;
  isAr: boolean;
  isLoading: boolean;
}) {
  if (isLoading) {
    return null;
  }
  if (!data) {
    return null;
  }

  const counts = data.counts;
  const showAuthorityAlert = shouldShowAuthorityOperatorAlert(setupStatus);

  return (
    <div className="space-y-4">
      {showAuthorityAlert && setupStatus ? (
        <Card
          className={
            setupStatus.severity === "error"
              ? "border-destructive/30 bg-destructive/5"
              : "border-amber-500/30 bg-amber-500/5"
          }
        >
          <CardHeader className="pb-2">
            <CardTitle
              className={`flex items-center gap-2 text-base ${
                setupStatus.severity === "error" ? "text-destructive" : "text-amber-200"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              {authorityAlertTitle(setupStatus, isAr)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-300">
            <p>{setupStatus.reason}</p>
            <p className="text-xs text-muted-foreground" dir="ltr">
              setupState={setupStatus.setupState} · operationalState={setupStatus.operationalState}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/40 bg-card/40" data-support-diagnostics="printing-discovery">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            {isAr ? "تشخيص الدعم · الهندسة" : "Support · Engineering Diagnostics"}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {isAr
              ? "للاستكشاف فقط — لا يحدد جاهزية الطباعة"
              : "Troubleshooting only — does not determine printing readiness"}
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label={isAr ? "وكلاء متصلون" : "Connected Agents"} value={counts.connectedAgentsForRestaurant} />
          <Metric label={isAr ? "نقاط النهاية" : "Connected Endpoints"} value={counts.connectedEndpoints} />
          <Metric label={isAr ? "طابعات مكتشفة" : "Discovered Printers"} value={counts.discoveredPrinterProfiles} />
          <Metric label={isAr ? "طابعات مُعيَّنة" : "Assigned Printers"} value={counts.assignedDbPrinters} />
          <Metric label={isAr ? "اتصال legacy" : "Legacy Active Count"} value={counts.activePrinters} />
        </CardContent>
      </Card>

      {data.ownershipConflicts.length > 0 ? (
        <Card className="border-destructive/30" data-support-diagnostics="ownership-conflicts">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              {isAr ? "تعارضات الملكية (دعم)" : "Ownership Conflicts (Support)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.ownershipConflicts.map((conflict) => (
              <div key={`${conflict.profileId}-${conflict.agentId}`} className="rounded-lg border border-border/40 p-3">
                <p className="font-medium">{conflict.profileId}</p>
                <p className="text-muted-foreground">
                  {isAr ? "الوكيل" : "Agent"}: {conflict.agentId}
                </p>
                <p className="text-muted-foreground">
                  {isAr ? "المطعم المالك" : "Owning restaurant"}: {conflict.owningRestaurantId}
                  {" · "}
                  {isAr ? "المطعم الحالي" : "Current restaurant"}: {conflict.currentRestaurantId}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.agents.length > 0 ? (
        <Card className="border-border/40" data-support-diagnostics="agent-presence">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              {isAr ? "حضور الوكلاء (دعم)" : "Agent Presence (Support)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.agents.map((agent) => (
              <div
                key={agent.agentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/30 px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  {agent.status === "online" ? (
                    <Wifi className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <WifiOff className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-mono text-xs">{agent.agentId}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={agent.status === "online" ? "default" : "secondary"}>{agent.status}</Badge>
                  {agent.relevantToRestaurant ? (
                    <Badge variant="outline">{isAr ? "ذو صلة" : "Relevant"}</Badge>
                  ) : null}
                  <Badge variant="outline">
                    {isAr ? "ملفات" : "Profiles"}: {agent.reportedProfileCount}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
