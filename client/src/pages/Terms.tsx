import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { MarketingFooter } from "@/components/landing/MarketingFooter";
import { useMarketingDocumentMeta } from "@/components/landing/useMarketingDocumentMeta";
import { MINEUQR_PUBLIC_SUPPORT_EMAIL } from "@/const/publicContact";

export default function Terms() {
  const { t, dir } = useLanguage();

  useMarketingDocumentMeta({
    title: t("terms.title"),
    description: t("terms.section1Text"),
    path: "/terms",
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
          {t("terms.backHome")}
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">
          {t("terms.title")}
        </h1>
        <p className="mb-12 text-cyan-300">{t("terms.lastUpdated")}</p>

        <div className="space-y-10 leading-relaxed text-cyan-200">
          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              1. {t("terms.section1Title")}
            </h2>
            <p>{t("terms.section1Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              2. {t("terms.section2Title")}
            </h2>
            <p>{t("terms.section2Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              3. {t("terms.section3Title")}
            </h2>
            <p className="mb-4">{t("terms.section3Text1")}</p>
            <p>{t("terms.section3Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              4. {t("terms.section4Title")}
            </h2>
            <p className="mb-4">{t("terms.section4Text1")}</p>
            <p>{t("terms.section4Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              5. {t("terms.section5Title")}
            </h2>
            <p className="mb-4">{t("terms.section5Text1")}</p>
            <p>{t("terms.section5Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              6. {t("terms.section6Title")}
            </h2>
            <p className="mb-4">{t("terms.section6Text1")}</p>
            <p>{t("terms.section6Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              7. {t("terms.section7Title")}
            </h2>
            <p>{t("terms.section7Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              8. {t("terms.section8Title")}
            </h2>
            <p className="mb-4">{t("terms.section8Text1")}</p>
            <p>{t("terms.section8Text2")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              9. {t("terms.section9Title")}
            </h2>
            <p>{t("terms.section9Text")}</p>
          </section>

          <section>
            <h2 className="mb-4 border-r-4 border-cyan-400 pr-4 text-2xl font-bold text-white">
              10. {t("terms.section10Title")}
            </h2>
            <p>
              {t("terms.section10Text")}{" "}
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
            href="/privacy"
            className="text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {t("nav.privacy")}
          </Link>
          <Link
            href="/billing"
            className="text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {t("footer.billing")}
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
