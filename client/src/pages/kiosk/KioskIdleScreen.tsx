import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  onStart: () => void;
};

/** Channel-owned idle / touch-to-start — no ordering logic. */
export function KioskIdleScreen({ onStart }: Props) {
  const { language } = useLanguage();
  return (
    <button
      type="button"
      onClick={onStart}
      className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-slate-900 to-slate-800 text-white px-8"
    >
      <p className="text-4xl md:text-6xl font-bold tracking-tight">
        {language === "ar" ? "اطلب بنفسك" : "Order Here"}
      </p>
      <p className="text-xl md:text-2xl text-white/80">
        {language === "ar" ? "المس للبدء" : "Touch to Start"}
      </p>
    </button>
  );
}
