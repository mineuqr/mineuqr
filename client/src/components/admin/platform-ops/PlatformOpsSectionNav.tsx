/**
 * OPERATIONS-INFORMATION-ARCHITECTURE-1
 * Secondary nav for Platform Operations workspace.
 */

import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  PLATFORM_OPS_SECTION_DEFINITIONS,
  type PlatformOpsSectionId,
} from "@/lib/admin/platform-ops/platformOpsSections";
import { adminDash } from "@/components/admin/layout/adminDashStyles";

type PlatformOpsSectionNavProps = {
  active: PlatformOpsSectionId;
};

export function PlatformOpsSectionNav({ active }: PlatformOpsSectionNavProps) {
  const { t } = useLanguage();

  return (
    <nav
      aria-label={t("admin.platformOps.sectionNavLabel")}
      className="flex flex-wrap gap-1.5"
    >
      {PLATFORM_OPS_SECTION_DEFINITIONS.map((section) => {
        const isActive = section.id === active;
        return (
          <Link
            key={section.id}
            href={section.path}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-colors",
              isActive
                ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-100"
                : "border-cyan-500/20 bg-slate-800/40 text-cyan-200/80 hover:border-cyan-400/40 hover:bg-slate-800/70 hover:text-cyan-100"
            )}
          >
            {t(section.labelKey)}
            {section.status === "reserved" ? (
              <span className={cn(adminDash.opsBadge, "text-cyan-400/70")}>
                {t("admin.platformOps.reserved")}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
