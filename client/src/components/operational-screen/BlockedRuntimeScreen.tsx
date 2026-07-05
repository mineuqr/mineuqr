import { MonitorOff } from "lucide-react";
import { screenTypeLabel } from "@/lib/operational-screen/screenLabels";
import { useRuntimeContext } from "./OperationalScreenRuntimeProvider";

export function BlockedRuntimeScreen({ message }: { message?: string }) {
  const context = useRuntimeContext();
  const language = context.presentation.language;
  const isAr = language === "ar";
  const defaultMessage = isAr
    ? "وقت التشغيل غير متاح لهذا النوع من الشاشات — تواصل مع الدعم أو انتظر تحديث المنصة."
    : "Runtime not available for this screen type — contact support or wait for a platform update.";

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <MonitorOff className="h-16 w-16 text-muted-foreground" />
      <h2 className="text-xl font-semibold">{context.identity.displayName}</h2>
      <p className="text-muted-foreground">{screenTypeLabel(context.identity.role, language)}</p>
      <p className="max-w-md text-sm text-muted-foreground">{message ?? defaultMessage}</p>
    </div>
  );
}
