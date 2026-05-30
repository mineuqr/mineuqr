import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getLoginUrl } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  isEmailVerificationPending,
  requestEmailVerification,
} from "@/lib/emailVerification";
import { cn } from "@/lib/utils";
import { AlertCircle, Loader2, LogIn, MailCheck } from "lucide-react";
import { toast } from "sonner";

type FailureReason = "invalid" | "expired" | "error";

function parseReason(search: string): FailureReason {
  const query = search.startsWith("?") ? search.slice(1) : search;
  const raw = new URLSearchParams(query).get("reason")?.trim().toLowerCase();
  if (raw === "expired") return "expired";
  if (raw === "error") return "error";
  return "invalid";
}

export default function VerifyEmailFailed() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { isAuthenticated, user, refresh } = useAuth();
  const isRtl = language === "ar";
  const reason = useMemo(() => parseReason(search), [search]);
  const [resending, setResending] = useState(false);

  const messageKey =
    reason === "expired"
      ? "auth.verifyFailedExpiredMessage"
      : reason === "error"
        ? "auth.verifyFailedErrorMessage"
        : "auth.verifyFailedInvalidMessage";

  const canResendNow =
    isAuthenticated && isEmailVerificationPending(user);

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

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="mb-6">
        <LandingLogo
          onClick={() => setLocation("/")}
          imageClassName="h-12 w-auto"
          ariaLabel={t("nav.home")}
        />
      </div>
      <div className="w-full max-w-md">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="space-y-2 pb-2 text-center">
            <CardTitle className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t("auth.verifyFailedTitle")}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t("auth.verifyFailedSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <Alert
              variant="destructive"
              className="border-destructive/50"
              role="alert"
            >
              <AlertCircle aria-hidden />
              <AlertTitle>{t("auth.verifyFailedAlertTitle")}</AlertTitle>
              <AlertDescription>{t(messageKey)}</AlertDescription>
            </Alert>

            {canResendNow ? (
              <Button
                type="button"
                className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleResend}
                disabled={resending}
                aria-busy={resending}
              >
                {resending ? (
                  <Loader2
                    className={cn("me-2 h-4 w-4 animate-spin")}
                    aria-hidden
                  />
                ) : (
                  <MailCheck className="me-2 h-4 w-4" aria-hidden />
                )}
                {resending
                  ? t("auth.verifyBannerResending")
                  : t("auth.verifyFailedResend")}
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p>{t("auth.verifyFailedLoginToResend")}</p>
                <Button
                  type="button"
                  className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setLocation(getLoginUrl())}
                >
                  <LogIn className="me-2 h-4 w-4" aria-hidden />
                  {t("auth.verifyFailedCtaLogin")}
                </Button>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              className="min-h-11 w-full text-muted-foreground hover:text-foreground"
              onClick={() => setLocation("/")}
            >
              {t("auth.backToHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
