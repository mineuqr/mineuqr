/**
 * LANDING-PAGE-EXPERIENCE-1
 * Interactive restaurant OS preview for the hero — CSS-light, no heavy assets.
 */
import { usePrefersReducedMotion } from "@/components/landing/usePrefersReducedMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";

export function HeroPreview() {
  const { t } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();

  const tiles = [
    { icon: ClipboardList, label: t("home.feature2Title"), value: "24" },
    { icon: UtensilsCrossed, label: t("home.journeyKitchen"), value: "8" },
    { icon: CreditCard, label: t("home.journeyPayments"), value: "Tap" },
    { icon: BarChart3, label: t("home.feature9Title"), value: "+18%" },
  ] as const;

  return (
    <div
      className={cn(
        "landing-card relative overflow-hidden rounded-2xl p-4 sm:p-5",
        !reducedMotion && "landing-preview-alive"
      )}
      aria-hidden={false}
      role="img"
      aria-label={t("home.platformBadge")}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div
        className={cn(
          "pointer-events-none absolute -end-8 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl",
          !reducedMotion && "landing-preview-glow"
        )}
      />

      <div className="relative mb-4 flex items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/25 bg-primary/15">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">MineuQR</p>
            <p className="text-[11px] text-muted-foreground">
              {t("home.platformBadge")}
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-medium text-primary">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full bg-primary",
              !reducedMotion && "landing-pulse-dot"
            )}
          />
          {t("home.previewLive")}
        </span>
      </div>

      <div className="relative grid grid-cols-2 gap-2.5 sm:gap-3">
        {tiles.map((item, i) => (
          <div
            key={item.label}
            className={cn(
              "rounded-xl border border-border/30 bg-background/45 p-3 transition-colors duration-200 hover:border-primary/35 hover:bg-background/60",
              !reducedMotion && "landing-preview-tile"
            )}
            style={
              !reducedMotion
                ? { animationDelay: `${i * 80}ms` }
                : undefined
            }
          >
            <item.icon className="mb-2 h-4 w-4 text-primary/85" aria-hidden />
            <p className="text-lg font-bold tabular-nums tracking-tight text-foreground">
              {item.value}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="relative mt-3 flex items-center gap-3 rounded-xl border border-border/30 bg-background/35 p-3 transition-colors hover:border-primary/30">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10">
          <QrCode className="h-8 w-8 text-primary/80" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {t("home.feature1Title")}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t("home.previewGuestLine")}
          </p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-md border border-border/40 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-muted-foreground">
              QR
            </span>
            <span className="rounded-md border border-border/40 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-muted-foreground">
              Kiosk
            </span>
            <span className="rounded-md border border-border/40 bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-muted-foreground">
              Waiter
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
