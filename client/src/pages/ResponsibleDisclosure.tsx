/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1 — Responsible disclosure
 */
import { MarketingCorporateShell } from "@/components/landing/MarketingCorporateShell";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { Bug } from "lucide-react";
import { Link } from "wouter";

export default function ResponsibleDisclosure() {
  const { t } = useLanguage();

  return (
    <MarketingCorporateShell
      path="/security/disclosure"
      metaTitle={t("disclosure.metaTitle")}
      metaDescription={t("disclosure.metaDescription")}
      title={t("disclosure.title")}
      subtitle={t("disclosure.subtitle")}
      icon={Bug}
      navHref="/security"
      navLabel={t("footer.security")}
    >
      <section>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {t("disclosure.s1Title")}
        </h2>
        <p>{t("disclosure.s1Body")}</p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {t("disclosure.s2Title")}
        </h2>
        <p>{t("disclosure.s2Body")}</p>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          {t("disclosure.s3Title")}
        </h2>
        <p>
          {t("disclosure.s3Body")}{" "}
          <a
            href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}?subject=Security%20vulnerability%20report`}
            className="text-primary underline-offset-2 hover:underline"
          >
            {MINEUQR_PUBLIC_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
      <p className="text-sm">
        <Link href="/security" className="text-primary underline-offset-2 hover:underline">
          {t("footer.security")}
        </Link>
      </p>
    </MarketingCorporateShell>
  );
}
