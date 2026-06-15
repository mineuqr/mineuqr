import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PushSubscriptionState } from "@/lib/pushSubscriptionState";
import {
  getEnrollmentActivatingLabel,
  getEnrollmentCtaLabel,
  getEnrollmentSuccessTitle,
} from "@/lib/readyNotificationEnrollmentCopy";
import { cn } from "@/lib/utils";

type ReadyAlertActivationBannerProps = {
  language: "ar" | "en";
  pushSubscribed: boolean;
  pushSubscriptionState: PushSubscriptionState;
  activating: boolean;
  onActivate: () => void;
  className?: string;
};

export function ReadyAlertActivationBanner({
  language,
  pushSubscribed,
  pushSubscriptionState,
  activating,
  onActivate,
  className,
}: ReadyAlertActivationBannerProps) {
  const isSubscribing = pushSubscriptionState === "SUBSCRIBING" || activating;

  if (pushSubscribed) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-green-200/60 bg-green-50/70 dark:bg-green-950/15 dark:border-green-800/40 px-3 py-2 text-xs text-green-800 dark:text-green-300",
          className
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="font-medium">{getEnrollmentSuccessTitle(language)}</span>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="secondary"
      className={cn("w-full h-8 text-xs", className)}
      disabled={isSubscribing}
      onClick={onActivate}
    >
      {isSubscribing ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin me-2" aria-hidden />
          {getEnrollmentActivatingLabel(language)}
        </>
      ) : (
        <>
          <Bell className="h-3.5 w-3.5 me-2" aria-hidden />
          {getEnrollmentCtaLabel(language)}
        </>
      )}
    </Button>
  );
}
