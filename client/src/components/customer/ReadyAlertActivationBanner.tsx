import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReadyAlertActivationBannerProps = {
  language: "ar" | "en";
  activated: boolean;
  activating: boolean;
  onActivate: () => void;
  className?: string;
};

export function ReadyAlertActivationBanner({
  language,
  activated,
  activating,
  onActivate,
  className,
}: ReadyAlertActivationBannerProps) {
  if (activated) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-green-200/70 bg-green-50/80 dark:bg-green-950/20 dark:border-green-800/50 px-3 py-2 text-sm text-green-800 dark:text-green-300",
          className
        )}
      >
        <BellRing className="h-4 w-4 shrink-0" aria-hidden />
        <span>{language === "ar" ? "التنبيهات مفعّلة" : "Alerts enabled"}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-orange-200/70 bg-orange-50/90 dark:bg-orange-950/25 dark:border-orange-800/40 px-3 py-3 space-y-2",
        className
      )}
    >
      <div className="flex items-start gap-2 text-sm text-foreground">
        <Bell className="h-4 w-4 shrink-0 mt-0.5 text-orange-600" aria-hidden />
        <p>
          {language === "ar"
            ? "فعّل التنبيهات ليصلك صوت وإشعار عندما يصبح طلبك جاهزاً"
            : "Enable alerts to get sound and a notification when your order is ready"}
        </p>
      </div>
      <Button
        type="button"
        size="sm"
        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
        disabled={activating}
        onClick={onActivate}
      >
        {activating
          ? language === "ar"
            ? "جاري التفعيل..."
            : "Enabling..."
          : language === "ar"
            ? "تفعيل التنبيهات"
            : "Enable alerts"}
      </Button>
    </div>
  );
}
