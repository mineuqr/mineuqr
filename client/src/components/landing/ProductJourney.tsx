/**
 * LANDING-PAGE-EXPERIENCE-1
 * Restaurant OS product journey — storytelling without fabricated claims.
 */
import { usePrefersReducedMotion } from "@/components/landing/usePrefersReducedMotion";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ClipboardList,
  CreditCard,
  QrCode,
  Settings2,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const STEPS: {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  accent: string;
}[] = [
  {
    icon: QrCode,
    titleKey: "home.journeyMenu",
    descKey: "home.journeyMenuDesc",
    accent: "qr",
  },
  {
    icon: ClipboardList,
    titleKey: "home.journeyOrdering",
    descKey: "home.journeyOrderingDesc",
    accent: "ordering",
  },
  {
    icon: UtensilsCrossed,
    titleKey: "home.journeyKitchen",
    descKey: "home.journeyKitchenDesc",
    accent: "kitchen",
  },
  {
    icon: CreditCard,
    titleKey: "home.journeyPayments",
    descKey: "home.journeyPaymentsDesc",
    accent: "payments",
  },
  {
    icon: BarChart3,
    titleKey: "home.journeyAnalytics",
    descKey: "home.journeyAnalyticsDesc",
    accent: "analytics",
  },
  {
    icon: Settings2,
    titleKey: "home.journeyManagement",
    descKey: "home.journeyManagementDesc",
    accent: "mgmt",
  },
  {
    icon: TrendingUp,
    titleKey: "home.journeyGrowth",
    descKey: "home.journeyGrowthDesc",
    accent: "growth",
  },
];

export function ProductJourney() {
  const { t, dir } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section
      id="journey"
      className="landing-section-soft border-t border-border/20 py-20 sm:py-24"
    >
      <div className="container">
        <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            {t("home.journeyEyebrow")}
          </p>
          <h2 className="landing-headline text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {t("home.journeyTitle")}
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("home.journeyDesc")}
          </p>
        </div>

        <ol className="relative mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.li
                key={step.titleKey}
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                whileInView={reducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-32px" }}
                transition={{
                  duration: 0.35,
                  delay: reducedMotion ? 0 : Math.min(index, 6) * 0.04,
                }}
                data-accent={step.accent}
                className="landing-card group relative rounded-2xl p-4 sm:p-5 hover:-translate-y-0.5"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="landing-accent-icon flex h-10 w-10 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <span
                    className="text-[11px] font-bold tabular-nums"
                    style={{ color: "var(--accent)" }}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="text-sm font-semibold tracking-tight text-foreground sm:text-base">
                  {t(step.titleKey)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {t(step.descKey)}
                </p>
                {index < STEPS.length - 1 ? (
                  <ArrowRight
                    className={cn(
                      "pointer-events-none absolute -bottom-2 end-4 hidden h-4 w-4 text-primary/35 lg:hidden",
                      dir === "rtl" && "rotate-180"
                    )}
                    aria-hidden
                  />
                ) : null}
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
