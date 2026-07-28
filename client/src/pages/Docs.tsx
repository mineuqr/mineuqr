/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1 — Public docs entry (no fabricated docs site)
 */
import { MarketingCorporateShell } from "@/components/landing/MarketingCorporateShell";
import { MINEUQR_PUBLIC_DOCS_URL } from "@/const/publicPresence";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { getLoginUrl, getRegisterUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function Docs() {
  const { t } = useLanguage();
  const external = MINEUQR_PUBLIC_DOCS_URL;

  return (
    <MarketingCorporateShell
      path="/docs"
      metaTitle={t("docs.metaTitle")}
      metaDescription={t("docs.metaDescription")}
      title={t("docs.title")}
      subtitle={t("docs.subtitle")}
      icon={BookOpen}
    >
      <p>{t("docs.body")}</p>
      {external ? (
        <p>
          <a
            href={external}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {t("docs.externalLink")}
          </a>
        </p>
      ) : (
        <p className="text-sm">{t("docs.inProductNote")}</p>
      )}
      <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <Link href={getLoginUrl()} className="text-primary underline-offset-2 hover:underline">
          {t("common.login")}
        </Link>
        <Link href={getRegisterUrl()} className="text-primary underline-offset-2 hover:underline">
          {t("auth.registerCta")}
        </Link>
        <a
          href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}?subject=Documentation%20request`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {MINEUQR_PUBLIC_SUPPORT_EMAIL}
        </a>
      </p>
    </MarketingCorporateShell>
  );
}
