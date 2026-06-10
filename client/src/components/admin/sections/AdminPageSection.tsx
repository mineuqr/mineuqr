import { cn } from "@/lib/utils";
import { adminDash } from "@/components/admin/layout/adminDashStyles";
import type { AdminPageSectionProps } from "./adminSectionContracts";

const SECTION_SPACING: Record<NonNullable<AdminPageSectionProps["spacing"]>, string> = {
  tight: "space-y-2",
  compact: "space-y-3",
  default: "space-y-4",
};

/** Simple dashboard section shell — matches overview page section markup. */
export function AdminPageSection({
  title,
  description,
  children,
  spacing = "default",
  titleVariant = "default",
  ariaLabel,
  className,
}: AdminPageSectionProps) {
  const headingClass =
    titleVariant === "compact" ? adminDash.sectionTitleCompact : adminDash.sectionTitle;

  return (
    <section
      aria-label={!title ? ariaLabel : undefined}
      className={cn(SECTION_SPACING[spacing], className)}
    >
      {title ? <h2 className={headingClass}>{title}</h2> : null}
      {description ? <p className={adminDash.sectionSub}>{description}</p> : null}
      {children ?? null}
    </section>
  );
}
