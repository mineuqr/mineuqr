/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * + PLATFORM-OPERATIONS-UI-ADOPTION-1
 * Secondary nav for Platform Operations workspace.
 * Link targets / section order unchanged — presentation tokens + status badge only.
 * PLATFORM-P0-PRODUCTION-READINESS-1 — truthful status badges for every section.
 */

import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  PLATFORM_OPS_SECTION_DEFINITIONS,
  platformOpsStatusBadgeTone,
  platformOpsStatusLabelKey,
  type PlatformOpsSectionId,
} from "@/lib/admin/platform-ops/platformOpsSections";
import {
  PLATFORM_OPS_UI,
  PlatformOpsStatusBadge,
} from "@/design-system/platform-ops-ui";

type PlatformOpsSectionNavProps = {
  active: PlatformOpsSectionId;
};

export function PlatformOpsSectionNav({ active }: PlatformOpsSectionNavProps) {
  const { t } = useLanguage();

  return (
    <nav
      aria-label={t("admin.platformOps.sectionNavLabel")}
      className={PLATFORM_OPS_UI.sectionNav.list}
    >
      {PLATFORM_OPS_SECTION_DEFINITIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <Link
            key={section.id}
            href={section.path}
            className={cn(
              PLATFORM_OPS_UI.sectionNav.link,
              isActive
                ? PLATFORM_OPS_UI.sectionNav.linkActive
                : PLATFORM_OPS_UI.sectionNav.linkIdle
            )}
          >
            {t(section.labelKey)}
            <PlatformOpsStatusBadge
              status={platformOpsStatusBadgeTone(section.status)}
              label={t(platformOpsStatusLabelKey(section.status))}
            />
          </Link>
        );
      })}
    </nav>
  );
}
