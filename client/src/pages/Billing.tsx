/**
 * GLOBAL-SAAS-COMPLIANCE-AND-PAYMENT-READINESS-1
 * Billing, cancellation, and refund policy — mirrors existing Terms (no new claims).
 */
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { useMarketingDocumentMeta } from "@/components/landing/useMarketingDocumentMeta";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { MINEUQR_LOGO_SRC, MINEUQR_BRAND_NAME } from "@/const/branding";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { CreditCard } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Billing() {
  const { t, language, dir } = useLanguage();
  const [, setLocation] = useLocation();

  useMarketingDocumentMeta({
    title: t("billing.metaTitle"),
    description: t("billing.metaDescription"),
    path: "/billing",
  });

  const sections = [
    { title: t("billing.s1Title"), body: t("billing.s1Body") },
    { title: t("billing.s2Title"), body: t("billing.s2Body") },
    { title: t("billing.s3Title"), body: t("billing.s3Body") },
    { title: t("billing.s4Title"), body: t("billing.s4Body") },
    { title: t("billing.s5Title"), body: t("billing.s5Body") },
  ] as const;

  return (
    <div className="landing-page min-h-screen text-foreground" dir={dir}>
      <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="brand-mark flex items-center gap-2 rounded-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label={language === "ar" ? "الصفحة الرئيسية" : "Go to homepage"}
          >
            <img
              src={MINEUQR_LOGO_SRC}
              alt={MINEUQR_BRAND_NAME}
              className="h-12 w-auto object-contain"
              draggable={false}
            />
            <span className="text-lg font-bold text-foreground">
              {MINEUQR_BRAND_NAME}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => setLocation("/pricing")}>
              {t("nav.pricing")}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container max-w-3xl py-12 sm:py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("billing.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("billing.subtitle")}
            </p>
          </div>
        </div>

        <div className="space-y-8 text-muted-foreground leading-relaxed">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 text-xl font-semibold text-foreground">
                {s.title}
              </h2>
              <p>{s.body}</p>
            </section>
          ))}
          <section>
            <h2 className="mb-2 text-xl font-semibold text-foreground">
              {t("billing.contactTitle")}
            </h2>
            <p>
              {t("billing.contactText")}{" "}
              <a
                href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {MINEUQR_PUBLIC_SUPPORT_EMAIL}
              </a>
              .{" "}
              <Link href="/terms" className="text-primary underline-offset-2 hover:underline">
                {t("home.termsOfService")}
              </Link>
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
