import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  isEmailVerificationPending,
  requestEmailVerification,
} from "@/lib/emailVerification";
import { cn } from "@/lib/utils";
import { isEmailNotVerifiedError } from "@/lib/trpcErrors";
import { Loader2, Mail, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export type VerificationRequiredVariant = "default" | "orders" | "operations";

type VerificationRequiredPanelProps = {
  variant?: VerificationRequiredVariant;
  /** Smaller inline layout for dashboard sections */
  compact?: boolean;
  className?: string;
};

export function VerificationRequiredPanel({
  variant = "default",
  compact = false,
  className,
}: VerificationRequiredPanelProps) {
  const { user, refresh } = useAuth();
  const { t } = useLanguage();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const messageKey =
    variant === "orders"
      ? "auth.verifyRequiredOrdersMessage"
      : variant === "operations"
        ? "auth.verifyRequiredOperationsMessage"
        : "auth.verifyRequiredMessage";

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const ok = await requestEmailVerification();
      if (ok) {
        toast.success(t("auth.verifyBannerResendSuccess"));
      } else {
        toast.error(t("auth.verifyBannerResendError"));
      }
    } catch {
      toast.error(t("auth.verifyBannerResendError"));
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const result = await refresh();
      const updated = result.data;
      if (updated && !isEmailVerificationPending(updated)) {
        toast.success(t("auth.verifyRefreshVerified"));
      } else {
        toast.message(t("auth.verifyRefreshStillPending"));
      }
    } catch {
      toast.error(t("auth.verifyBannerResendError"));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Card
      className={cn(
        "border-amber-500/35 bg-amber-500/5",
        compact ? "shadow-none" : "",
        className
      )}
      role="region"
      aria-labelledby="verification-required-title"
    >
      <CardContent className={cn(compact ? "p-5 sm:p-6" : "p-6 sm:p-8")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400"
            aria-hidden
          >
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <p
                id="verification-required-title"
                className="text-base font-semibold text-foreground sm:text-lg"
              >
                {t("auth.verifyRequiredTitle")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                {t(messageKey)}
              </p>
              {user?.email ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-background/60 px-3 py-1 text-xs font-medium text-foreground">
                    <Mail className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                    <span dir="ltr">{user.email}</span>
                  </span>
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {t("auth.verifyStatusPending")}
                  </span>
                </div>
              ) : null}
              <p className="text-sm text-muted-foreground">{t("auth.verifyNextStep")}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-amber-500/45 bg-background/80"
                onClick={handleResend}
                disabled={resending || refreshing}
                aria-busy={resending}
              >
                {resending ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Mail className="me-2 h-4 w-4" aria-hidden />
                )}
                {resending
                  ? t("auth.verifyBannerResending")
                  : t("auth.verifyBannerResend")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleRefresh}
                disabled={resending || refreshing}
                aria-busy={refreshing}
              >
                {refreshing ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="me-2 h-4 w-4" aria-hidden />
                )}
                {refreshing
                  ? t("auth.verifyRefreshing")
                  : t("auth.verifyRefreshStatus")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Renders children unless the query failed with email-not-verified (10003). */
export function VerificationRequiredGate({
  error,
  children,
  variant = "default",
  compact = false,
  className,
}: {
  error: unknown;
  children: React.ReactNode;
  variant?: VerificationRequiredVariant;
  compact?: boolean;
  className?: string;
}) {
  if (isEmailNotVerifiedError(error)) {
    return (
      <VerificationRequiredPanel
        variant={variant}
        compact={compact}
        className={className}
      />
    );
  }
  return <>{children}</>;
}
