/**
 * SEMANTIC-CARD-PLATFORM-ADOPTION-1
 * Session summary presentation — SemanticBadge for status; metrics as SemanticKpi grid.
 */
import {
  SemanticBadge,
  mapTableSessionStatusToBadgeTone,
} from "@/design-system/semantic-badge";
import { SemanticKpiCard, SEMANTIC_KPI_GRID } from "@/design-system/semantic-card";
import { getDiningSessionBannerTitle, type DiningSessionStatus } from "@/lib/diningSessionCopy";
import { formatDashboardSessionLabel } from "@/lib/diningSessionDashboardCopy";
import {
  computeWorkspaceDurationMs,
  formatSessionDuration,
  formatSessionTotalAmount,
  sessionSummaryLabel,
} from "@/lib/diningSessionWorkspaceCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";
import { Clock, Hash, ShoppingBag, Wallet } from "lucide-react";

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
  const tableLabelText =
    language === "ar" ? `${unitAr} ${tableNumber}` : `${unitEn} ${tableNumber}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-white">
          {formatDashboardSessionLabel(sessionId, language)}
        </span>
        <SemanticBadge tone="neutral" density="outline" size="sm">
          {tableLabelText}
        </SemanticBadge>
        <SemanticBadge
          tone={mapTableSessionStatusToBadgeTone(status)}
          density="soft"
          size="sm"
        >
          {getDiningSessionBannerTitle(status, language)}
        </SemanticBadge>
      </div>
      <div className={SEMANTIC_KPI_GRID.quad}>
        <SemanticKpiCard
          label={sessionSummaryLabel("openedAt", language)}
          value={formatRiyadhDateTime(openedAt, language === "ar" ? "ar-SA" : "en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          icon={Clock}
          tone="neutral"
          domain="information"
        />
        <SemanticKpiCard
          label={sessionSummaryLabel("duration", language)}
          value={formatSessionDuration(durationMs, language)}
          icon={Hash}
          tone="info"
          domain="analytics"
        />
        <SemanticKpiCard
          label={sessionSummaryLabel("orders", language)}
          value={String(orderCount)}
          icon={ShoppingBag}
          tone="info"
          domain="orders"
        />
        <SemanticKpiCard
          label={sessionSummaryLabel("sessionTotal", language)}
          value={formatSessionTotalAmount(ordersTotalAmount, currencySymbol, language)}
          icon={Wallet}
          tone="success"
          domain="revenue"
          valueVariant="revenue"
        />
      </div>
    </div>
  );
}
