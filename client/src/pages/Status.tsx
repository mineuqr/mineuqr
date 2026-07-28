/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1 — Status architecture (links out when URL configured)
 */
import { MarketingCorporateShell } from "@/components/landing/MarketingCorporateShell";
import { MINEUQR_PUBLIC_STATUS_URL } from "@/const/publicPresence";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { Activity } from "lucide-react";

export default function Status() {
  const { t } = useLanguage();
  const external = MINEUQR_PUBLIC_STATUS_URL;

  return (
    <MarketingCorporateShell
      path="/status"
      metaTitle={t("statusPage.metaTitle")}
      metaDescription={t("statusPage.metaDescription")}
      title={t("statusPage.title")}
      subtitle={t("statusPage.subtitle")}
      icon={Activity}
    >
      {external ? (
        <>
          <p>{t("statusPage.externalBody")}</p>
          <p>
            <a
              href={external}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline-offset-2 hover:underline"
            >
              {t("statusPage.externalLink")}
            </a>
          </p>
        </>
      ) : (
        <>
          <p>{t("statusPage.noPublicBody")}</p>
          <p>
            {t("statusPage.contactText")}{" "}
            <a
              href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}?subject=Service%20status`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {MINEUQR_PUBLIC_SUPPORT_EMAIL}
            </a>
            .
          </p>
        </>
      )}
    </MarketingCorporateShell>
  );
}
