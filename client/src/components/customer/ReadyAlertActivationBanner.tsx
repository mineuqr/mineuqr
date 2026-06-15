import { AlertCircle, Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getIosPwaInstallSteps,
  getPushSubscriptionUserMessage,
  isBackgroundPushReady,
  type PushSubscribeOutcomeReason,
  type PushSubscriptionState,
} from "@/lib/pushSubscriptionState";
import { cn } from "@/lib/utils";

type ReadyAlertActivationBannerProps = {
  language: "ar" | "en";
  pushSubscriptionState: PushSubscriptionState;
  activating: boolean;
  onActivate: () => void;
  pushSubscribeReason?: PushSubscribeOutcomeReason | null;
  showIosInstallSteps?: boolean;
  className?: string;
};

export function ReadyAlertActivationBanner({
  language,
  pushSubscriptionState,
  activating,
  onActivate,
  pushSubscribeReason = null,
  showIosInstallSteps = false,
  className,
}: ReadyAlertActivationBannerProps) {
  const message = getPushSubscriptionUserMessage({
    state: pushSubscriptionState,
    language,
    pushSubscribeReason,
  });

  if (isBackgroundPushReady(pushSubscriptionState)) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-green-200/70 bg-green-50/80 dark:bg-green-950/20 dark:border-green-800/50 px-3 py-2 text-sm text-green-800 dark:text-green-300",
          className
        )}
      >
        <BellRing className="h-4 w-4 shrink-0" aria-hidden />
        <span>{message}</span>
      </div>
    );
  }

  const showRetry =
    pushSubscriptionState === "PERMISSION_REQUIRED" ||
    pushSubscriptionState === "PERMISSION_DENIED" ||
    pushSubscriptionState === "SUBSCRIBE_FAILED";

  const iosSteps =
    showIosInstallSteps && pushSubscriptionState === "NOT_SUPPORTED"
      ? getIosPwaInstallSteps(language)
      : null;

  const isSubscribing = pushSubscriptionState === "SUBSCRIBING" || activating;

  return (
    <div
      className={cn(
        "rounded-lg border border-orange-200/70 bg-orange-50/90 dark:bg-orange-950/25 dark:border-orange-800/40 px-3 py-3 space-y-2",
        pushSubscriptionState === "SUBSCRIBE_FAILED" || pushSubscriptionState === "PERMISSION_DENIED"
          ? "border-red-200/70 bg-red-50/90 dark:bg-red-950/20 dark:border-red-800/40"
          : null,
        className
      )}
    >
      <div className="flex items-start gap-2 text-sm text-foreground">
        {pushSubscriptionState === "SUBSCRIBE_FAILED" ||
        pushSubscriptionState === "PERMISSION_DENIED" ? (
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" aria-hidden />
        ) : (
          <Bell className="h-4 w-4 shrink-0 mt-0.5 text-orange-600" aria-hidden />
        )}
        <div className="space-y-2">
          <p className="font-medium">
            {language === "ar" ? "إشعارات الخلفية غير جاهزة" : "Background push not ready"}
          </p>
          <p>{message}</p>
          {iosSteps ? (
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              {iosSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
        </div>
      </div>
      {showRetry ? (
        <Button
          type="button"
          size="sm"
          className="w-full bg-orange-600 hover:bg-orange-700 text-white"
          disabled={isSubscribing}
          onClick={onActivate}
        >
          {isSubscribing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin me-2" aria-hidden />
              {language === "ar" ? "جاري التفعيل..." : "Enabling..."}
            </>
          ) : pushSubscriptionState === "SUBSCRIBE_FAILED" ? (
            language === "ar" ? (
              "إعادة المحاولة"
            ) : (
              "Try again"
            )
          ) : language === "ar" ? (
            "تفعيل التنبيهات"
          ) : (
            "Enable alerts"
          )}
        </Button>
      ) : isSubscribing ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>{message}</span>
        </div>
      ) : null}
    </div>
  );
}
