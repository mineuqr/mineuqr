import { HealthStatusBadge } from "@/components/print-workspace/HealthStatusBadge";
import { Button } from "@/components/ui/button";
import { formatTimestamp, formatUptime } from "@/lib/print-workspace/viewModels";
import type { RouterOutputs } from "@/lib/trpc";
import { Activity, Loader2 } from "lucide-react";

type LocalConnectorStatus = RouterOutputs["printWorkspace"]["read"]["getLocalConnectorStatus"];

function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm text-slate-200">{value}</p>
    </div>
  );
}

export function LocalConnectorCard({
  language,
  status,
  isLoading,
  onOpenDiagnostics,
}: {
  language: string;
  status: LocalConnectorStatus | undefined;
  isLoading: boolean;
  onOpenDiagnostics: () => void;
}) {
  const isAr = language === "ar";

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-xl border border-slate-800 bg-slate-900/40 py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const data = status ?? {
    connectionStatus: "unregistered" as const,
    healthLabel: "Unregistered" as const,
    connectorVersion: null,
    runtimePlatform: null,
    runtimeUptimeMs: null,
    lastHeartbeatAt: null,
    connectorId: null,
    hostLabel: null,
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-800 p-2 text-slate-300">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-white">
              {isAr ? "موصل المطعم المحلي" : "Restaurant Local Connector"}
            </p>
            <p className="text-xs text-slate-400">
              {isAr ? "تنفيذ الطباعة في المطعم" : "On-premise print execution"}
            </p>
          </div>
        </div>
        <HealthStatusBadge state={data.connectionStatus} language={language} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label={isAr ? "الحالة" : "Health"}
          value={
            isAr
              ? data.healthLabel === "Healthy"
                ? "سليم"
                : data.healthLabel === "Degraded"
                  ? "متدهور"
                  : data.healthLabel === "Unregistered"
                    ? "غير مسجل"
                    : "غير متصل"
              : data.healthLabel
          }
        />
        <Field
          label={isAr ? "الإصدار" : "Connector version"}
          value={data.connectorVersion ?? (isAr ? "—" : "—")}
        />
        <Field
          label={isAr ? "المنصة" : "Runtime platform"}
          value={data.runtimePlatform ?? (isAr ? "—" : "—")}
        />
        <Field
          label={isAr ? "مدة التشغيل" : "Runtime uptime"}
          value={formatUptime(data.runtimeUptimeMs, language)}
        />
        <Field
          label={isAr ? "آخر نبضة" : "Last heartbeat"}
          value={formatTimestamp(data.lastHeartbeatAt, language)}
        />
        <Field
          label={isAr ? "معرف الموصل" : "Connector ID"}
          value={data.connectorId ?? (isAr ? "غير مسجل" : "Not registered")}
        />
      </div>

      <div className="mt-4">
        <Button type="button" size="sm" variant="outline" onClick={onOpenDiagnostics}>
          {isAr ? "التشخيص" : "Diagnostics"}
        </Button>
      </div>
    </div>
  );
}
