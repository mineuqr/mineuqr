import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  OperationalOrderCard,
  mapWaiterOrderPresentation,
} from "@/design-system/operational-order-card";
import { formatLocaleDateTime } from "@/lib/numericPresentation";
import { OPERATIONAL_LIFECYCLE_POLL_MS } from "@/lib/queryRuntime";
import { screenTrpc } from "@/lib/operational-screen/screenTrpc";
import { trpc } from "@/lib/trpc";

type Props = {
  restaurantId: number;
  sessionId: number;
  tableNumber: number;
  /** WAITER-SCREEN-IDENTITY-PRESENTATION-1 — optional hosted Runtime identity chrome. */
  restaurantName?: string | null;
  screenName?: string | null;
  roleLabel?: string | null;
  authMode?: "staff" | "device";
  onBackToTables: () => void;
  onAddOrder: () => void;
};

/**
 * WAITER-TABLE-WORKSPACE-1 — Table Workspace presentation.
 * Consumes Operational Waiter workspace DTO only (staff or device runtime).
 */
export function WaiterTableWorkspaceStage({
  restaurantId,
  sessionId,
  tableNumber,
  restaurantName,
  screenName,
  roleLabel,
  authMode = "staff",
  onBackToTables,
  onAddOrder,
}: Props) {
  const { language } = useLanguage();
  const ar = language === "ar";
  const deviceMode = authMode === "device";

  const staffQuery = trpc.waiter.getTableWorkspace.useQuery(
    { restaurantId, sessionId },
    {
      enabled: !deviceMode && restaurantId > 0 && sessionId > 0,
      refetchInterval: OPERATIONAL_LIFECYCLE_POLL_MS,
    }
  );
  const deviceQuery =
    screenTrpc.operationalDevice.runtime.getWaiterTableWorkspace.useQuery(
      { sessionId },
      {
        enabled: deviceMode && sessionId > 0,
        refetchInterval: OPERATIONAL_LIFECYCLE_POLL_MS,
      }
    );

  const query = deviceMode ? deviceQuery : staffQuery;

  if (sessionId <= 0) {
    return (
      <div className="min-h-screen bg-slate-950 text-white pb-28">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4">
          <button
            type="button"
            onClick={onBackToTables}
            className="text-xs text-white/60 mb-1"
          >
            {ar ? "← الطاولات" : "← Tables"}
          </button>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">
                {ar ? `طاولة ${tableNumber}` : `Table ${tableNumber}`}
              </h1>
              <p className="text-sm text-white/60 mt-1">
                {ar ? "مساحة الطاولة" : "Table workspace"}
              </p>
            </div>
            <button
              type="button"
              onClick={onAddOrder}
              className="rounded-xl bg-teal-500 px-4 py-3 font-bold text-sm text-slate-950 shrink-0"
            >
              {ar ? "طلب جديد" : "New order"}
            </button>
          </div>
        </header>
        <main className="px-4 py-5">
          <p className="text-sm text-white/50 py-10 text-center">
            {ar ? "لا توجد طلبات لهذه الطاولة" : "No orders for this table"}
          </p>
        </main>
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white p-8 text-center">
        <p>
          {ar
            ? "تعذر تحميل مساحة الطاولة"
            : "Could not load table workspace"}
        </p>
        <button
          type="button"
          onClick={onBackToTables}
          className="rounded-xl bg-white/10 px-5 py-2 text-sm"
        >
          {ar ? "العودة للطاولات" : "Back to tables"}
        </button>
      </div>
    );
  }

  const workspace = query.data;
  const displayTable = workspace.tableNumber || tableNumber;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-28">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4">
        <button
          type="button"
          onClick={onBackToTables}
          className="text-xs text-white/60 mb-1"
        >
          {ar ? "← الطاولات" : "← Tables"}
        </button>
        {(restaurantName || screenName || roleLabel) && (
          <div className="mb-2 min-w-0">
            {roleLabel ? (
              <p className="text-xs uppercase tracking-wide text-white/50 truncate">
                {roleLabel}
              </p>
            ) : null}
            {restaurantName ? (
              <p className="text-sm font-semibold truncate">{restaurantName}</p>
            ) : null}
            {screenName?.trim() ? (
              <p className="text-xs text-teal-300/90 truncate">
                {screenName.trim()}
              </p>
            ) : null}
          </div>
        )}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">
              {ar ? `طاولة ${displayTable}` : `Table ${displayTable}`}
            </h1>
            <p className="text-sm text-white/60 mt-1">
              {ar ? "مساحة الطاولة" : "Table workspace"}
            </p>
          </div>
          <button
            type="button"
            onClick={onAddOrder}
            className="rounded-xl bg-teal-500 px-4 py-3 font-bold text-sm text-slate-950 shrink-0"
          >
            {ar ? "طلب جديد" : "New order"}
          </button>
        </div>
      </header>

      <main className="px-4 py-5 space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            {ar ? "الجلسة" : "Session"}
          </h2>
          <p className="text-lg font-semibold">
            {ar ? "طاولة" : "Table"} {workspace.tableNumber}
          </p>
          <p className="text-sm text-white/70">
            {ar ? "الحالة" : "Status"}:{" "}
            <span className="text-amber-300">{workspace.sessionStatus}</span>
          </p>
          <p className="text-sm text-white/70">
            {ar ? "افتتحت" : "Opened"}: {formatDateTime(workspace.openedAt, ar)}
          </p>
          {workspace.closedAt ? (
            <p className="text-sm text-white/70">
              {ar ? "أغلقت" : "Closed"}: {formatDateTime(workspace.closedAt, ar)}
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl border border-teal-400/30 bg-teal-500/10 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-200/80">
              {ar ? "إجمالي الجلسة" : "Session total"}
            </p>
            <p className="text-2xl font-bold text-teal-200">
              {workspace.sessionTotalAmount}
            </p>
          </div>
          <p className="text-sm text-white/60">
            {workspace.orderCount} {ar ? "طلبات" : "orders"}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            {ar ? "الطلبات" : "Orders"}
          </h2>
          {workspace.orders.length === 0 ? (
            <p className="text-sm text-white/50 py-6 text-center">
              {ar ? "لا توجد طلبات لهذه الجلسة" : "No orders for this session"}
            </p>
          ) : (
            workspace.orders.map((order) => {
              const { presentation, linePrices } = mapWaiterOrderPresentation(
                order,
                { tableNumber: displayTable }
              );
              return (
                <OperationalOrderCard
                  key={order.orderId}
                  presentation={presentation}
                  language={language}
                  density="compact"
                  domain="orders"
                  showFinancial
                  showCustomer={false}
                  showSlaTimeline
                  showExecutionFooter={false}
                  actionMode="none"
                  linePrices={linePrices}
                />
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}

function formatDateTime(value: string, ar: boolean): string {
  const ms = Date.parse(
    value.includes("T") ? value : value.replace(" ", "T") + "Z"
  );
  if (!Number.isFinite(ms)) return value;
  try {
    return formatLocaleDateTime(new Date(ms), ar ? "ar" : "en", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}
