import { useAuthGate } from "@/_core/hooks/useAuthGate";
import { AdminAccessDenied, AuthGatePending } from "@/components/AuthGate";
import { AdminOperationsShell } from "@/components/admin/layout/AdminOperationsShell";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatisticsPanel } from "./StatisticsPanel";

export default function AdminAnalyticsPage() {
  const { t, language } = useLanguage();
  const gate = useAuthGate();

  if (gate.isPending) {
    return <AuthGatePending />;
  }

  if (gate.showAdminDenied) {
    return <AdminAccessDenied />;
  }

  return (
    <AdminOperationsShell
      title={t("admin.nav.analytics")}
      subtitle={
        language === "ar"
          ? "تحليلات المنصة والاشتراكات (مصدر موحّد)"
          : "Platform analytics (canonical authority)"
      }
      breadcrumbs={[
        { label: t("admin.nav.overview"), href: "/admin" },
        { label: t("admin.nav.analytics") },
      ]}
    >
      <StatisticsPanel />
    </AdminOperationsShell>
  );
}
