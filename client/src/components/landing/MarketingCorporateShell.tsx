/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1
 * Shared chrome for corporate / trust marketing pages (no redesign).
 */
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { useMarketingDocumentMeta } from "@/components/landing/useMarketingDocumentMeta";
import { Button } from "@/components/ui/button";
import { MINEUQR_BRAND_NAME, MINEUQR_LOGO_SRC } from "@/const/branding";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

export function MarketingCorporateShell(props: {
  title: string;
  subtitle: string;
  metaTitle: string;
  metaDescription: string;
  path: string;
  icon: LucideIcon;
  children: ReactNode;
  navHref?: string;
  navLabel?: string;
}) {
  const { t, language, dir } = useLanguage();
  const [, setLocation] = useLocation();
  const Icon = props.icon;

  useMarketingDocumentMeta({
    title: props.metaTitle,
    description: props.metaDescription,
    path: props.path,
  });

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
            <span className="text-lg font-bold text-foreground">{MINEUQR_BRAND_NAME}</span>
          </button>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              onClick={() => setLocation(props.navHref ?? "/trust")}
            >
              {props.navLabel ?? t("footer.trust")}
            </Button>
          </div>
        </div>
      </nav>

      <main className="container max-w-3xl py-12 sm:py-16">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {props.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{props.subtitle}</p>
          </div>
        </div>
        <div className="space-y-8 text-muted-foreground leading-relaxed">
          {props.children}
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
