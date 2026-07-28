/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Platform executive / analytics category card.
 * Presentation / motion only. Values from parent view model (canonical KPI sources).
 */
import type { ComponentType } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { semanticPanel } from "../tokens/panel";
import {
  SEMANTIC_CATEGORY_ICON,
  semanticCategorySurface,
  type SemanticExecutiveCategory,
} from "../tokens/category";

export type SemanticExecutiveCardModel = {
  id: string;
  category: Exclude<SemanticExecutiveCategory, "neutral">;
  label: string;
  value: string;
  caption: string;
};

export function SemanticExecutiveCard({
  card,
  onActivate,
  language = "en",
  icon: IconOverride,
}: {
  card: SemanticExecutiveCardModel;
  onActivate?: (card: SemanticExecutiveCardModel) => void;
  language?: "en" | "ar";
  icon?: ComponentType<{ className?: string }>;
}) {
  const style = semanticCategorySurface(card.category);
  const Icon = IconOverride ?? SEMANTIC_CATEGORY_ICON[card.category];
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
        "group relative min-h-[7.5rem] overflow-hidden border p-4 text-start shadow-sm",
        semanticPanel.radius.executive,
        "motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-out",
        semanticPanel.focusRing,
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

export function SemanticExecutiveGrid({
  cards,
  onActivate,
  language = "en",
  className,
}: {
  cards: readonly SemanticExecutiveCardModel[];
  onActivate?: (card: SemanticExecutiveCardModel) => void;
  language?: "en" | "ar";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:gap-5 lg:gap-4",
        className
      )}
    >
      {cards.map((card) => (
        <SemanticExecutiveCard
          key={card.id}
          card={card}
          onActivate={onActivate}
          language={language}
        />
      ))}
    </div>
  );
}
