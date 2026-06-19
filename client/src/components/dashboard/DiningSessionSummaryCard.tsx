import { Badge } from "@/components/ui/badge";
import { getDiningSessionBannerTitle, type DiningSessionStatus } from "@/lib/diningSessionCopy";
import { formatDashboardSessionLabel } from "@/lib/diningSessionDashboardCopy";
import {
  computeWorkspaceDurationMs,
  formatSessionDuration,
  formatSessionTotalAmount,
  sessionSummaryLabel,
} from "@/lib/diningSessionWorkspaceCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";

type Lang = "ar" | "en";

type DiningSessionSummaryCardProps = {
  sessionId: number;
  tableNumber: number;
  status: DiningSessionStatus;
  openedAt: string;
  closedAt: string | null;
  orderCount: number;
  ordersTotalAmount: string;
  language: Lang;
  currencySymbol: string;
  tableLabel?: string;
};

export function DiningSessionSummaryCard({
  sessionId,
  tableNumber,
  status,
  openedAt,
  closedAt,
  orderCount,
  ordersTotalAmount,
  language,
  currencySymbol,
  tableLabel,
}: DiningSessionSummaryCardProps) {
  const isRooms = tableLabel === "rooms";
  const unitAr = isRooms ? "غرفة" : "طاولة";
  const unitEn = isRooms ? "Room" : "Table";
  const durationMs = computeWorkspaceDurationMs(openedAt, closedAt, status);

  const rows = [
    {
      label: sessionSummaryLabel("openedAt", language),
      value: formatRiyadhDateTime(openedAt, language === "ar" ? "ar-SA" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      label: sessionSummaryLabel("duration", language),
      value: formatSessionDuration(durationMs, language),
    },
    {
      label: sessionSummaryLabel("orders", language),
      value: String(orderCount),
    },
    {
      label: sessionSummaryLabel("sessionTotal", language),
      value: formatSessionTotalAmount(ordersTotalAmount, currencySymbol, language),
    },
  ];

  return (
    <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-semibold text-foreground">
          {formatDashboardSessionLabel(sessionId, language)}
        </span>
        <Badge variant="outline" className="border-border/60 text-xs">
          {language === "ar" ? `${unitAr} ${tableNumber}` : `${unitEn} ${tableNumber}`}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {getDiningSessionBannerTitle(status, language)}
        </Badge>
      </div>
      <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-0.5">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-sm font-medium tabular-nums text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
