import { Snowflake } from "lucide-react";

/** Public QR frozen experience. QR identity is unchanged; menu service is suspended. */
export function FrozenPublicMenuExperience({
  language,
  restaurantName,
}: {
  language: string;
  restaurantName?: string;
}) {
  const isAr = language === "ar";
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#0b0e14] p-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-slate-900/80 p-8 text-center">
        <Snowflake className="mx-auto h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-xl font-semibold text-white">
          {isAr ? "الخدمة غير متاحة حالياً" : "Service is temporarily unavailable"}
        </h1>
        {restaurantName ? (
          <p className="mt-2 text-sm text-slate-300">{restaurantName}</p>
        ) : null}
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          {isAr
            ? "انتهى الاشتراك التجاري لهذا المطعم. رمز QR لا يزال صالحاً وسيعيد نفس المنيو بعد التجديد. لم تُحذف أي بيانات."
            : "This restaurant’s commercial subscription has ended. The QR remains valid and will serve the same menu after renewal. No data was deleted."}
        </p>
      </div>
    </div>
  );
}
