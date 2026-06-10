import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { getAdminRoute } from "@/lib/admin/routes/adminRouteRegistry";
import type { AdminRouteId } from "@/lib/admin/routes/adminRouteTypes";
import { cn } from "@/lib/utils";

type AdminRoutePlaceholderSectionProps = {
  routeId: AdminRouteId;
};

export function AdminRoutePlaceholderSection({ routeId }: AdminRoutePlaceholderSectionProps) {
  const { t, language } = useLanguage();
  const route = getAdminRoute(routeId);
  const title = t(route.labelKey);
  const description = route.descriptionKey
    ? t(route.descriptionKey)
    : t("admin.nav.placeholderDesc");

  return (
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
  );
}
