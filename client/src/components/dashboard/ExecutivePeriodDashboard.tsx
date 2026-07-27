/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-1/2 — Interactive executive period cards.
 * Presentation / motion only. Values from parent view model.
 */
import type { ComponentType } from "react";
import {
  Banknote,
  CreditCard,
  ClipboardList,
  Receipt,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  ExecutivePeriodCard,
  ExecutivePeriodCardCategory,
} from "@/lib/reporting-exports/executivePeriodDashboard";

const CATEGORY_STYLE: Record<
  ExecutivePeriodCardCategory,
  {
    shell: string;
    icon: string;
    value: string;
    glow: string;
  }
> = {
  cash: {
    shell:
      "border-emerald-500/35 bg-gradient-to-b from-emerald-950/45 to-slate-900/85",
    icon: "text-emerald-400",
    value: "text-emerald-300",
    glow: "hover:shadow-emerald-500/25",
  },
  card: {
    shell:
      "border-sky-500/35 bg-gradient-to-b from-sky-950/40 to-slate-900/85",
    icon: "text-sky-400",
    value: "text-sky-300",
    glow: "hover:shadow-sky-500/25",
  },
  refund: {
    shell:
      "border-rose-500/35 bg-gradient-to-b from-rose-950/40 to-slate-900/85",
    icon: "text-rose-400",
    value: "text-rose-300",
    glow: "hover:shadow-rose-500/25",
  },
  tax: {
    shell:
      "border-violet-500/35 bg-gradient-to-b from-violet-950/40 to-slate-900/85",
    icon: "text-violet-400",
    value: "text-violet-300",
    glow: "hover:shadow-violet-500/25",
  },
  orders: {
    shell:
      "border-orange-500/35 bg-gradient-to-b from-orange-950/35 to-slate-900/85",
    icon: "text-orange-400",
    value: "text-orange-300",
    glow: "hover:shadow-orange-500/25",
  },
  net: {
    shell:
      "border-teal-500/40 bg-gradient-to-b from-teal-950/50 to-slate-900/90 sm:col-span-2 lg:col-span-2",
    icon: "text-teal-300",
    value:
      "bg-gradient-to-b from-teal-200 via-emerald-300 to-teal-400 bg-clip-text text-transparent",
    glow: "hover:shadow-teal-500/30",
  },
};

const CATEGORY_ICON: Record<
  ExecutivePeriodCardCategory,
  ComponentType<{ className?: string }>
> = {
  cash: Banknote,
  card: CreditCard,
  refund: RotateCcw,
  tax: Receipt,
  orders: ClipboardList,
  net: Sparkles,
};

export function ExecutivePeriodKpiCard({
  card,
  onActivate,
  language = "en",
}: {
  card: ExecutivePeriodCard;
  onActivate?: (card: ExecutivePeriodCard) => void;
  language?: "en" | "ar";
}) {
  const style = CATEGORY_STYLE[card.category];
  const Icon = CATEGORY_ICON[card.category];
  const interactive = typeof onActivate === "function";
  const isAr = language === "ar";
  const DrillChevron = isAr ? ChevronLeft : ChevronRight;
  const drillHint = isAr ? "عرض التفاصيل" : "View details";

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={() => onActivate?.(card)}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onActivate?.(card);
        }
      }}
      onPointerDown={(e) => {
        const el = e.currentTarget;
        const rect = el.getBoundingClientRect();
        el.style.setProperty("--x", `${e.clientX - rect.left}px`);
        el.style.setProperty("--y", `${e.clientY - rect.top}px`);
      }}
      className={cn(
        "group relative min-h-[7.5rem] overflow-hidden rounded-2xl border p-4 text-start shadow-sm",
        "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        "focus-visible:ring-cyan-400/60",
        interactive &&
          "cursor-pointer motion-safe:hover:-translate-y-1 motion-safe:hover:scale-[1.02] motion-safe:hover:shadow-xl motion-safe:active:scale-[0.98]",
        !interactive && "cursor-default",
        style.shell,
        style.glow
      )}
      aria-label={`${card.label}: ${card.value}. ${interactive ? drillHint : ""}`}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-200 group-active:opacity-100"
        style={{
          background:
            "radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.16), transparent 42%)",
        }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-400 sm:text-sm">
            {card.label}
          </p>
          <p
            dir="ltr"
            className={cn(
              "mt-2 text-end text-2xl font-bold tabular-nums tracking-tight sm:text-start sm:text-3xl",
              style.value
            )}
          >
            {card.value}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
            {card.caption}
          </p>
          {interactive ? (
            <p
              className={cn(
                "mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-70 transition-opacity group-hover:opacity-100",
                style.icon
              )}
            >
              {drillHint}
              <DrillChevron className="h-3.5 w-3.5" aria-hidden />
            </p>
          ) : null}
        </div>
        <Icon
          className={cn("mt-0.5 h-5 w-5 shrink-0 sm:h-6 sm:w-6", style.icon)}
          aria-hidden
        />
      </div>
    </button>
  );
}

export function ExecutivePeriodDashboardGrid({
  cards,
  onActivate,
  language = "en",
}: {
  cards: readonly ExecutivePeriodCard[];
  onActivate?: (card: ExecutivePeriodCard) => void;
  language?: "en" | "ar";
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:gap-5 lg:gap-4">
      {cards.map((card) => (
        <ExecutivePeriodKpiCard
          key={card.id}
          card={card}
          onActivate={onActivate}
          language={language}
        />
      ))}
    </div>
  );
}
