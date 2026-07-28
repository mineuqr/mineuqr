/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1 — Trust Center hub
 */
import { MarketingCorporateShell } from "@/components/landing/MarketingCorporateShell";
import { getPublishedTrustResources } from "@/const/trustCenterRegistry";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShieldCheck } from "lucide-react";
import { Link } from "wouter";

export default function Trust() {
  const { t } = useLanguage();
  const resources = getPublishedTrustResources();

  return (
    <MarketingCorporateShell
      path="/trust"
      metaTitle={t("trust.metaTitle")}
      metaDescription={t("trust.metaDescription")}
      title={t("trust.title")}
      subtitle={t("trust.subtitle")}
      icon={ShieldCheck}
      navHref="/contact"
      navLabel={t("nav.contact")}
    >
      <p>{t("trust.intro")}</p>
      <ul className="space-y-4">
        {resources.map((r) => (
          <li key={r.id}>
            <Link
              href={r.path}
              className="block rounded-xl border border-border/40 bg-card/40 px-4 py-3 transition-colors hover:border-primary/40"
            >
              <span className="font-semibold text-foreground">
                {t(r.titleKey)}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {t(r.descriptionKey)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-sm">{t("trust.noCertNote")}</p>
    </MarketingCorporateShell>
  );
}
