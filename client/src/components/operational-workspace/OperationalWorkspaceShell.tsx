import type { ReactNode } from "react";
import { RestaurantDashSection } from "@/components/dashboard/RestaurantDashSection";
import { restaurantDash } from "@/components/dashboard/restaurantDashStyles";
import { cn } from "@/lib/utils";

export function OperationalWorkspaceShell({
  title,
  description,
  headerAside,
  kpis,
  operationsBar,
  filters,
  children,
  drawer,
  className,
}: {
  title: string;
  description?: string;
  headerAside?: ReactNode;
  kpis?: ReactNode;
  operationsBar?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
  drawer?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <RestaurantDashSection title={title} description={description} headerAside={headerAside}>
        {kpis ? <div className={cn(restaurantDash.kpiGridQuad, "mb-6")}>{kpis}</div> : null}
        {operationsBar ? <div className="mb-4">{operationsBar}</div> : null}
        {filters ? <div className="mb-4">{filters}</div> : null}
        {children}
      </RestaurantDashSection>
      {drawer}
    </div>
  );
}
