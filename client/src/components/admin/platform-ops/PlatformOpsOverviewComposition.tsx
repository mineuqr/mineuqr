/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * Platform Operations — Overview section.
 */

import { Link } from "wouter";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  PLATFORM_OPS_SECTION_DEFINITIONS,
} from "@/lib/admin/platform-ops/platformOpsSections";
import { cn } from "@/lib/utils";

export function PlatformOpsOverviewComposition() {
  const { t } = useLanguage();

  return (
    <AdminSection
      title={t("admin.platformOps.overview.title")}
      description={t("admin.platformOps.overview.body")}
      density="console"
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_OPS_SECTION_DEFINITIONS.filter((s) => s.id !== "overview").map(
          (section) => (
            <Link
              key={section.id}
              href={section.path}
              className={cn(
                adminDash.card,
                "block p-3 transition-colors hover:border-cyan-400/40"
              )}
            >
              <p className="text-sm font-semibold text-white">
                {t(section.labelKey)}
              </p>
              <p className="mt-1 text-xs text-cyan-300/80">
                {t(section.descriptionKey)}
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-wide text-cyan-400/70">
                {section.status === "live"
                  ? t("admin.platformOps.live")
                  : t("admin.platformOps.reserved")}
              </p>
            </Link>
          )
        )}
      </div>
    </AdminSection>
  );
}
