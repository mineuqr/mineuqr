import { getLoginUrl, spaNavigate } from "@/const";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2, Shield, Store } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

/** Centered spinner while auth.me is resolving (no denied/login UI). */
export function AuthGatePending({
  className,
  minHeight = "min-h-screen",
}: {
  className?: string;
  minHeight?: string;
}) {
  return (
    <div
      className={cn(minHeight, "flex items-center justify-center", className)}
      aria-busy="true"
      aria-label="Loading"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/** Post-auth data fetch loading (same spinner as auth pending). */
export function PageDataLoading({
  className,
  minHeight = "min-h-[60vh]",
}: {
  className?: string;
  minHeight?: string;
}) {
  return <AuthGatePending className={className} minHeight={minHeight} />;
}

/** Login required card for protected pages (only after auth resolved). */
export function LoginRequiredCard({
  title,
  description,
  children,
  className,
  minHeight = "min-h-[60vh]",
}: {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  minHeight?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className={cn(minHeight, "flex items-center justify-center p-4", className)}>
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            {title ?? t("common.loginRequired")}
          </h2>
          <p className="text-muted-foreground mb-6">
            {description ?? t("common.loginRequiredDesc")}
          </p>
          {children ?? (
            <Button
              onClick={() => spaNavigate(getLoginUrl())}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {t("common.login")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Login required with page title header (notifications-style). */
export function LoginRequiredPanel({
  title,
  description,
  children,
  className,
  shellClassName = "min-h-screen flex items-center justify-center p-4",
}: {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
  shellClassName?: string;
}) {
  const { t } = useLanguage();

  return (
    <div className={cn(shellClassName, className)}>
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
          {children ?? (
            <Button
              onClick={() => spaNavigate(getLoginUrl())}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {t("common.login")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Shared admin access-denied card (only after auth resolved). */
export function AdminAccessDenied({
  className,
  shellClassName = "min-h-screen cinematic-bg",
  onBack,
}: {
  className?: string;
  shellClassName?: string;
  onBack?: () => void;
}) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className={cn(shellClassName, "flex items-center justify-center p-4", className)}>
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="p-8 text-center">
          <Store className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-muted-foreground mb-6">{t("admin.adminOnly")}</p>
          <Button
            onClick={() => (onBack ? onBack() : setLocation("/"))}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
          >
            {t("common.back")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/** Super-admin denied card (Shield icon; uses same i18n as AdminAccessDenied). */
export function SuperAdminAccessDenied({
  onBack,
  className,
  shellClassName = "min-h-screen cinematic-bg",
}: {
  onBack?: () => void;
  className?: string;
  shellClassName?: string;
}) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <div className={cn(shellClassName, "flex items-center justify-center p-4", className)}>
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="p-8 text-center">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-muted-foreground mb-6">{t("admin.adminOnly")}</p>
          <Button
            onClick={() => (onBack ? onBack() : setLocation("/"))}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
          >
            {t("common.back")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
