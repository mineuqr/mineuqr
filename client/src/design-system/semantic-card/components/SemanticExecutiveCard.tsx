/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1 + SEMANTIC-CARD-PREMIUM-INTERACTION-1
 * Platform executive / analytics category card.
 * Presentation / motion only. Values from parent view model (canonical KPI sources).
 */
import type { ComponentType } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { semanticPanel, SEMANTIC_KPI_GRID } from "../tokens/panel";
import {
  SEMANTIC_DISABLED,
  SEMANTIC_EXECUTIVE_HOVER,
  SEMANTIC_ICON_HOVER,
  SEMANTIC_SURFACE_PREMIUM,
  SEMANTIC_VALUE_HOVER,
} from "../tokens/interaction";
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
      data-slot="semantic-executive-card"
      data-category={card.category}
      className={cn(
        SEMANTIC_SURFACE_PREMIUM,
        "group relative min-h-[7.5rem] overflow-hidden border p-4 text-start",
        "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_1px_2px_rgba(0,0,0,0.12)]",
        semanticPanel.radius.executive,
        semanticPanel.focusRing,
        SEMANTIC_DISABLED,
        interactive && cn("cursor-pointer", SEMANTIC_EXECUTIVE_HOVER, style.glow),
        !interactive && "cursor-default",
        style.shell
      )}
      aria-label={`${card.label}: ${card.value}. ${interactive ? drillHint : ""}`}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.22,1,0.36,1)] group-active:opacity-100"
        style={{
          background:
            "radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(255,255,255,0.14), transparent 42%)",
        }}
        aria-hidden
      />
      {/* Soft edge illumination */}
      <span
        className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60 motion-safe:transition-opacity motion-safe:duration-300 group-hover:opacity-100"
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
              style.value,
              SEMANTIC_VALUE_HOVER
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
                "mt-3 inline-flex items-center gap-1 text-[11px] font-medium opacity-70 motion-safe:transition-opacity motion-safe:duration-300 group-hover:opacity-100",
                style.icon
              )}
            >
              {drillHint}
              <DrillChevron
                className="h-3.5 w-3.5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-0.5 rtl:motion-safe:group-hover:-translate-x-0.5"
                aria-hidden
              />
            </p>
          ) : null}
        </div>
        <Icon
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 origin-center sm:h-6 sm:w-6",
            style.icon,
            SEMANTIC_ICON_HOVER
          )}
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
    <div className={cn(SEMANTIC_KPI_GRID.executive, className)}>
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
