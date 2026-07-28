/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1 — DPA entry (available on request; no fabricated agreement)
 */
import { MarketingCorporateShell } from "@/components/landing/MarketingCorporateShell";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText } from "lucide-react";
import { Link } from "wouter";

export default function Dpa() {
  const { t } = useLanguage();

  return (
    <MarketingCorporateShell
      path="/dpa"
      metaTitle={t("dpa.metaTitle")}
      metaDescription={t("dpa.metaDescription")}
      title={t("dpa.title")}
      subtitle={t("dpa.subtitle")}
      icon={FileText}
    >
      <p>{t("dpa.body")}</p>
      <p>
        {t("dpa.contactText")}{" "}
        <a
          href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}?subject=Data%20Processing%20Agreement%20request`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {MINEUQR_PUBLIC_SUPPORT_EMAIL}
        </a>
        .
      </p>
      <p className="text-sm">
        <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
          {t("home.privacyPolicy")}
        </Link>
        {" · "}
        <Link href="/subprocessors" className="text-primary underline-offset-2 hover:underline">
          {t("footer.subprocessors")}
        </Link>
      </p>
    </MarketingCorporateShell>
  );
}
