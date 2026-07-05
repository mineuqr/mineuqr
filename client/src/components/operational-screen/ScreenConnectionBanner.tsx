import { cn } from "@/lib/utils";
import type { BootstrapPhase } from "@/lib/operational-screen/runtimeTypes";
import { Loader2, Wifi, WifiOff, ShieldAlert } from "lucide-react";

export function ScreenConnectionBanner({
  phase,
  degraded,
  language,
  className,
}: {
  phase: BootstrapPhase;
  degraded: boolean;
  language: string;
  className?: string;
}) {
  const isAr = language === "ar";

  if (phase === "revoked") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive",
          className
        )}
      >
        <ShieldAlert className="h-4 w-4 shrink-0" />
        {isAr ? "تم إلغاء ربط الشاشة — امسح رمز QR جديد" : "Screen unlinked — scan a new QR code"}
      </div>
    );
  }

  if (degraded || phase === "degraded") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-b border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200",
          className
        )}
      >
        <WifiOff className="h-4 w-4 shrink-0" />
        {isAr ? "اتصال ضعيف — يتم استخدام آخر بيانات متاحة" : "Connection degraded — showing last known data"}
      </div>
    );
  }

  if (phase === "validating" || phase === "loading" || phase === "context_ready") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border/40 bg-muted/30 px-4 py-2 text-sm text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        {isAr ? "جاري تشغيل الشاشة..." : "Starting screen runtime..."}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 border-b border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-xs text-emerald-300",
        className
      )}
    >
      <Wifi className="h-3.5 w-3.5 shrink-0" />
      {isAr ? "متصل" : "Connected"}
    </div>
  );
}
