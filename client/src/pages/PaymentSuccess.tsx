import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLocation("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-8 flex justify-center">
          <CheckCircle className="w-24 h-24 text-green-400 animate-bounce" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">{t('payment.success.title')}</h1>

        <p className="text-xl text-cyan-300 mb-6">
          {t('payment.success.message')}
        </p>

        <div className="bg-gradient-to-r from-cyan-500/20 to-orange-500/20 border border-cyan-500/50 rounded-lg p-6 mb-8">
          <p className="text-cyan-200 mb-2">{t('payment.success.redirecting')}</p>
          <p className="text-orange-400 text-2xl font-bold">{countdown}</p>
        </div>

        <Button
          onClick={() => setLocation("/dashboard")}
          className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-slate-900 font-bold py-3"
        >
          {t('payment.success.goToDashboard')}
        </Button>

        <p className="text-cyan-300 text-sm mt-6">
          {t('payment.success.hint')}
        </p>
      </div>
    </div>
  );
}
