import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RouterOutputs } from "@/lib/trpc";
import { AlertTriangle, Info, Server, Wifi, WifiOff } from "lucide-react";

type DiscoveryDiagnostics = RouterOutputs["printOps"]["getDiscoveryDiagnostics"];

function emptyStateCopy(
  reason: NonNullable<DiscoveryDiagnostics["emptyReason"]>,
  isAr: boolean
): { title: string; description: string; steps: string[] } {
  switch (reason) {
    case "no_agent_connected":
      return {
        title: isAr ? "لا يوجد وكيل طباعة متصل" : "No Print Agent Connected",
        description: isAr
          ? "لا يوجد وكيل طباعة متصل بخادم الطباعة لهذا المطعم."
          : "No print agent is connected to the Print Host for this restaurant.",
        steps: isAr
          ? [
              "ثبت خدمة Windows للوكيل على جهاز نقطة البيع",
              "استخدم ملف الإعدادات: production.print-host.example.json",
              "شغّل: scripts\\windows\\install-print-agent-service.ps1",
              "تحقق من https://print.mineuqr.com/health",
            ]
          : [
              "Install the Windows Print Agent service on the POS host",
              "Use config: agent/config/production.print-host.example.json",
              "Run: scripts\\windows\\install-print-agent-service.ps1",
              "Verify https://print.mineuqr.com/health shows agents.online = 1",
            ],
      };
    case "agent_no_matching_profiles":
      return {
        title: isAr ? "الوكيل متصل لكن بدون ملفات طابعات" : "Agent Connected but No Printer Profiles",
        description: isAr
          ? "يوجد وكيل متصل، لكنه لم يبلّغ عن ملفات طابعات تطابق إعدادات هذا المطعم."
          : "A print agent is online, but it has not reported printer profiles matching this restaurant.",
        steps: isAr
          ? [
              "تحقق من startupPrinters في ملف إعدادات الوكيل",
              "تأكد أن profileId يطابق printers.profileId في لوحة التحكم",
              "أعد تشغيل خدمة الوكيل بعد تعديل الإعدادات",
            ]
          : [
              "Check startupPrinters in the agent config file",
              "Ensure profileId matches printers.profileId in the dashboard",
              "Restart the agent service after config changes",
            ],
      };
    case "ownership_conflict":
      return {
        title: isAr ? "تعارض ملكية الطابعة" : "Printer Ownership Conflict",
        description: isAr
          ? "ملف الطابعة مُسجّل لوكيل يتبع مطعماً آخر."
          : "A printer profile is registered to an agent owned by another restaurant.",
        steps: isAr
          ? [
              "راجع تعارضات الملكية أدناه",
              "صحّح agentId أو profileId ليطابق المطعم الصحيح",
              "تأكد أن كل مطعم يستخدم وكيله الخاص",
            ]
          : [
              "Review ownership conflicts below",
              "Correct agentId or profileId for the intended restaurant",
              "Ensure each restaurant uses its dedicated agent",
            ],
      };
    case "no_db_printers":
      return {
        title: isAr ? "لا توجد طابعات مهيأة" : "No Printers Configured",
        description: isAr
          ? "لم يتم إعداد أي طابعة في قاعدة بيانات هذا المطعم."
          : "No printer records exist for this restaurant in the database.",
        steps: isAr
          ? [
              "أضف طابعة من إعدادات المطعم",
              "عيّن profileId مطابقاً لملف الوكيل",
              "أعد فتح عمليات الطباعة للتحقق",
            ]
          : [
              "Add a printer from restaurant settings",
              "Set profileId to match the agent config",
              "Reopen Printer Operations to verify",
            ],
      };
    case "printers_inactive":
      return {
        title: isAr ? "الطابعات غير نشطة" : "Printers Not Active",
        description: isAr
          ? "الطابعات مهيأة لكنها غير مرتبطة بوكيل متصل حالياً."
          : "Printers are configured but not linked to an online agent.",
        steps: isAr
          ? [
              "تحقق من اتصال الوكيل بخادم الطباعة",
              "تحقق من تطابق profileId بين قاعدة البيانات والوكيل",
              "استخدم طباعة تجريبية بعد استعادة الاتصال",
            ]
          : [
              "Verify agent connectivity to Print Host",
              "Confirm profileId alignment between DB and agent",
              "Run a Test Print after connectivity is restored",
            ],
      };
    default:
      return { title: "", description: "", steps: [] };
  }
}

export function PrinterDiscoveryDiagnosticsPanel({
  data,
  isAr,
  isLoading,
}: {
  data: DiscoveryDiagnostics | undefined;
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
  const emptyCopy = data.emptyReason ? emptyStateCopy(data.emptyReason, isAr) : null;

  return (
    <div className="space-y-4">
      <Card className="border-border/40 bg-card/40">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            {isAr ? "تشخيص الاكتشاف" : "Discovery Diagnostics"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric label={isAr ? "وكلاء متصلون" : "Connected Agents"} value={counts.connectedAgentsForRestaurant} />
          <Metric label={isAr ? "نقاط النهاية" : "Connected Endpoints"} value={counts.connectedEndpoints} />
          <Metric label={isAr ? "طابعات مكتشفة" : "Discovered Printers"} value={counts.discoveredPrinterProfiles} />
          <Metric label={isAr ? "طابعات مُعيَّنة" : "Assigned Printers"} value={counts.assignedDbPrinters} />
          <Metric label={isAr ? "طابعات نشطة" : "Active Printers"} value={counts.activePrinters} tone="success" />
        </CardContent>
      </Card>

      {emptyCopy ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              {emptyCopy.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <p>{emptyCopy.description}</p>
            <ul className="list-disc space-y-1 ps-5 text-slate-400">
              {emptyCopy.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? `وكلاء عالميون متصلون: ${counts.connectedAgentsGlobal}`
                : `Global connected agents: ${counts.connectedAgentsGlobal}`}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {data.ownershipConflicts.length > 0 ? (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">
              {isAr ? "تعارضات الملكية" : "Ownership Conflicts"}
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
        <Card className="border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              {isAr ? "حضور الوكلاء" : "Agent Presence"}
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

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success";
}) {
  return (
    <div className="rounded-lg border border-border/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${tone === "success" ? "text-emerald-400" : "text-white"}`}>{value}</p>
    </div>
  );
}
