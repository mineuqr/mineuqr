import { useSearch } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

type Props = {
  slug: string;
  onDone: () => void;
};

/** Channel-owned confirmation + path to automatic reset. */
export function KioskConfirmationStage({ onDone }: Props) {
  const { language } = useLanguage();
  const search = useSearch();
  let token = "";
  try {
    token = new URLSearchParams(search.startsWith("?") ? search : `?${search}`).get(
      "token"
    ) ?? "";
  } catch {
    token = "";
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-teal-900 to-slate-900 text-white px-8 text-center">
      <p className="text-4xl md:text-5xl font-bold">
        {language === "ar" ? "تم إرسال طلبك" : "Order placed"}
      </p>
      {token ? (
        <p className="text-white/70 text-sm break-all max-w-md">
          {language === "ar" ? "رمز التتبع:" : "Tracking:"} {token}
        </p>
      ) : null}
      <p className="text-white/60">
        {language === "ar"
          ? "سيتم إعادة الشاشة تلقائياً..."
          : "Returning to start automatically..."}
      </p>
      <button
        type="button"
        onClick={onDone}
        className="mt-4 rounded-2xl bg-white/15 px-8 py-4 font-semibold"
      >
        {language === "ar" ? "طلب جديد" : "New order"}
      </button>
    </div>
  );
}
