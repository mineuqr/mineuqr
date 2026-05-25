import { useAuth } from "@/_core/hooks/useAuth";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { LandingNavbar } from "@/components/landing/LandingNavbar";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
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
  Printer,
  QrCode,
  Smartphone,
  UtensilsCrossed,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

const platformFeatures: { icon: LucideIcon; titleKey: string; descKey: string }[] = [
  { icon: QrCode, titleKey: "home.feature1Title", descKey: "home.feature1Desc" },
  { icon: ClipboardList, titleKey: "home.feature2Title", descKey: "home.feature2Desc" },
  { icon: BarChart3, titleKey: "home.feature3Title", descKey: "home.feature3Desc" },
  { icon: Grid3X3, titleKey: "home.feature4Title", descKey: "home.feature4Desc" },
  { icon: UtensilsCrossed, titleKey: "home.feature5Title", descKey: "home.feature5Desc" },
  { icon: ConciergeBell, titleKey: "home.feature6Title", descKey: "home.feature6Desc" },
  { icon: Printer, titleKey: "home.feature7Title", descKey: "home.feature7Desc" },
  { icon: BellRing, titleKey: "home.feature8Title", descKey: "home.feature8Desc" },
  { icon: BarChart3, titleKey: "home.feature9Title", descKey: "home.feature9Desc" },
  { icon: Smartphone, titleKey: "home.feature10Title", descKey: "home.feature10Desc" },
  { icon: Zap, titleKey: "home.feature11Title", descKey: "home.feature11Desc" },
  { icon: Globe, titleKey: "home.feature12Title", descKey: "home.feature12Desc" },
];

const steps = [
  { num: "01", titleKey: "home.step1Title", descKey: "home.step1Desc", icon: Zap },
  { num: "02", titleKey: "home.step2Title", descKey: "home.step2Desc", icon: Layers },
  { num: "03", titleKey: "home.step3Title", descKey: "home.step3Desc", icon: QrCode },
] as const;

const stats = [
  { value: "12+", labelKey: "home.statFeatures" },
  { value: "2", labelKey: "home.statLanguages" },
  { value: "24/7", labelKey: "home.statUptime" },
  { value: "100%", labelKey: "home.statMobile" },
] as const;

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { t, dir } = useLanguage();

  const startHref = () => (isAuthenticated ? "/dashboard" : getLoginUrl());

  return (
    <div className="landing-page min-h-screen text-foreground">
      <LandingNavbar />

      {/* Hero */}
      <section className="relative pt-[5.5rem] pb-16 sm:pt-28 sm:pb-20 lg:pb-24">
        <div className="container relative">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-xl lg:max-w-none"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-xs font-medium tracking-wide text-primary sm:text-sm">
                  {t("home.platformBadge")}
                </span>
              </div>

              <h1 className="text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-[2.75rem] lg:leading-[1.12]">
                {t("home.heroHeadline")}
                <span className="mt-1 block text-gradient-teal">{t("home.heroHeadlineAccent")}</span>
              </h1>

              <p className="mt-5 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
                {t("home.subtitle")}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  size="lg"
                  onClick={() => setLocation(startHref())}
                  className="landing-btn-primary h-12 px-7 text-base"
                >
                  {t("common.startFree")}
                  <ArrowRight
                    className={cn("h-5 w-5 shrink-0", dir === "rtl" && "rotate-180")}
                  />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setLocation("/pricing")}
                  className="landing-btn-ghost h-12 px-7 text-base"
                >
                  {t("home.viewMenu")}
                </Button>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                {stats.map((stat) => (
                  <div
                    key={stat.labelKey}
                    className="rounded-xl border border-border/30 bg-white/[0.03] px-3 py-3 sm:px-4"
                  >
                    <p className="text-lg font-bold tabular-nums text-foreground sm:text-xl">
                      {stat.value}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                      {t(stat.labelKey)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.12 }}
              className="relative mx-auto w-full max-w-lg lg:max-w-none"
            >
              <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-primary/5 blur-2xl" />
              <HeroPreview />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/20 py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center sm:mb-14">
            <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t("home.allInOne")}
            </h2>
            <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("home.allInOneDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {platformFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.35, delay: (index % 3) * 0.05 }}
                  className="landing-card group rounded-2xl p-5 sm:p-6"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:scale-105">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/20 py-20 sm:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
              {t("home.howItWorks")}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("home.howItWorksDesc")}
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="relative text-center">
                  <div className="relative mx-auto mb-5 inline-flex">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border/40 bg-white/[0.04]">
                      <Icon className="h-7 w-7 text-primary" />
                    </div>
                    <span className="absolute -top-2 -end-2 rounded-lg border border-primary/30 bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                      {step.num}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{t(step.titleKey)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(step.descKey)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/20 py-20 sm:py-24">
        <div className="container">
          <div className="landing-card mx-auto max-w-3xl rounded-2xl px-6 py-10 text-center sm:px-10 sm:py-12">
            <LandingLogo imageClassName="mx-auto h-14 w-auto sm:h-16" />
            <h2 className="mt-6 text-balance text-2xl font-bold text-foreground sm:text-3xl">
              {t("home.ctaTitle")}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
              {t("home.ctaDesc")}
            </p>
            <Button
              size="lg"
              onClick={() => setLocation(startHref())}
              className="landing-btn-primary mt-8 h-12 px-8 text-base"
            >
              {t("home.ctaButton")}
              <ArrowRight className={cn("h-5 w-5", dir === "rtl" && "rotate-180")} />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/25 py-10 sm:py-12">
        <div className="container">
          <div className="flex flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col items-center gap-3 md:items-start">
              <LandingLogo imageClassName="h-12 w-auto sm:h-14" />
              <p className="max-w-xs text-center text-sm text-muted-foreground md:text-start">
                {t("home.platformBadge")}
              </p>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
              {[
                { href: "/about", label: t("home.aboutUs") },
                { href: "/pricing", label: t("home.plans") },
                { href: "/contact", label: t("home.contactUs") },
                { href: "/terms", label: t("home.termsOfService") },
                { href: "/privacy", label: t("home.privacyPolicy") },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setLocation(link.href);
                  }}
                  className="text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            {t("home.allRightsReserved")} &copy; {new Date().getFullYear()} MineuQR
          </p>
        </div>
      </footer>
    </div>
  );
}
