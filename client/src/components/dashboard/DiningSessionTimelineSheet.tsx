import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatDashboardSessionLabel } from "@/lib/diningSessionDashboardCopy";
import { getDiningSessionBannerTitle } from "@/lib/diningSessionCopy";
import { formatTimelineEventDescription } from "@/lib/diningSessionTimelineCopy";
import { formatRiyadhDateTime } from "@/lib/datetime";
import {
  DASHBOARD_ORDER_LIST_POLL_MS,
  orderListQueryOptions,
  useDevQueryRuntimeLog,
} from "@/lib/queryRuntime";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

type DiningSessionTimelineSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  sessionId: number | null;
  currencySymbol?: string;
  tableLabel?: string;
};

export function DiningSessionTimelineSheet({
  open,
  onOpenChange,
  restaurantId,
  sessionId,
  currencySymbol,
  tableLabel,
}: DiningSessionTimelineSheetProps) {
  const { language } = useLanguage();
  const lang = language === "ar" ? "ar" : "en";
  const sym = currencySymbol || "ر.س";
  const isRooms = tableLabel === "rooms";
  const unitAr = isRooms ? "غرفة" : "طاولة";
  const unitEn = isRooms ? "Room" : "Table";
  const queryEnabled = open && sessionId != null && sessionId > 0;

  useDevQueryRuntimeLog("session.getOwnerTimeline", {
    enabled: queryEnabled,
    pollMs: queryEnabled ? DASHBOARD_ORDER_LIST_POLL_MS : undefined,
  });

  const { data, isLoading, error } = trpc.session.getOwnerTimeline.useQuery(
    { restaurantId, sessionId: sessionId ?? 0 },
    {
      ...orderListQueryOptions(queryEnabled),
      enabled: queryEnabled,
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

  const formatTime = (value: string) =>
    formatRiyadhDateTime(value, lang === "ar" ? "ar-SA" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={sheetSide}
        className={
          sheetSide === "bottom"
            ? "max-h-[85vh] overflow-y-auto sm:max-w-full"
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
          {data && (
            <SheetDescription className="space-y-1 text-start">
              <span className="block">
                {lang === "ar"
                  ? `${unitAr} ${data.tableNumber}`
                  : `${unitEn} ${data.tableNumber}`}
                {" · "}
                {getDiningSessionBannerTitle(data.status, lang)}
              </span>
              <span className="block text-xs">
                {lang === "ar" ? "بدأت:" : "Started:"}{" "}
                {formatRiyadhDateTime(data.openedAt, lang === "ar" ? "ar-SA" : "en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 px-4 pb-6 pt-2">
          <h3 className="mb-4 text-sm font-medium text-foreground">
            {language === "ar" ? "سجل الجلسة" : "Session timeline"}
          </h3>

          {isLoading && (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <p className="py-6 text-center text-sm text-red-400">
              {language === "ar" ? "تعذر تحميل سجل الجلسة" : "Could not load session timeline"}
            </p>
          )}

          {!isLoading && !error && data && data.events.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {language === "ar" ? "لا توجد أحداث بعد" : "No events yet"}
            </p>
          )}

          {!isLoading && !error && data && data.events.length > 0 && (
            <ol className="relative space-y-6 border-s border-border/50 ps-4">
              {data.events.map((event) => (
                <li key={event.id} className="relative">
                  <span
                    className="absolute -start-[1.3125rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary/80 ring-4 ring-background"
                    aria-hidden
                  />
                  <time
                    dateTime={event.createdAt}
                    className="mb-1 block text-xs font-medium tabular-nums text-muted-foreground"
                  >
                    {formatTime(event.createdAt)}
                  </time>
                  <p className="text-sm text-foreground">
                    {formatTimelineEventDescription(event, lang, sym)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
