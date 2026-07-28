/**
 * LANDING-PAGE-VISUAL-POLISH-1
 * Live-feeling product chrome — illustrative UI only (not claimed metrics).
 */
import { usePrefersReducedMotion } from "@/components/landing/usePrefersReducedMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Check,
  ClipboardList,
  CreditCard,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";

const TILES = [
  {
    icon: ClipboardList,
    labelKey: "home.feature2Title",
    value: "24",
    accent: "ordering",
  },
  {
    icon: UtensilsCrossed,
    labelKey: "home.journeyKitchen",
    value: "8",
    accent: "kitchen",
  },
  {
    icon: CreditCard,
    labelKey: "home.journeyPayments",
    value: "Tap",
    accent: "payments",
  },
  {
    icon: BarChart3,
    labelKey: "home.feature9Title",
    value: "+18%",
    accent: "analytics",
  },
] as const;

const CHART_HEIGHTS = [38, 62, 48, 78, 56, 88, 70] as const;

export function HeroPreview() {
  const { t } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      className={cn(
        "landing-card landing-product-frame relative overflow-hidden rounded-2xl p-4 sm:p-5",
        !reducedMotion && "landing-preview-alive"
      )}
      role="img"
      aria-label={t("home.platformBadge")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
      <div
        className={cn(
          "pointer-events-none absolute -end-10 -top-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl",
          !reducedMotion && "landing-preview-glow"
        )}
      />
      <div className="pointer-events-none absolute -start-8 bottom-0 h-36 w-36 rounded-full bg-[oklch(0.68_0.1_55_/_0.08)] blur-3xl" />

      <div className="relative mb-4 flex items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 shadow-[0_0_20px_oklch(0.65_0.14_195_/_0.2)]">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              MineuQR
            </p>
            <p className="text-[11px] text-muted-foreground">
              {t("home.platformBadge")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "hidden items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-medium text-emerald-300/90 sm:inline-flex",
              !reducedMotion && "landing-status-soft"
            )}
          >
            <Check className="h-2.5 w-2.5" aria-hidden />
            OK
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/12 px-2.5 py-1 text-[10px] font-medium text-primary">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.65_0.18_195_/_0.8)]",
                !reducedMotion && "landing-pulse-dot"
              )}
            />
            {t("home.previewLive")}
          </span>
        </div>
      </div>

      <div className="relative grid grid-cols-2 gap-2.5 sm:gap-3">
        {TILES.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={item.labelKey}
              data-accent={item.accent}
              className={cn(
                "landing-card group/tile rounded-xl p-3 transition-transform duration-200 hover:-translate-y-0.5",
                !reducedMotion && "landing-preview-tile"
              )}
              style={
                !reducedMotion ? { animationDelay: `${i * 70}ms` } : undefined
              }
            >
              <Icon
                className="mb-2 h-4 w-4"
                style={{ color: "var(--accent)" }}
                aria-hidden
              />
              <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">
                {item.value}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                {t(item.labelKey)}
              </p>
              {item.accent === "analytics" ? (
                <div
                  className="mt-2 flex h-7 items-end gap-0.5"
                  aria-hidden
                >
                  {CHART_HEIGHTS.map((h, bi) => (
                    <span
                      key={bi}
                      className={cn(
                        "w-full rounded-sm bg-primary/35",
                        !reducedMotion && "landing-chart-bar"
                      )}
                      style={{
                        height: `${h}%`,
                        animationDelay: reducedMotion
                          ? undefined
                          : `${120 + bi * 60}ms`,
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="relative mt-3 flex items-center gap-3 rounded-xl border border-border/35 bg-background/40 p-3 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)] transition-colors hover:border-primary/35">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/12 shadow-[0_0_24px_oklch(0.65_0.14_195_/_0.15)]">
          <QrCode className="h-8 w-8 text-primary/85" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-foreground">
              {t("home.feature1Title")}
            </p>
            <svg
              className={cn(
                "h-4 w-12 shrink-0 opacity-80",
                !reducedMotion && "landing-sparkline"
              )}
              viewBox="0 0 48 16"
              aria-hidden
            >
              <path d="M1 12 C8 12 10 4 16 6 C22 8 24 2 30 4 C36 6 40 10 47 5" />
            </svg>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t("home.previewGuestLine")}
          </p>
          <div className="mt-2 flex gap-1.5">
            {["QR", "Kiosk", "Waiter"].map((label) => (
              <span
                key={label}
                className="rounded-md border border-border/40 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground/80"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
