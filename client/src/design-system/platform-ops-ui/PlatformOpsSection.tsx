/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Section container — AdminSection at console density.
 */

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AdminSection } from "@/components/admin/layout/AdminSection";
import { PLATFORM_OPS_UI } from "./tokens";

type PlatformOpsSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PlatformOpsSection({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: PlatformOpsSectionProps) {
  return (
    <AdminSection
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      className={className}
      density={PLATFORM_OPS_UI.sectionDensity}
    >
      {children}
    </AdminSection>
  );
}
