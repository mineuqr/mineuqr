import { cn } from "@/lib/utils";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import type { AdminPageSectionProps } from "./adminSectionContracts";

/** Simple dashboard section shell — matches overview page section markup. */
export function AdminPageSection({
  title,
  description,
  children,
  spacing = "default",
  className,
}: AdminPageSectionProps) {
  return (
    <section
      className={cn(spacing === "compact" ? "space-y-3" : "space-y-4", className)}
    >
      <h2 className={adminDash.sectionTitle}>{title}</h2>
      {description ? <p className={adminDash.sectionSub}>{description}</p> : null}
      {children ?? null}
    </section>
  );
}
