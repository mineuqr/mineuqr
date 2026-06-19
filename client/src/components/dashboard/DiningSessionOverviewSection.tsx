import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { formatDashboardSessionLabel } from "@/lib/diningSessionDashboardCopy";
import {
  computeWorkspaceDurationMs,
  formatSessionDuration,
  sessionSummaryLabel,
} from "@/lib/diningSessionWorkspaceCopy";
import { sessionStatusDisplayLabel } from "@/lib/sessionWorkspaceOps";
import { formatRiyadhDateTime } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { getDiningSessionBannerTitle } from "@/lib/diningSessionCopy";
import { restaurantDash } from "./restaurantDashStyles";

type Lang = "ar" | "en";

function OverviewField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-slate-100">{value}</dd>
    </div>
  );
}

export function DiningSessionOverviewSection({
  sessionId,
  tableNumber,
  status,
  openedAt,
  closedAt,
  language,
  tableLabel,
}: {
  sessionId: number;
  tableNumber: number;
  status: DiningSessionStatus;
  openedAt: string;
  closedAt: string | null;
  language: Lang;
  tableLabel?: string;
}) {
  const isRooms = tableLabel === "rooms";
  const unitAr = isRooms ? "غرفة" : "طاولة";
  const unitEn = isRooms ? "Room" : "Table";
  const durationMs = computeWorkspaceDurationMs(openedAt, closedAt, status);
  const startedLabel = formatRiyadhDateTime(openedAt, language === "ar" ? "ar-SA" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className={cn(restaurantDash.panelInset, "p-4")} aria-label={sessionSummaryLabel("overview", language)}>
      <h3 className="mb-3 text-sm font-semibold text-white">
        {sessionSummaryLabel("overview", language)}
      </h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <OverviewField
          label={sessionSummaryLabel("sessionId", language)}
          value={formatDashboardSessionLabel(sessionId, language)}
        />
        <OverviewField
          label={sessionSummaryLabel("table", language)}
          value={language === "ar" ? `${unitAr} ${tableNumber}` : `${unitEn} ${tableNumber}`}
        />
        <OverviewField
          label={sessionSummaryLabel("status", language)}
          value={
            status === "open" || status === "paid" || status === "complimentary"
              ? sessionStatusDisplayLabel(status, language === "ar")
              : getDiningSessionBannerTitle(status, language)
          }
        />
        <OverviewField
          label={sessionSummaryLabel("startedAt", language)}
          value={startedLabel}
        />
        <OverviewField
          label={sessionSummaryLabel("duration", language)}
          value={formatSessionDuration(durationMs, language)}
        />
      </dl>
    </section>
  );
}
