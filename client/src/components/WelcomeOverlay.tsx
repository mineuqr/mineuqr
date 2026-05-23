import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveImageUrl } from "@/lib/utils";

interface WelcomeOverlayProps {
  restaurantName: string;
  logoUrl?: string | null;
  accentColor?: string;
}

export default function WelcomeOverlay({ restaurantName, logoUrl, accentColor = "#14b8a6" }: WelcomeOverlayProps) {
  const [show, setShow] = useState(true);
  const { t, dir, language } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          dir={dir}
          onClick={() => setShow(false)}
        >
          {/* Background overlay */}
          <motion.div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse at center, ${accentColor}20 0%, rgba(0,0,0,0.95) 70%)` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          />

          {/* Skip button */}
          <motion.button
            className="absolute top-6 left-6 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium text-white/70 hover:text-white border border-white/20 hover:border-white/40 backdrop-blur-sm transition-colors duration-200"
            style={{ direction: dir === 'rtl' ? 'rtl' : 'ltr' }}
            initial={{ opacity: 0, x: dir === 'rtl' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
            onClick={handleSkip}
            aria-label={language === 'ar' ? 'تخطي' : 'Skip'}
          >
            {dir === 'rtl' ? (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>تخطي</span>
              </>
            ) : (
              <>
                <span>Skip</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </motion.button>

          {/* Content */}
          <div className="relative flex flex-col items-center gap-6 px-8 text-center">
            {/* Logo or icon */}
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 14, delay: 0.15 }}
            >
              {resolveImageUrl(logoUrl) ? (
                <img
                  src={resolveImageUrl(logoUrl)}
                  alt=""
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover shadow-2xl"
                  style={{ border: `4px solid ${accentColor}60` }}
                />
              ) : (
                <div
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl shadow-2xl flex items-center justify-center"
                  style={{ background: `${accentColor}20`, border: `4px solid ${accentColor}60` }}
                >
                  <Sparkles className="w-14 h-14 sm:w-16 sm:h-16" style={{ color: accentColor }} />
                </div>
              )}
            </motion.div>

            {/* Welcome text */}
            <motion.h2
              className="text-3xl sm:text-5xl font-bold text-white"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {t('menu.welcomeTitle')}
            </motion.h2>

            {/* Restaurant name */}
            <motion.p
              className="text-xl sm:text-3xl font-semibold"
              style={{ color: accentColor }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              {restaurantName}
            </motion.p>

            {/* Subtitle */}
            <motion.p
              className="text-base sm:text-lg text-white/60 max-w-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.6 }}
            >
              {t('menu.welcomeSubtitle')}
            </motion.p>

            {/* Decorative dots */}
            <motion.div
              className="flex gap-2 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.5 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{ background: accentColor }}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.25 }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
