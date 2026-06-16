import { getOrderTrackingExpiredLines } from "@/lib/orderTrackingExpiredCopy";

type OrderTrackingExpiredProps = {
  language: "ar" | "en";
};

export function OrderTrackingExpired({ language }: OrderTrackingExpiredProps) {
  const lines = getOrderTrackingExpiredLines(language);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 bg-gradient-to-b from-orange-50 to-white dark:from-gray-950 dark:to-gray-900"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-md text-center space-y-3 rounded-2xl border border-orange-200/60 bg-white dark:bg-gray-900 shadow-xl p-8">
        {lines.map((line) => (
          <p key={line} className="text-base text-foreground">
            {line}
          </p>
        ))}
      </div>
    </div>
  );
}
