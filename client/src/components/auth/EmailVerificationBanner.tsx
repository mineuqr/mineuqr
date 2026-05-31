import { useAuth } from "@/_core/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  isEmailVerificationPending,
  requestEmailVerification,
} from "@/lib/emailVerification";
import { cn } from "@/lib/utils";
import { Loader2, Mail, MailCheck, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EmailVerificationBannerProps = {
  className?: string;
};

export function EmailVerificationBanner({ className }: EmailVerificationBannerProps) {
  const { user, isAuthenticated, refresh } = useAuth();
  const { t } = useLanguage();
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  if (!isAuthenticated || !isEmailVerificationPending(user)) {
    return null;
  }

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    try {
      const ok = await requestEmailVerification();
      if (ok) {
        toast.success(t("auth.verifyBannerResendSuccess"));
        await refresh();
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
    <Alert
      className={cn(
        "border-amber-500/40 bg-amber-500/10 text-foreground",
        className
      )}
      role="status"
    >
      <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
      <AlertTitle className="text-foreground">
        {t("auth.verifyBannerTitle")}
      </AlertTitle>
      <AlertDescription className="space-y-3 text-muted-foreground">
        <p>{t("auth.verifyBannerMessage")}</p>
        {user?.email ? (
          <p className="text-sm font-medium text-foreground" dir="ltr">
            {user.email}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-amber-500/50 bg-background/80 hover:bg-background"
            onClick={handleResend}
            disabled={resending || refreshing}
            aria-busy={resending}
          >
            {resending ? (
              <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <MailCheck className="me-2 h-4 w-4" aria-hidden />
            )}
            {resending
              ? t("auth.verifyBannerResending")
              : t("auth.verifyBannerResend")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-foreground hover:bg-background/80"
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
      </AlertDescription>
    </Alert>
  );
}
