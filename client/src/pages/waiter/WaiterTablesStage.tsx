import { Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Props = {
  restaurantId: number;
  restaurantName: string;
  onSelectTable: (binding: {
    tableId: number;
    tableNumber: number;
    sessionId: number;
    sessionToken: string;
  }) => void;
  onBack?: () => void;
};

/**
 * WAITER-ORDERING-FOUNDATION-1 — table workspace.
 * Displays restaurant tables + Session Platform occupancy; attaches session on select.
 */
export function WaiterTablesStage({
  restaurantId,
  restaurantName,
  onSelectTable,
  onBack,
}: Props) {
  const { language } = useLanguage();
  const floorQuery = trpc.waiter.listFloorTables.useQuery(
    { restaurantId },
    { enabled: restaurantId > 0, refetchInterval: 15_000 }
  );
  const attachMutation = trpc.waiter.attachTable.useMutation();

  const handleSelect = async (table: {
    id: number;
    tableNumber: number;
  }) => {
    try {
      const attached = await attachMutation.mutateAsync({
        restaurantId,
        tableId: table.id,
        tableNumber: table.tableNumber,
      });
      onSelectTable({
        tableId: attached.tableId,
        tableNumber: attached.tableNumber,
        sessionId: attached.sessionId,
        sessionToken: attached.sessionToken,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : language === "ar"
          ? "تعذر فتح جلسة الطاولة"
          : "Could not attach table session";
      toast.error(message);
    }
  };

  if (floorQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  if (floorQuery.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white p-8 text-center">
        {language === "ar" ? "تعذر تحميل الطاولات" : "Could not load tables"}
      </div>
    );
  }

  const tables = floorQuery.data ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 px-4 py-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">
            {language === "ar" ? "مساحة النادل" : "Waiter workspace"}
          </p>
          <h1 className="text-2xl font-bold truncate">{restaurantName}</h1>
        </div>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-white/70"
          >
            {language === "ar" ? "المطاعم" : "Restaurants"}
          </button>
        ) : null}
      </header>

      <main className="px-4 py-6">
        <p className="text-sm text-white/60 mb-4">
          {language === "ar"
            ? "اختر طاولة لفتح جلسة المطعم والطلب"
            : "Select a table to attach the restaurant session and order"}
        </p>
        {tables.length === 0 ? (
          <p className="text-center text-white/50 py-16">
            {language === "ar" ? "لا توجد طاولات" : "No tables configured"}
          </p>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {tables.map((table) => {
              const occupied = table.status === "occupied";
              return (
                <li key={table.id}>
                  <button
                    type="button"
                    disabled={attachMutation.isPending}
                    onClick={() => void handleSelect(table)}
                    className={`w-full rounded-2xl border px-3 py-5 text-left transition ${
                      occupied
                        ? "border-amber-400/40 bg-amber-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <p className="text-xl font-bold">
                      {language === "ar" ? "طاولة" : "Table"} {table.tableNumber}
                    </p>
                    <p
                      className={`mt-2 text-xs font-medium ${
                        occupied ? "text-amber-300" : "text-teal-300"
                      }`}
                    >
                      {occupied
                        ? language === "ar"
                          ? "مشغولة"
                          : "Occupied"
                        : language === "ar"
                          ? "متاحة"
                          : "Available"}
                    </p>
                    {occupied && table.totalOrders != null ? (
                      <p className="mt-1 text-xs text-white/50">
                        {language === "ar" ? "طلبات" : "Orders"}:{" "}
                        {table.totalOrders}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
