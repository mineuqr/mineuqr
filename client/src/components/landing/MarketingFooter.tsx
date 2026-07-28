/**
 * GLOBAL-SAAS-CORPORATE-IDENTITY-1
 * Corporate marketing footer — product / company / trust / legal columns.
 */
import { LandingLogo } from "@/components/landing/LandingLogo";
import { MINEUQR_BRAND_NAME } from "@/const/branding";
import { getPublicCompanyLegal } from "@/const/companyLegal";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

function FooterLink(props: {
  href: string;
  label: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <a
      href={props.href}
      onClick={(e) => {
        e.preventDefault();
        props.onNavigate(props.href);
      }}
      className="text-muted-foreground transition-colors hover:text-primary"
    >
      {props.label}
    </a>
  );
}

export function MarketingFooter() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const legal = getPublicCompanyLegal();

  const product = [
    { href: "/pricing", label: t("home.plans") },
    { href: "/docs", label: t("footer.docs") },
    { href: "/roadmap", label: t("footer.roadmap") },
  ] as const;

  const company = [
    { href: "/about", label: t("home.aboutUs") },
    { href: "/contact", label: t("home.contactUs") },
    { href: "/status", label: t("footer.status") },
  ] as const;

  const trust = [
    { href: "/trust", label: t("footer.trust") },
    { href: "/security", label: t("footer.security") },
    { href: "/privacy", label: t("home.privacyPolicy") },
    { href: "/billing", label: t("footer.billing") },
    { href: "/subprocessors", label: t("footer.subprocessors") },
    { href: "/dpa", label: t("footer.dpa") },
    { href: "/security/disclosure", label: t("footer.disclosure") },
  ] as const;

  const legalLinks = [
    { href: "/terms", label: t("home.termsOfService") },
    { href: "/privacy", label: t("home.privacyPolicy") },
    { href: "/billing", label: t("footer.billing") },
  ] as const;

  const columns = [
    { title: t("footer.colProduct"), links: product },
    { title: t("footer.colCompany"), links: company },
    { title: t("footer.colTrust"), links: trust },
    { title: t("footer.colLegal"), links: legalLinks },
  ] as const;

  return (
    <footer
      className="border-t border-border/25 py-10 sm:py-12"
      role="contentinfo"
      aria-label={t("footer.ariaLabel")}
    >
      <div className="container">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="flex max-w-xs flex-col items-center gap-3 lg:items-start">
            <LandingLogo imageClassName="h-12 w-auto sm:h-14" />
            <p className="text-center text-sm text-muted-foreground lg:text-start">
              {t("home.platformBadge")}
            </p>
            <a
              href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}`}
              className="text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              {MINEUQR_PUBLIC_SUPPORT_EMAIL}
            </a>
            {legal ? (
              <div className="mt-2 space-y-1 text-center text-xs text-muted-foreground lg:text-start">
                <p className="font-medium text-foreground/80">{legal.legalName}</p>
                {legal.jurisdiction ? <p>{legal.jurisdiction}</p> : null}
                {legal.registeredAddress ? <p>{legal.registeredAddress}</p> : null}
                {legal.registrationNumber ? (
                  <p>
                    {t("footer.regNumber")}: {legal.registrationNumber}
                  </p>
                ) : null}
                {legal.taxId ? (
                  <p>
                    {t("footer.taxId")}: {legal.taxId}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {columns.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">
                  {col.title}
                </p>
                <ul className="space-y-2 text-sm">
                  {col.links.map((link) => (
                    <li key={`${col.title}-${link.href}-${link.label}`}>
                      <FooterLink
                        href={link.href}
                        label={link.label}
                        onNavigate={setLocation}
                      />
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          {t("home.allRightsReserved")} &copy; {new Date().getFullYear()}{" "}
          {legal?.legalName?.trim() || MINEUQR_BRAND_NAME}
        </p>
      </div>
    </footer>
  );
}
