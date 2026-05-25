import { Loader2, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LoadingScreen() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loadingTime, setLoadingTime] = useState(0);
  const { t } = useLanguage();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setLoadingTime(prev => prev + 1);
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm bg-slate-800 border-slate-700 shadow-2xl">
        <div className="p-8 text-center space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <img
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663504545475/fcy9GqTzfuy9H9eCsDbdLA/mineuqr-logo_150417d8.png"
              alt="mineuqr"
              className="h-24 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">mineuqr</h1>
            <p className="text-slate-400 text-sm">{t('loading.title')}</p>
          </div>

          {/* Loading Indicator */}
          <div className="flex justify-center">
            {isOnline ? (
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-400" />
            )}
          </div>

          {/* Status Message */}
          <div className="space-y-2">
            {isOnline ? (
              <>
                <p className="text-slate-300 text-sm">
                  {loadingTime > 10 
                    ? t('loading.checking')
                    : t('loading.checking')}
                </p>
                {loadingTime > 10 && (
                  <Button 
                    onClick={handleRetry}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    {t('loading.retry')}
                  </Button>
                )}
              </>
            ) : (
              <>
                <p className="text-red-400 text-sm font-semibold">
                  {t('loading.offline')}
                </p>
                <p className="text-slate-400 text-xs">
                  {t('loading.tip1')}
                </p>
                <Button 
                  onClick={handleRetry}
                  className="w-full bg-cyan-500 hover:bg-cyan-600 text-white mt-4"
                >
                  {t('loading.retry')}
                </Button>
              </>
            )}
          </div>

          {/* Tips */}
          <div className="bg-slate-700/50 rounded-lg p-4 text-left space-y-2">
            <p className="text-slate-300 text-xs font-semibold">{t('loading.tips')}</p>
            <ul className="text-slate-400 text-xs space-y-1">
              <li>• {t('loading.tip1')}</li>
              <li>• {t('loading.tip3')}</li>
              <li>• {t('loading.tip4')}</li>
              <li>• {t('loading.tip2')}</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
