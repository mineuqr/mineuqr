/**
 * LANDING-PAGE-VISUAL-POLISH-1 + LANDING-DESIGN-SYSTEM-ALIGNMENT-1
 * Live-feeling product chrome — illustrative UI only (not claimed metrics).
 * Surfaces inherit restaurantDash recipes via landingDesignSystem bridge.
 */
import {
  landingDashHeroPanel,
  landingDashIcon,
  landingDashInset,
  landingDashStatusLive,
  landingDashStatusOk,
} from "@/components/landing/landingDesignSystem";
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
        landingDashHeroPanel,
        "landing-product-frame p-4 sm:p-5",
        !reducedMotion && "landing-preview-alive"
      )}
      role="img"
      aria-label={t("home.platformBadge")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
      <div
        className={cn(
          "pointer-events-none absolute -end-10 -top-12 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl",
          !reducedMotion && "landing-preview-glow"
        )}
      />
      <div className="pointer-events-none absolute -start-8 bottom-0 h-36 w-36 rounded-full bg-orange-500/10 blur-3xl" />

      <div className="relative mb-4 flex items-center justify-between gap-2 border-b border-cyan-500/15 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={landingDashIcon}>
            <UtensilsCrossed />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-white">
              MineuQR
            </p>
            <p className="text-[11px] text-slate-400">
              {t("home.platformBadge")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "hidden sm:inline-flex",
              landingDashStatusOk,
              !reducedMotion && "landing-status-soft"
            )}
          >
            <Check className="h-2.5 w-2.5" aria-hidden />
            OK
          </span>
          <span className={landingDashStatusLive}>
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgb(34_211_238_/_0.8)]",
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
              <p className="text-lg font-bold tabular-nums tracking-tight text-white">
                {item.value}
              </p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-400">
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
                        "w-full rounded-sm bg-cyan-400/35",
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

      <div className={cn(landingDashInset, "relative mt-3 flex items-center gap-3")}>
        <div
          className={cn(
            landingDashIcon,
            "h-14 w-14 [&_svg]:size-8"
          )}
        >
          <QrCode aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-white">
              {t("home.feature1Title")}
            </p>
            <svg
              className={cn(
                "h-4 w-12 shrink-0 stroke-cyan-400/80 opacity-80",
                !reducedMotion && "landing-sparkline"
              )}
              fill="none"
              strokeWidth="1.5"
              viewBox="0 0 48 16"
              aria-hidden
            >
              <path d="M1 12 C8 12 10 4 16 6 C22 8 24 2 30 4 C36 6 40 10 47 5" />
            </svg>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {t("home.previewGuestLine")}
          </p>
          <div className="mt-2 flex gap-1.5">
            {["QR", "Kiosk", "Waiter"].map((label) => (
              <span
                key={label}
                className="rounded-md border border-cyan-500/20 bg-slate-900/60 px-1.5 py-0.5 text-[9px] text-slate-400 transition-colors hover:border-cyan-400/30 hover:text-cyan-300"
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
