/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1 + PLATFORM-CARD-DESIGN-SYSTEM-UNIFICATION-1
 * Connector session status — SemanticBadge + semantic inset shell.
 */
import {
  SemanticBadge,
  mapHealthToneToBadgeTone,
} from "@/design-system/semantic-badge";
import { semanticPanel } from "@/design-system/semantic-card";
import { sessionOperatorCopy } from "@/lib/print-workspace/operationalViewModels";
import { formatHealthLabel, healthTone } from "@/lib/print-workspace/viewModels";
import type { RouterOutputs } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Link2, Loader2 } from "lucide-react";

type SessionStatus = RouterOutputs["printWorkspace"]["read"]["getConnectorSessionStatus"];

export function ConnectorSessionCard({
  language,
  status,
  isLoading,
}: {
  language: string;
  status: SessionStatus | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className={cn(semanticPanel.inset, "flex justify-center py-6")}>
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  const sessionState = status?.sessionState ?? "unregistered";
  const copy = sessionOperatorCopy(status, language);
  const tone = healthTone(sessionState);

  return (
    <div className={cn(semanticPanel.inset, "px-4 py-3")}>
      <div className="flex items-center gap-3">
        <Link2 className="h-4 w-4 shrink-0 text-slate-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-200">{copy.title}</p>
          <p className="text-xs text-slate-500">{copy.detail}</p>
        </div>
        <SemanticBadge
          tone={mapHealthToneToBadgeTone(tone)}
          density="soft"
          size="sm"
        >
          {formatHealthLabel(sessionState, language)}
        </SemanticBadge>
      </div>
    </div>
  );
}
