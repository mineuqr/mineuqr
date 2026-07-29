/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Platform Operations — Overview section.
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { PLATFORM_OPS_SECTION_DEFINITIONS } from "@/lib/admin/platform-ops/platformOpsSections";
import {
  PlatformOpsModuleTile,
  PlatformOpsSection,
} from "@/design-system/platform-ops-ui";

export function PlatformOpsOverviewComposition() {
  const { t } = useLanguage();

  return (
    <PlatformOpsSection
      title={t("admin.platformOps.overview.title")}
      description={t("admin.platformOps.overview.body")}
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORM_OPS_SECTION_DEFINITIONS.filter((s) => s.id !== "overview").map(
          (section) => (
            <PlatformOpsModuleTile
              key={section.id}
              href={section.path}
              title={t(section.labelKey)}
              description={t(section.descriptionKey)}
              live={section.status === "live"}
              statusLabel={
                section.status === "live"
                  ? t("admin.platformOps.live")
                  : t("admin.platformOps.reserved")
              }
            />
          )
        )}
      </div>
    </PlatformOpsSection>
  );
}
