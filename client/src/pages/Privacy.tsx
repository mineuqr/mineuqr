import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { useMarketingDocumentMeta } from "@/components/landing/useMarketingDocumentMeta";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";

export default function Privacy() {
  const { t, dir } = useLanguage();

  useMarketingDocumentMeta({
    title: t("privacy.title"),
    description: t("privacy.section1Text"),
    path: "/privacy",
  });

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
      dir={dir}
    >
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-cyan-400 transition-colors hover:text-cyan-300"
        >
          <ArrowRight className="h-4 w-4" />
          {t("privacy.backHome")}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
          {t("privacy.title")}
        </h1>
        <p className="mb-12 text-cyan-300">{t("privacy.lastUpdated")}</p>

        <div className="space-y-10 leading-relaxed text-cyan-200">
          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              1. {t("privacy.section1Title")}
            </h2>
            <p>{t("privacy.section1Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              2. {t("privacy.section2Title")}
            </h2>
            <p className="mb-4">{t("privacy.section2Text1")}</p>
            <p>{t("privacy.section2Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              3. {t("privacy.section3Title")}
            </h2>
            <p>{t("privacy.section3Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              4. {t("privacy.section4Title")}
            </h2>
            <p className="mb-4">{t("privacy.section4Text1")}</p>
            <p>{t("privacy.section4Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              5. {t("privacy.section5Title")}
            </h2>
            <p className="mb-4">{t("privacy.section5Text1")}</p>
            <p>{t("privacy.section5Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              6. {t("privacy.section6Title")}
            </h2>
            <p>{t("privacy.section6Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              7. {t("privacy.section7Title")}
            </h2>
            <p>{t("privacy.section7Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              8. {t("privacy.section8Title")}
            </h2>
            <p>{t("privacy.section8Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              9. {t("privacy.section9Title")}
            </h2>
            <p>{t("privacy.section9Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-orange-400 pr-4 text-2xl font-bold text-white">
              10. {t("privacy.section10Title")}
            </h2>
            <p>
              {t("privacy.section10Text")}{" "}
              <a
                href={`mailto:${MINEUQR_PUBLIC_SUPPORT_EMAIL}`}
                className="text-cyan-400 underline hover:text-cyan-300"
              >
                {MINEUQR_PUBLIC_SUPPORT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>

        <div className="mt-16 flex gap-6 border-t border-cyan-500/20 pt-8 text-sm">
          <Link
            href="/terms"
            className="text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {t("nav.terms")}
          </Link>
          <Link
            href="/security"
            className="text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {t("footer.security")}
          </Link>
          <Link
            href="/"
            className="text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {t("nav.home")}
          </Link>
        </div>
      </div>

      <MarketingFooter />
    </div>
  );
}
