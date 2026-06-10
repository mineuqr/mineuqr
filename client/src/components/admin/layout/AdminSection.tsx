import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminDash } from "./adminDashStyles";

type AdminSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** UX-REFINE-1D — match Operations section density */
  density?: "default" | "console";
};

export function AdminSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
  density = "default",
}: AdminSectionProps) {
  const isConsole = density === "console";

  return (
    <section className={cn(isConsole ? "space-y-2" : "space-y-4", className)}>
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-start sm:justify-between",
          isConsole ? "gap-2" : "gap-3"
        )}
      >
        <div className={cn("flex items-start", isConsole ? "gap-2" : "gap-3")}>
          {Icon ? (
            <div className={adminDash.iconContainer}>
              <Icon className="h-5 w-5" aria-hidden />
            </div>
          ) : null}
          <div>
            <h2 className={isConsole ? adminDash.sectionTitleCompact : adminDash.sectionTitle}>
              {title}
            </h2>
            {description ? <p className={adminDash.sectionSub}>{description}</p> : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
