import type { Language } from "@/contexts/LanguageContext";

type Props = {
  onSelect: (lang: Language) => void;
};

/** Channel-owned language selection — no ordering logic. */
export function KioskLanguageScreen({ onSelect }: Props) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-8 bg-slate-900 text-white px-8">
      <h1 className="text-3xl md:text-5xl font-bold">Choose language / اختر اللغة</h1>
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
        <button
          type="button"
          onClick={() => onSelect("ar")}
          className="flex-1 rounded-2xl bg-orange-500 hover:bg-orange-600 py-8 text-2xl font-bold"
        >
          العربية
        </button>
        <button
          type="button"
          onClick={() => onSelect("en")}
          className="flex-1 rounded-2xl bg-teal-500 hover:bg-teal-600 py-8 text-2xl font-bold"
        >
          English
        </button>
      </div>
    </div>
  );
}
