import { useLanguage } from "@/contexts/LanguageContext";
import {
  BarChart3,
  Bell,
  ClipboardList,
  Grid3X3,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";

export function HeroPreview() {
  const { t } = useLanguage();

  return (
    <div className="landing-card relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <div className="mb-4 flex items-center justify-between gap-2 border-b border-border/30 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <UtensilsCrossed className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">MineuQR</p>
            <p className="text-[10px] text-muted-foreground">
              {t("home.platformBadge")}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {[
          { icon: ClipboardList, label: t("home.feature2Title"), value: "24" },
          { icon: Grid3X3, label: t("home.feature4Title"), value: "12" },
          { icon: Bell, label: t("home.feature8Title"), value: "3" },
          { icon: BarChart3, label: t("home.feature9Title"), value: "+18%" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/30 bg-background/40 p-3"
          >
            <item.icon className="mb-2 h-4 w-4 text-primary/80" />
            <p className="text-lg font-bold tabular-nums text-foreground">{item.value}</p>
            <p className="text-[10px] leading-snug text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/30 bg-background/30 p-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
          <QrCode className="h-8 w-8 text-primary/70" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-8 w-8 shrink-0 rounded-md bg-muted/30" />
              <div className="flex-1 space-y-1">
                <div className="h-2 w-3/4 max-w-[8rem] rounded-full bg-foreground/15" />
                <div className="h-1.5 w-1/2 rounded-full bg-muted-foreground/20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
