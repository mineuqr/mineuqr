/**
 * PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * Local connector status — semantic status shell.
 */
import { HealthStatusBadge } from "@/components/print-workspace/HealthStatusBadge";
import { Button } from "@/components/ui/button";
import {
  SEMANTIC_ICON,
  semanticCardTypeClass,
} from "@/design-system/semantic-card";
import { connectorOperatorCopy } from "@/lib/print-workspace/operationalViewModels";
import type { RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Activity, Loader2 } from "lucide-react";

type LocalConnectorStatus = RouterOutputs["printWorkspace"]["read"]["getLocalConnectorStatus"];

export function LocalConnectorCard({
  language,
  status,
  isLoading,
  onRefresh,
}: {
  language: string;
  status: LocalConnectorStatus | undefined;
  isLoading: boolean;
  onRefresh?: () => void;
}) {
  const shell = semanticCardTypeClass("status", { interactive: false });

  if (isLoading) {
    return (
      <div className={cn(shell, "flex justify-center py-10")}>
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const connectionStatus = status?.connectionStatus ?? "unregistered";
  const copy = connectorOperatorCopy(connectionStatus, language);
  const online = connectionStatus === "healthy" || connectionStatus === "connected";

  return (
    <div className={cn(shell, "p-4 sm:p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(SEMANTIC_ICON.md, "text-slate-300")}>
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              {language === "ar" ? "موصل MineuQR" : "MineuQR Connector"}
            </p>
            <p className="mt-0.5 text-sm text-slate-300">{copy.title}</p>
          </div>
        </div>
        <HealthStatusBadge state={connectionStatus} language={language} />
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-400">{copy.detail}</p>

      {!online ? (
        <div className="mt-4">
          <Button type="button" size="sm" variant="default" onClick={() => onRefresh?.()}>
            {copy.action}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
