import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PushSubscriptionState } from "@/lib/pushSubscriptionState";
import {
  getEnrollmentActivatingLabel,
  getEnrollmentCtaLabel,
  getEnrollmentSuccessTitle,
} from "@/lib/readyNotificationEnrollmentCopy";
import {
  isActivationTraceEnabled,
  recordActivationTrace,
} from "@/lib/activationTrace";
import { cn } from "@/lib/utils";

type ReadyAlertActivationBannerProps = {
  language: "ar" | "en";
  pushSubscribed: boolean;
  enrollmentSucceeded: boolean;
  pushSubscriptionState: PushSubscriptionState;
  activating: boolean;
  onActivate: () => void;
  className?: string;
};

export function ReadyAlertActivationBanner({
  language,
  pushSubscribed,
  enrollmentSucceeded,
  pushSubscriptionState,
  activating,
  onActivate,
  className,
}: ReadyAlertActivationBannerProps) {
  const isSubscribing = activating;

  if (pushSubscribed || enrollmentSucceeded) {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-lg border border-green-200/60 bg-green-50/70 dark:bg-green-950/15 dark:border-green-800/40 px-4 py-3 text-sm text-green-800 dark:text-green-300",
          className
        )}
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium">{getEnrollmentSuccessTitle(language)}</span>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className={cn(
        "w-full min-h-11 h-11 px-4 text-sm font-medium",
        "border border-orange-200/80 bg-orange-50/90 text-orange-950",
        "hover:bg-orange-100/90 dark:bg-orange-950/30 dark:text-orange-100 dark:hover:bg-orange-950/45",
        "shadow-sm",
        className
      )}
      disabled={isSubscribing}
      onClick={() => {
        if (isActivationTraceEnabled()) {
          recordActivationTrace("onclick_fired");
        }
        onActivate();
      }}
    >
      {isSubscribing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin me-2" aria-hidden />
          {getEnrollmentActivatingLabel(language)}
        </>
      ) : (
        <>
          <Bell className="h-4 w-4 me-2" aria-hidden />
          {getEnrollmentCtaLabel(language)}
        </>
      )}
    </Button>
  );
}
