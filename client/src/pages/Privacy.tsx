import { Link } from "wouter";
import { ArrowRight , QrCode } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Privacy() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowRight className="w-4 h-4" />
          {t('privacy.backHome')}
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('privacy.title')}</h1>
        <p className="text-cyan-300 mb-12">{t('privacy.lastUpdated')}</p>

        <div className="space-y-10 text-cyan-200 leading-relaxed">
          {/* المقدمة */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">1. {t('privacy.section1Title')}</h2>
            <p>{t('privacy.section1Text')}</p>
          </section>

          {/* البيانات التي نجمعها */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">2. {t('privacy.section2Title')}</h2>
            <p className="mb-4">{t('privacy.section2Text1')}</p>
            <p>{t('privacy.section2Text2')}</p>
          </section>

          {/* كيفية استخدام البيانات */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">3. {t('privacy.section3Title')}</h2>
            <p>{t('privacy.section3Text')}</p>
          </section>

          {/* مشاركة البيانات */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">4. {t('privacy.section4Title')}</h2>
            <p className="mb-4">{t('privacy.section4Text1')}</p>
            <p>{t('privacy.section4Text2')}</p>
          </section>

          {/* تخزين البيانات وحمايتها */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">5. {t('privacy.section5Title')}</h2>
            <p className="mb-4">{t('privacy.section5Text1')}</p>
            <p>{t('privacy.section5Text2')}</p>
          </section>

          {/* ملفات تعريف الارتباط */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">6. {t('privacy.section6Title')}</h2>
            <p>{t('privacy.section6Text')}</p>
          </section>

          {/* حقوقك */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">7. {t('privacy.section7Title')}</h2>
            <p>{t('privacy.section7Text')}</p>
          </section>

          {/* خصوصية الأطفال */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">8. {t('privacy.section8Title')}</h2>
            <p>{t('privacy.section8Text')}</p>
          </section>

          {/* التغييرات على هذه السياسة */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">9. {t("privacy.section9Title")}</h2>
            <p>{t('privacy.section9Text')}</p>
          </section>

          {/* التواصل معنا */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-orange-400 pr-4">10. {t('privacy.section10Title')}</h2>
            <p>
              {t('privacy.section10Text')}{" "}
              <a href="mailto:k.sh61@yahoo.com" className="text-cyan-400 hover:text-cyan-300 underline">
                k.sh61@yahoo.com
              </a>.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-16 pt-8 border-t border-cyan-500/20 flex gap-6 text-sm">
          <Link href="/terms" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            {t('nav.terms')}
          </Link>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            {t('nav.home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
