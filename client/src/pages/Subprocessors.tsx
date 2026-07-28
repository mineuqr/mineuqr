/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1 — Subprocessors (factual, from Privacy)
 */
import { MarketingCorporateShell } from "@/components/landing/MarketingCorporateShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { Server } from "lucide-react";
import { Link } from "wouter";

const SUBPROCESSORS = [
  {
    name: "Amazon Web Services (S3)",
    purposeKey: "subprocessors.s3Purpose",
    regionKey: "subprocessors.regionCloud",
  },
  {
    name: "Tap Payments",
    purposeKey: "subprocessors.tapPurpose",
    regionKey: "subprocessors.regionPayments",
  },
  {
    name: "PayPal",
    purposeKey: "subprocessors.paypalPurpose",
    regionKey: "subprocessors.regionPayments",
  },
] as const;

export default function Subprocessors() {
  const { t } = useLanguage();

  return (
    <MarketingCorporateShell
      path="/subprocessors"
      metaTitle={t("subprocessors.metaTitle")}
      metaDescription={t("subprocessors.metaDescription")}
      title={t("subprocessors.title")}
      subtitle={t("subprocessors.subtitle")}
      icon={Server}
    >
      <p>{t("subprocessors.intro")}</p>
      <div className="space-y-4">
        {SUBPROCESSORS.map((s) => (
          <section
            key={s.name}
            className="rounded-xl border border-border/40 bg-card/40 px-4 py-3"
          >
            <h2 className="text-lg font-semibold text-foreground">{s.name}</h2>
            <p className="mt-1 text-sm">{t(s.purposeKey)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(s.regionKey)}</p>
          </section>
        ))}
      </div>
      <p>
        {t("subprocessors.footerNote")}{" "}
        <Link href="/privacy" className="text-primary underline-offset-2 hover:underline">
          {t("home.privacyPolicy")}
        </Link>
        .
      </p>
    </MarketingCorporateShell>
  );
}
