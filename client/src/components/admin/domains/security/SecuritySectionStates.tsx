/**
 * SEMANTIC-SECTION-STATE-PLATFORM-1
 * Security section adapters — i18n at feature boundary; chrome via platform.
 */
import { AlertCircle } from "lucide-react";
import {
  SemanticEmptyState,
  SemanticLoadingState,
} from "@/design-system/semantic-section-state";
import { useLanguage } from "@/contexts/LanguageContext";

export function SecuritySectionLoading() {
  return <SemanticLoadingState variant="spinner" minHeight="min-h-[72px]" />;
}

export function SecuritySectionError() {
  const { t } = useLanguage();
  return (
    <SemanticEmptyState
      variant="admin"
      icon={AlertCircle}
      title={t("admin.security.loadError")}
      description={t("admin.security.loadErrorDesc")}
    />
  );
}
