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
};

export function AdminSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  className,
}: AdminSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {Icon ? (
            <div className={adminDash.iconContainer}>
              <Icon className="h-5 w-5" aria-hidden />
            </div>
          ) : null}
          <div>
            <h2 className={adminDash.sectionTitle}>{title}</h2>
            {description ? <p className={adminDash.sectionSub}>{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}
