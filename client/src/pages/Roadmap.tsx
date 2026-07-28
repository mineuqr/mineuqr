/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1 — Roadmap entry (shipped pillars only; no invented futures)
 */
import { MarketingCorporateShell } from "@/components/landing/MarketingCorporateShell";
import { MINEUQR_PUBLIC_ROADMAP_URL } from "@/const/publicPresence";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { Map } from "lucide-react";
import { Link } from "wouter";

export default function Roadmap() {
  const { t } = useLanguage();
  const external = MINEUQR_PUBLIC_ROADMAP_URL;

  const pillars = [
    t("roadmap.p1"),
    t("roadmap.p2"),
    t("roadmap.p3"),
    t("roadmap.p4"),
    t("roadmap.p5"),
  ] as const;

  return (
    <MarketingCorporateShell
      path="/roadmap"
      metaTitle={t("roadmap.metaTitle")}
      metaDescription={t("roadmap.metaDescription")}
      title={t("roadmap.title")}
      subtitle={t("roadmap.subtitle")}
      icon={Map}
    >
      <p>{t("roadmap.intro")}</p>
      <section>
        <h2 className="mb-3 text-xl font-semibold text-foreground">
          {t("roadmap.shippedTitle")}
        </h2>
        <ul className="list-disc space-y-2 ps-5">
          {pillars.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
      <p>{t("roadmap.forward")}</p>
      {external ? (
        <p>
          <a
            href={external}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            {t("roadmap.externalLink")}
          </a>
        </p>
      ) : null}
      <p className="text-sm">
        <Link href="/about" className="text-primary underline-offset-2 hover:underline">
          {t("home.aboutUs")}
        </Link>
        {" · "}
        <a
          href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}?subject=Enterprise%20roadmap`}
          className="text-primary underline-offset-2 hover:underline"
        >
          {MINEUQR_PUBLIC_SUPPORT_EMAIL}
        </a>
      </p>
    </MarketingCorporateShell>
  );
}
