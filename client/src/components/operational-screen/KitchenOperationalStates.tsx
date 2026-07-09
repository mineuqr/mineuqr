import { ChefHat, Loader2 } from "lucide-react";
import { kitchenIdleCopy } from "@/lib/operational-screen/operationalScreenPresentation";
import { cn } from "@/lib/utils";

const KITCHEN_GRID_CLASS =
  "grid auto-rows-fr grid-cols-[repeat(auto-fill,minmax(min(100%,17.5rem),1fr))] gap-3 sm:gap-3.5 lg:gap-4";

export function KitchenOperationalLoadingState({ language }: { language: string }) {
  const isAr = language === "ar";

  return (
    <div className="space-y-4" aria-busy="true" aria-label={isAr ? "جاري تحميل الطابور" : "Loading queue"}>
      <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-[#12161f]/60 px-4 py-3">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">
          {isAr ? "جاري تحميل الطابور..." : "Loading kitchen queue..."}
        </p>
      </div>
      <div className={KITCHEN_GRID_CLASS}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="min-h-[11rem] animate-pulse rounded-xl border border-border/20 bg-[#12161f]/70"
          />
        ))}
      </div>
    </div>
  );
}

export function KitchenOperationalIdleState({ language }: { language: string }) {
  const isAr = language === "ar";
  const copy = kitchenIdleCopy(isAr);

  return (
    <div
      className="flex min-h-[min(70vh,32rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-emerald-500/25 bg-[#12161f]/50 px-6 py-16 text-center"
      role="status"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30">
        <ChefHat className="h-10 w-10 text-emerald-400" aria-hidden />
      </div>
      <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{copy.title}</h2>
      <p className="mt-3 max-w-md text-lg font-medium text-muted-foreground">{copy.subtitle}</p>
    </div>
  );
}

export { KITCHEN_GRID_CLASS };
