import { cn } from "@/lib/utils";
import { restaurantDash } from "./restaurantDashStyles";
import type { ReactNode } from "react";

type RestaurantDashSectionProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  ariaLabel?: string;
  className?: string;
  headerAside?: ReactNode;
};

export function RestaurantDashSection({
  title,
  description,
  children,
  ariaLabel,
  className,
  headerAside,
}: RestaurantDashSectionProps) {
  return (
    <section className={cn(restaurantDash.section, className)} aria-label={ariaLabel ?? title}>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
          headerAside ? "sm:gap-4" : undefined
        )}
      >
        <div className="space-y-1">
          <h2 className={restaurantDash.sectionTitle}>{title}</h2>
          {description ? <p className={restaurantDash.sectionSub}>{description}</p> : null}
        </div>
        {headerAside ? <div className="shrink-0">{headerAside}</div> : null}
      </div>
      {children}
    </section>
  );
}
