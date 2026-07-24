/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — session workspace settlement completion status.
 */

import {
  settlementRecordUiLabel,
  useSettlementRecordsBySession,
  type SettlementRecordLang,
} from "@/lib/settlement-record-presentation";
import { cn } from "@/lib/utils";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SettlementSessionStatusPanelProps = {
  restaurantId: number;
  sessionId: number;
  language: SettlementRecordLang;
  enabled?: boolean;
  sessionStatus: string;
  onOpenDetail?: (settlementRecordId: string) => void;
  onOpenReceipt?: (settlementRecordId: string) => void;
  onOpenHistory?: () => void;
};

export function SettlementSessionStatusPanel({
  restaurantId,
  sessionId,
  language,
  enabled = true,
  sessionStatus,
  onOpenDetail,
  onOpenReceipt,
  onOpenHistory,
}: SettlementSessionStatusPanelProps) {
  const settled =
    sessionStatus === "paid" ||
    sessionStatus === "complimentary" ||
    sessionStatus === "closed";

  const query = useSettlementRecordsBySession(
    { restaurantId, sessionId },
    { enabled: enabled && settled && restaurantId > 0 && sessionId > 0 }
  );

  if (!settled) return null;

  const latest = query.data?.[0];

  return (
    <section
      className={cn(restaurantDash.panelInset, "p-4")}
      aria-label={settlementRecordUiLabel("settlementComplete", language)}
    >
      <h3 className="mb-2 text-sm font-semibold text-white">
        {settlementRecordUiLabel("settlementComplete", language)}
      </h3>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          {settlementRecordUiLabel("loading", language)}
        </div>
      ) : null}

      {latest ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            {settlementRecordUiLabel("settlementNumber", language)}:{" "}
            <span className="font-mono text-xs text-slate-200">
              {latest.settlementNumber}
            </span>
          </p>
          <p className="text-sm text-slate-300">
            {settlementRecordUiLabel("settlementStatus", language)}:{" "}
            {latest.settlementStatus}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {onOpenDetail ? (
              <Button
                type="button"
                size="sm"
                onClick={() => onOpenDetail(latest.settlementRecordId)}
              >
                {settlementRecordUiLabel("viewDetail", language)}
              </Button>
            ) : null}
            {onOpenReceipt ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => onOpenReceipt(latest.settlementRecordId)}
              >
                {settlementRecordUiLabel("viewReceipt", language)}
              </Button>
            ) : null}
            {onOpenHistory ? (
              <Button type="button" size="sm" variant="outline" onClick={onOpenHistory}>
                {settlementRecordUiLabel("viewHistory", language)}
              </Button>
            ) : null}
          </div>
        </div>
      ) : !query.isLoading ? (
        <p className="text-sm text-slate-400">
          {settlementRecordUiLabel("settlementComplete", language)}
        </p>
      ) : null}
    </section>
  );
}
