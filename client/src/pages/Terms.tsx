import { Link } from "wouter";
import { ArrowRight , QrCode } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function Terms() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-8 transition-colors">
          <ArrowRight className="w-4 h-4" />
          {t('terms.backHome')}
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('terms.title')}</h1>
        <p className="text-cyan-300 mb-12">{t('terms.lastUpdated')}</p>

        <div className="space-y-10 text-cyan-200 leading-relaxed">
          {/* المقدمة */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">1. {t('terms.section1Title')}</h2>
            <p>{t('terms.section1Text')}</p>
          </section>

          {/* تعريف الخدمة */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">2. {t('terms.section2Title')}</h2>
            <p>{t('terms.section2Text')}</p>
          </section>

          {/* حسابات المستخدمين */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">3. {t('terms.section3Title')}</h2>
            <p className="mb-4">{t('terms.section3Text1')}</p>
            <p>{t('terms.section3Text2')}</p>
          </section>

          {/* الخطط والاشتراكات */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">4. {t('terms.section4Title')}</h2>
            <p className="mb-4">{t('terms.section4Text1')}</p>
            <p>{t('terms.section4Text2')}</p>
          </section>

          {/* الدفع والاسترداد */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">5. {t('terms.section5Title')}</h2>
            <p className="mb-4">{t('terms.section5Text1')}</p>
            <p>{t('terms.section5Text2')}</p>
          </section>

          {/* المحتوى والملكية الفكرية */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">6. {t('terms.section6Title')}</h2>
            <p className="mb-4">{t('terms.section6Text1')}</p>
            <p>{t('terms.section6Text2')}</p>
          </section>

          {/* الاستخدام المقبول */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">7. {t('terms.section7Title')}</h2>
            <p>{t('terms.section7Text')}</p>
          </section>

          {/* إخلاء المسؤولية */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">8. {t('terms.section8Title')}</h2>
            <p className="mb-4">{t('terms.section8Text1')}</p>
            <p>{t('terms.section8Text2')}</p>
          </section>

          {/* تعديل الشروط */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">9. {t('terms.section9Title')}</h2>
            <p>{t('terms.section9Text')}</p>
          </section>

          {/* التواصل */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 border-r-4 border-cyan-400 pr-4">10. {t('terms.section10Title')}</h2>
            <p>
              {t('terms.section10Text')}{" "}
              <a href="mailto:k.sh61@yahoo.com" className="text-cyan-400 hover:text-cyan-300 underline">
                k.sh61@yahoo.com
              </a>.
            </p>
          </section>
        </div>

        {/* Footer Links */}
        <div className="mt-16 pt-8 border-t border-cyan-500/20 flex gap-6 text-sm">
          <Link href="/privacy" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            {t('nav.privacy')}
          </Link>
          <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            {t('nav.home')}
          </Link>
        </div>
      </div>
    </div>
  );
}
