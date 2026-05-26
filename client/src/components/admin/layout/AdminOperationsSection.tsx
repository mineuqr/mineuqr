import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminDash } from "./adminDashStyles";

type AdminOperationsSectionProps = {
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AdminOperationsSection({ toolbar, children, className }: AdminOperationsSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {toolbar ? (
        <div className={cn(adminDash.card, "p-3 sm:p-4")}>{toolbar}</div>
      ) : null}
      {children}
    </div>
  );
}
