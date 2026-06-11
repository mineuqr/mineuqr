import { AlertCircle } from "lucide-react";
import { PageDataLoading } from "@/components/AuthGate";
import { AdminEmptyState } from "@/components/admin/operations/AdminEmptyState";
import { useLanguage } from "@/contexts/LanguageContext";

export function SecuritySectionLoading() {
  return <PageDataLoading minHeight="min-h-[72px]" />;
}

export function SecuritySectionError() {
  const { t } = useLanguage();
  return (
    <AdminEmptyState
      icon={AlertCircle}
      title={t("admin.security.loadError")}
      description={t("admin.security.loadErrorDesc")}
    />
  );
}
