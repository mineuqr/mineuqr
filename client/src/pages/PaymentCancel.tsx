import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PaymentCancel() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <XCircle className="w-24 h-24 text-orange-400" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">{t('payment.cancel.title')}</h1>

        <p className="text-xl text-cyan-300 mb-6">
          {t('payment.cancel.message')}
        </p>

        <div className="space-y-4">
          <Button
            onClick={() => setLocation("/pricing")}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-bold py-3"
          >
            {t('payment.cancel.goToPricing')}
          </Button>

          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            className="w-full border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10"
          >
            {t('payment.cancel.goToDashboard')}
          </Button>
        </div>

        <p className="text-cyan-300 text-sm mt-6">
          {t('payment.cancel.support')}
        </p>
      </div>
    </div>
  );
}
