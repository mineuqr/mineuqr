import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

type AuthGateProps = {
  children: ReactNode;
  pending?: ReactNode;
  /** Shown when resolved and not authenticated */
  loginRequired?: ReactNode;
  /** Shown when requireAdmin and user is not admin (or guest) */
  accessDenied?: ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  className?: string;
};

/**
 * Renders children only after auth resolves. While pending: skeleton/spinner only.
 */
export function AuthGate({
  children,
  pending,
  loginRequired,
  accessDenied,
  requireAuth = false,
  requireAdmin = false,
  className,
}: AuthGateProps) {
  const gate = useAuthGate();

  if (gate.isPending) {
    return <>{pending ?? <AuthGatePending className={className} />}</>;
  }

  if (requireAuth && gate.showLoginRequired) {
    return <>{loginRequired ?? null}</>;
  }

  if (requireAdmin && gate.showAdminDenied) {
    return <>{accessDenied ?? <AdminAccessDenied className={className} />}</>;
  }

  return <>{children}</>;
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

/** Super-admin variant copy (Arabic hardcoded in page — optional icon). */
export function SuperAdminAccessDenied({ onBack }: { onBack?: () => void }) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen cinematic-bg flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="p-8 text-center">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">غير مصرح</h2>
          <p className="text-muted-foreground mb-6">هذه الصفحة متاحة فقط للمسؤولين</p>
          <Button
            onClick={() => (onBack ? onBack() : setLocation("/"))}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold w-full"
          >
            العودة للرئيسية
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
