/**
 * LANDING-PAGE-EXPERIENCE-1 + LANDING-PAGE-VISUAL-POLISH-1
 * Public landing — Restaurant OS storytelling within existing MineuQR visual system.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { ProductJourney } from "@/components/landing/ProductJourney";
import { useMarketingDocumentMeta } from "@/components/landing/useMarketingDocumentMeta";
import { usePrefersReducedMotion } from "@/components/landing/usePrefersReducedMotion";
import { Button } from "@/components/ui/button";
import { getRegisterUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  ClipboardList,
  ConciergeBell,
  Globe,
  Grid3X3,
  Layers,
  QrCode,
  ShieldCheck,
  Smartphone,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

const primaryFeatures: {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  accent: string;
}[] = [
  {
    icon: QrCode,
    titleKey: "home.feature1Title",
    descKey: "home.feature1Desc",
    accent: "qr",
  },
  {
    icon: ClipboardList,
    titleKey: "home.feature2Title",
    descKey: "home.feature2Desc",
    accent: "ordering",
  },
  {
    icon: UtensilsCrossed,
    titleKey: "home.featureOpsTitle",
    descKey: "home.featureOpsDesc",
    accent: "kitchen",
  },
  {
    icon: BarChart3,
    titleKey: "home.feature9Title",
    descKey: "home.feature9Desc",
    accent: "analytics",
  },
  {
    icon: Grid3X3,
    titleKey: "home.feature4Title",
    descKey: "home.feature4Desc",
    accent: "tables",
  },
  {
    icon: Globe,
    titleKey: "home.feature12Title",
    descKey: "home.feature12Desc",
    accent: "lang",
  },
];

const secondaryFeatures: {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}[] = [
  {
    icon: ConciergeBell,
    titleKey: "home.feature5Title",
    descKey: "home.feature5Desc",
  },
  {
    icon: BellRing,
    titleKey: "home.feature8Title",
    descKey: "home.feature8Desc",
  },
  {
    icon: Smartphone,
    titleKey: "home.feature10Title",
    descKey: "home.feature10Desc",
  },
  { icon: Zap, titleKey: "home.feature11Title", descKey: "home.feature11Desc" },
  {
    icon: ClipboardList,
    titleKey: "home.feature6Title",
    descKey: "home.feature6Desc",
  },
  {
    icon: BarChart3,
    titleKey: "home.feature3Title",
    descKey: "home.feature3Desc",
  },
];

const steps = [
  {
    num: "01",
    titleKey: "home.step1Title",
    descKey: "home.step1Desc",
    icon: Zap,
  },
  {
    num: "02",
    titleKey: "home.step2Title",
    descKey: "home.step2Desc",
    icon: Layers,
  },
  {
    num: "03",
    titleKey: "home.step3Title",
    descKey: "home.step3Desc",
    icon: QrCode,
  },
  {
    num: "04",
    titleKey: "home.step4Title",
    descKey: "home.step4Desc",
    icon: BarChart3,
  },
] as const;

const trustLinks = [
  { href: "/trust", labelKey: "footer.trust", icon: ShieldCheck },
  { href: "/security", labelKey: "footer.security", icon: ShieldCheck },
  { href: "/pricing", labelKey: "home.trialHint", icon: Zap },
] as const;

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t, dir } = useLanguage();
  const reducedMotion = usePrefersReducedMotion();

  useMarketingDocumentMeta({
    title: t("home.heroTitle"),
    description: t("home.allInOneDesc"),
    path: "/",
  });

  const startHref = () => (isAuthenticated ? "/dashboard" : getRegisterUrl());

  const fadeUp = (delay = 0) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, delay },
        };

  const scrollToJourney = () => {
    document.getElementById("journey")?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div className="landing-page min-h-screen text-foreground">
      <LandingNavbar />

      {/* Hero — brand, headline, support, CTAs, product preview */}
      <section className="landing-hero relative overflow-hidden pt-[5.5rem] pb-14 sm:pt-28 sm:pb-20 lg:pb-24">
        <div className="landing-hero-aurora" aria-hidden />
        <div className="container relative">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-[4.5rem]">
            <motion.div {...fadeUp(0)} className="max-w-xl lg:max-w-none">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 shadow-[0_0_24px_oklch(0.65_0.14_195_/_0.12)] backdrop-blur-sm">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-primary",
                    !reducedMotion && "landing-pulse-dot"
                  )}
                />
                <span className="text-xs font-medium tracking-wide text-primary sm:text-sm">
                  {t("home.platformBadge")}
                </span>
              </div>

              <h1 className="landing-headline text-balance text-[1.9rem] font-bold leading-[1.1] text-foreground sm:text-4xl md:text-5xl lg:text-[2.9rem] lg:leading-[1.08]">
                {t("home.heroHeadline")}
                <span className="mt-2 block text-gradient-teal">
                  {t("home.heroHeadlineAccent")}
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg sm:leading-relaxed">
                {t("home.subtitle")}
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  onClick={() => setLocation(startHref())}
                  className="landing-btn-primary h-12 px-7 text-base"
                >
                  {t("common.startFree")}
                  <ArrowRight
                    className={cn(
                      "h-5 w-5 shrink-0",
                      dir === "rtl" && "rotate-180"
                    )}
                  />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToJourney}
                  className="landing-btn-ghost h-12 px-7 text-base"
                >
                  {t("home.explorePlatform")}
                </Button>
              </div>

              <p className="mt-5 text-xs leading-relaxed text-muted-foreground/90 sm:text-sm">
                {t("home.heroSupport")}
              </p>
            </motion.div>

            <motion.div
              {...fadeUp(0.1)}
              className="landing-product-stage relative mx-auto w-full max-w-lg lg:max-w-none"
            >
              <HeroPreview />
            </motion.div>
          </div>

          {/* Trust / capability strip — below hero composition */}
          <motion.div
            {...(reducedMotion
              ? {}
              : {
                  initial: { opacity: 0, y: 10 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true },
                  transition: { duration: 0.4, delay: 0.15 },
                })}
            className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-border/25 pt-9 text-sm text-muted-foreground sm:justify-between lg:mt-16"
          >
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              <span className="font-medium text-foreground/90">
                {t("home.statLanguagesLabel")}
              </span>
              <span className="hidden h-3 w-px bg-border/50 sm:inline-block" />
              <span>{t("home.statModulesLabel")}</span>
              <span className="hidden h-3 w-px bg-border/50 sm:inline-block" />
              <span>{t("home.statMobileLabel")}</span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {trustLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <button
                    key={link.href + link.labelKey}
                    type="button"
                    onClick={() => setLocation(link.href)}
                    className="landing-trust-chip"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary/80" aria-hidden />
                    {t(link.labelKey)}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <ProductJourney />

      {/* Primary capabilities */}
      <section
        id="features"
        className="landing-section-soft border-t border-border/20 py-20 sm:py-24"
      >
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
            <h2 className="landing-headline text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t("home.allInOne")}
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("home.allInOneDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {primaryFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.titleKey}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={
                    reducedMotion ? undefined : { opacity: 1, y: 0 }
                  }
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.32,
                    delay: reducedMotion ? 0 : (index % 3) * 0.05,
                  }}
                  data-accent={feature.accent}
                  className="landing-card group rounded-2xl p-5 sm:p-6 hover:-translate-y-1"
                >
                  <div className="landing-accent-icon mb-4 flex h-11 w-11 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {secondaryFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.titleKey}
                  className="landing-secondary-row"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">
                      {t(feature.titleKey)}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {t(feature.descKey)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/20 py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
            <h2 className="landing-headline text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t("home.howItWorks")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("home.howItWorksDesc")}
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.num}
                  initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                  whileInView={
                    reducedMotion ? undefined : { opacity: 1, y: 0 }
                  }
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.32,
                    delay: reducedMotion ? 0 : index * 0.05,
                  }}
                  className="relative text-center lg:text-start"
                >
                  <div className="relative mx-auto mb-5 inline-flex lg:mx-0">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-white/[0.045] shadow-[0_0_24px_oklch(0.65_0.1_195_/_0.08)] transition-transform duration-200 hover:scale-105">
                      <Icon className="h-6 w-6 text-primary" aria-hidden />
                    </div>
                    <span className="absolute -top-2 -end-2 rounded-lg border border-primary/30 bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary shadow-[0_0_12px_oklch(0.65_0.14_195_/_0.2)]">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
                    {t(step.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(step.descKey)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-section-soft border-t border-border/20 py-20 sm:py-24">
        <div className="container">
          <div
            data-accent="mgmt"
            className="landing-card relative mx-auto max-w-3xl overflow-hidden rounded-2xl px-6 py-11 text-center sm:px-10 sm:py-14"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.65_0.14_195_/_0.1),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="relative">
              <LandingLogo imageClassName="mx-auto h-14 w-auto sm:h-16" />
              <h2 className="landing-headline mt-6 text-balance text-2xl font-bold text-foreground sm:text-3xl">
                {t("home.ctaTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                {t("home.ctaDesc")}
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => setLocation(startHref())}
                  className="landing-btn-primary h-12 px-8 text-base"
                >
                  {t("home.ctaButton")}
                  <ArrowRight
                    className={cn("h-5 w-5", dir === "rtl" && "rotate-180")}
                  />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/pricing")}
                  className="landing-btn-ghost h-12 px-8 text-base"
                >
                  {t("home.viewMenu")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
