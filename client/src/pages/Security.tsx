/**
 * GLOBAL-SAAS-COMPLIANCE-AND-PAYMENT-READINESS-1
 * Public security overview — factual claims only (no fabricated certifications).
 */
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { useMarketingDocumentMeta } from "@/components/landing/useMarketingDocumentMeta";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { MINEUQR_LOGO_SRC, MINEUQR_BRAND_NAME } from "@/const/branding";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function Security() {
  const { t, language, dir } = useLanguage();
  const [, setLocation] = useLocation();

  useMarketingDocumentMeta({
    title: t("security.metaTitle"),
    description: t("security.metaDescription"),
    path: "/security",
  });

  const sections = [
    { title: t("security.s1Title"), body: t("security.s1Body") },
    { title: t("security.s2Title"), body: t("security.s2Body") },
    { title: t("security.s3Title"), body: t("security.s3Body") },
    { title: t("security.s4Title"), body: t("security.s4Body") },
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
            <Button variant="ghost" onClick={() => setLocation("/contact")}>
              {t("nav.contact")}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container max-w-3xl py-12 sm:py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Shield className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("security.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("security.subtitle")}
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
              {t("security.contactTitle")}
            </h2>
            <p>
              {t("security.contactText")}{" "}
              <a
                href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}`}
                className="text-primary underline-offset-2 hover:underline"
              >
                {MINEUQR_PUBLIC_SUPPORT_EMAIL}
              </a>
              .{" "}
              <Link href="/security/disclosure" className="text-primary underline-offset-2 hover:underline">
                {t("footer.disclosure")}
              </Link>
              {" · "}
              <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
                {t("home.privacyPolicy")}
              </Link>
            </p>
          </section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
