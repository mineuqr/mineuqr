import { useEffect } from "react";
import { useLocation } from "wouter";
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
import { trpc } from "@/lib/trpc";
import { CheckCircle2, LayoutDashboard, LogIn } from "lucide-react";

export default function VerifyEmailSuccess() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const { isAuthenticated, authPending } = useAuth();
  const utils = trpc.useUtils();
  const isRtl = language === "ar";

  useEffect(() => {
    void utils.auth.me.invalidate();
  }, [utils]);

  const primaryHref = isAuthenticated ? "/dashboard" : getLoginUrl();
  const PrimaryIcon = isAuthenticated ? LayoutDashboard : LogIn;

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
              {t("auth.verifySuccessTitle")}
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {t("auth.verifySuccessSubtitle")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <Alert className="border-primary/30 bg-primary/5 text-foreground">
              <CheckCircle2 className="text-primary" aria-hidden />
              <AlertTitle>{t("auth.verifySuccessAlertTitle")}</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                {t("auth.verifySuccessMessage")}
              </AlertDescription>
            </Alert>
            <Button
              type="button"
              className="min-h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={authPending}
              onClick={() => setLocation(primaryHref)}
            >
              <PrimaryIcon className="me-2 h-4 w-4" aria-hidden />
              {isAuthenticated
                ? t("auth.verifySuccessCtaDashboard")
                : t("auth.verifySuccessCtaLogin")}
            </Button>
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
