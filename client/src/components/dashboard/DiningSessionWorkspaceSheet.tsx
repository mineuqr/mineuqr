import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DiningSessionActionBar } from "@/components/dashboard/DiningSessionActionBar";
import { DiningSessionOrdersList } from "@/components/dashboard/DiningSessionOrdersList";
import { DiningSessionSummaryCard } from "@/components/dashboard/DiningSessionSummaryCard";
import { DiningSessionTimelineList } from "@/components/dashboard/DiningSessionTimelineList";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiningSessionStatus } from "@/lib/diningSessionCopy";
import { formatDashboardSessionLabel } from "@/lib/diningSessionDashboardCopy";
import { sessionSummaryLabel } from "@/lib/diningSessionWorkspaceCopy";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  orderListQueryOptions,
  restaurantQueriesEnabled,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

type DiningSessionWorkspaceSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  sessionId: number | null;
  currencySymbol?: string;
  tableLabel?: string;
};

export function DiningSessionWorkspaceSheet({
  open,
  onOpenChange,
  restaurantId,
  sessionId,
  currencySymbol,
  tableLabel,
}: DiningSessionWorkspaceSheetProps) {
  const { language } = useLanguage();
  const { isAuthenticated, authPending } = useAuth();
  const lang = language === "ar" ? "ar" : "en";
  const sym = currencySymbol || "ر.س";
  const workspaceEnabled =
    restaurantQueriesEnabled(authPending, isAuthenticated, restaurantId) &&
    open &&
    sessionId != null &&
    sessionId > 0;

  useDevQueryRuntimeLog("session.getOwnerWorkspace", {
    enabled: workspaceEnabled,
    authPending,
    isAuthenticated,
    pollMs: workspaceEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const { data, isLoading, error } = trpc.session.getOwnerWorkspace.useQuery(
    { restaurantId, sessionId: sessionId ?? 0 },
    {
      ...orderListQueryOptions(workspaceEnabled),
      enabled: workspaceEnabled,
    }
  );

  const [sheetSide, setSheetSide] = useState<"bottom" | "right">("right");
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const update = () => setSheetSide(mq.matches ? "bottom" : "right");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={sheetSide}
        className={
          sheetSide === "bottom"
            ? "max-h-[90vh] overflow-y-auto sm:max-w-full"
            : "w-full overflow-y-auto sm:max-w-md"
        }
      >
        <SheetHeader className="text-start border-b border-border/40 pb-4">
          <SheetTitle className="text-lg">
            {sessionId != null
              ? formatDashboardSessionLabel(sessionId, lang)
              : language === "ar"
                ? "الجلسة"
                : "Session"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 px-4 pb-6 pt-4">
          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <p className="py-6 text-center text-sm text-red-400">
              {sessionSummaryLabel("loadError", lang)}
            </p>
          )}

          {!isLoading && !error && data && (
            <>
              <DiningSessionSummaryCard
                sessionId={data.sessionId}
                tableNumber={data.tableNumber}
                status={data.status as DiningSessionStatus}
                openedAt={data.openedAt}
                closedAt={data.closedAt}
                orderCount={data.orderCount}
                ordersTotalAmount={data.ordersTotalAmount}
                language={lang}
                currencySymbol={sym}
                tableLabel={tableLabel}
              />

              <DiningSessionActionBar
                restaurantId={restaurantId}
                sessionId={data.sessionId}
                status={data.status as DiningSessionStatus}
              />

              <DiningSessionOrdersList
                orders={data.orders}
                language={lang}
                currencySymbol={sym}
              />

              <DiningSessionTimelineList
                events={data.events}
                language={lang}
                currencySymbol={sym}
              />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
