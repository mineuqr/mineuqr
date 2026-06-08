import { Link } from "wouter";
import { ArrowRight, Construction } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import type { AdminNavItem } from "@/lib/admin/adminNavigation";
import { cn } from "@/lib/utils";

type AdminSectionPlaceholderProps = {
  navItem: AdminNavItem;
};

export function AdminSectionPlaceholder({ navItem }: AdminSectionPlaceholderProps) {
  const { t, language } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  const title = t(navItem.labelKey);
  const description = navItem.descriptionKey
    ? t(navItem.descriptionKey)
    : t("admin.nav.placeholderDesc");

  return (
    <AdminOperationsShell
      title={title}
      subtitle={description}
      breadcrumbs={[
        { label: t("admin.nav.overview"), href: "/admin" },
        { label: title },
      ]}
      statusIndicator={
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          <Construction className="h-4 w-4 shrink-0" />
          <span>{t("admin.nav.comingSoon")}</span>
        </div>
      }
    >
      <Card className={adminDash.card}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>{description}</p>
          <p>{t("admin.nav.placeholderBody")}</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin">
              {t("admin.nav.backToOverview")}
              <ArrowRight
                className={cn("ms-2 h-4 w-4", language === "en" && "rotate-180")}
              />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </AdminOperationsShell>
  );
}
