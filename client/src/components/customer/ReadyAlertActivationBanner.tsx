import { Bell, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isBackgroundPushReady, type PushSubscriptionState } from "@/lib/pushSubscriptionState";
import {
  getEnrollmentActivatingLabel,
  getEnrollmentBenefitBody,
  getEnrollmentBenefitHeadline,
  getEnrollmentCtaLabel,
  getEnrollmentGenericFailureBody,
  getEnrollmentIosSteps,
  getEnrollmentIosStepsIntro,
  getEnrollmentPermissionDeniedBody,
  getEnrollmentPermissionDeniedTitle,
  getEnrollmentSuccessBody,
  getEnrollmentSuccessTitle,
  getEnrollmentUnsupportedBody,
  shouldShowEnrollmentBenefitPrompt,
  shouldShowIosInstallSteps,
} from "@/lib/readyNotificationEnrollmentCopy";
import { cn } from "@/lib/utils";

type ReadyAlertActivationBannerProps = {
  language: "ar" | "en";
  pushSubscriptionState: PushSubscriptionState;
  activating: boolean;
  onActivate: () => void;
  activationAttempted?: boolean;
  showIosInstallSteps?: boolean;
  className?: string;
};

export function ReadyAlertActivationBanner({
  language,
  pushSubscriptionState,
  activating,
  onActivate,
  activationAttempted = false,
  showIosInstallSteps = false,
  className,
}: ReadyAlertActivationBannerProps) {
  const isSubscribing = pushSubscriptionState === "SUBSCRIBING" || activating;

  if (isBackgroundPushReady(pushSubscriptionState)) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-green-200/60 bg-green-50/70 dark:bg-green-950/15 dark:border-green-800/40 px-3 py-2 text-xs text-green-800 dark:text-green-300",
          className
        )}
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p className="font-medium">{getEnrollmentSuccessTitle(language)}</p>
          <p className="text-green-700/90 dark:text-green-400/90 mt-0.5">
            {getEnrollmentSuccessBody(language)}
          </p>
        </div>
      </div>
    );
  }

  if (isSubscribing) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" aria-hidden />
        <span>{getEnrollmentActivatingLabel(language)}</span>
      </div>
    );
  }

  if (
    shouldShowEnrollmentBenefitPrompt(pushSubscriptionState, activationAttempted)
  ) {
    return (
      <div
        className={cn(
          "rounded-lg border border-border/50 bg-muted/25 dark:bg-muted/10 px-3 py-2.5 space-y-2",
          className
        )}
      >
        <div className="flex items-start gap-2 text-xs text-foreground">
          <Bell className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">{getEnrollmentBenefitHeadline(language)}</p>
            <p className="text-muted-foreground leading-relaxed">
              {getEnrollmentBenefitBody(language)}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full h-8 text-xs"
          disabled={isSubscribing}
          onClick={onActivate}
        >
          {getEnrollmentCtaLabel(language, false)}
        </Button>
      </div>
    );
  }

  const showIosSteps = shouldShowIosInstallSteps(
    pushSubscriptionState,
    activationAttempted,
    showIosInstallSteps
  );
  const isPermissionDenied = pushSubscriptionState === "PERMISSION_DENIED";
  const isGenericFailure = pushSubscriptionState === "SUBSCRIBE_FAILED";
  const isUnsupportedAfterAttempt =
    activationAttempted && pushSubscriptionState === "NOT_SUPPORTED" && !showIosSteps;

  const showRetry =
    isPermissionDenied || isGenericFailure;

  return (
    <div
      className={cn(
        "rounded-lg border border-border/50 bg-muted/20 dark:bg-muted/10 px-3 py-2.5 space-y-2 text-xs",
        className
      )}
    >
      <div className="flex items-start gap-2 text-foreground">
        <BellRing className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" aria-hidden />
        <div className="space-y-1.5">
          {isPermissionDenied ? (
            <>
              <p className="font-medium">{getEnrollmentPermissionDeniedTitle(language)}</p>
              <p className="text-muted-foreground leading-relaxed">
                {getEnrollmentPermissionDeniedBody(language)}
              </p>
            </>
          ) : showIosSteps ? (
            <>
              <p className="font-medium">{getEnrollmentIosStepsIntro(language)}</p>
              <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground leading-relaxed">
                {getEnrollmentIosSteps(language).map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </>
          ) : isUnsupportedAfterAttempt ? (
            <p className="text-muted-foreground leading-relaxed">
              {getEnrollmentUnsupportedBody(language)}
            </p>
          ) : (
            <p className="text-muted-foreground leading-relaxed">
              {getEnrollmentGenericFailureBody(language)}
            </p>
          )}
        </div>
      </div>
      {showRetry ? (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full h-8 text-xs"
          disabled={isSubscribing}
          onClick={onActivate}
        >
          {getEnrollmentCtaLabel(language, true)}
        </Button>
      ) : null}
    </div>
  );
}
