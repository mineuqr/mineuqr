import { cn } from "@/lib/utils";
import type { OperationalScreenState } from "@/lib/operational-screen/state/operationalScreenStateContract";
import { Loader2, ShieldAlert, WifiOff } from "lucide-react";

const OPERATIONAL_LABELS: Record<string, { en: string; ar: string }> = {
  initializing: { en: "Starting screen runtime...", ar: "جاري تشغيل الشاشة..." },
  ready: { en: "Connected", ar: "متصل" },
  operational: { en: "Connected", ar: "متصل" },
  blocked: { en: "Connected", ar: "متصل" },
  degraded: { en: "Connection degraded — showing last known data", ar: "اتصال ضعيف — يتم استخدام آخر بيانات متاحة" },
  maintenance: { en: "Maintenance mode", ar: "وضع الصيانة" },
  disconnected: { en: "Connection degraded — showing last known data", ar: "اتصال ضعيف — يتم استخدام آخر بيانات متاحة" },
  disposed: { en: "Screen unlinked — enter a new activation code from Screen Management", ar: "تم إلغاء ربط الشاشة — أدخل رمز تفعيل جديد من إدارة الشاشات" },
};

/** Connection banner — consumes canonical screen state only. */
export function ScreenConnectionBanner({
  screenState,
  language,
  className,
}: {
  screenState: OperationalScreenState;
  language: string;
  className?: string;
}) {
  const isAr = language === "ar";
  const { operationalState, connectivityState } = screenState;

  if (operationalState === "disposed" || connectivityState === "offline") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-semibold text-destructive",
          className
        )}
        role="alert"
      >
        <ShieldAlert className="h-4 w-4 shrink-0" />
        {operationalState === "disposed"
          ? OPERATIONAL_LABELS.disposed[isAr ? "ar" : "en"]
          : isAr
            ? "انقطع الاتصال — تحقق من الشبكة"
            : "Connection lost — check network"}
      </div>
    );
  }

  if (
    operationalState === "degraded" ||
    operationalState === "disconnected" ||
    connectivityState === "disconnected" ||
    connectivityState === "reconnecting"
  ) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200",
          className
        )}
        role="alert"
      >
        <WifiOff className="h-4 w-4 shrink-0" />
        {OPERATIONAL_LABELS.degraded[isAr ? "ar" : "en"]}
      </div>
    );
  }

  if (operationalState === "initializing" || connectivityState === "connecting") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2 text-sm text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        {OPERATIONAL_LABELS.initializing[isAr ? "ar" : "en"]}
      </div>
    );
  }

  if (operationalState === "maintenance") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-200",
          className
        )}
        role="alert"
      >
        <ShieldAlert className="h-4 w-4 shrink-0" />
        {OPERATIONAL_LABELS.maintenance[isAr ? "ar" : "en"]}
      </div>
    );
  }

  return null;
}
