/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1 — section / group / divider.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SemanticDetailSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-slot="semantic-detail-section"
      className={cn("space-y-2", className)}
    >
      {title ? (
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {title}
        </h4>
      ) : null}
      {children}
    </section>
  );
}

export function SemanticDetailGroup({
  children,
  columns = 1,
  className,
}: {
  children: ReactNode;
  columns?: 1 | 2;
  className?: string;
}) {
  return (
    <dl
      data-slot="semantic-detail-group"
      className={cn(
        "grid gap-1.5",
        columns === 2 ? "grid-cols-2" : "grid-cols-1",
        className
      )}
    >
      {children}
    </dl>
  );
}

export function SemanticDetailDivider({ className }: { className?: string }) {
  return (
    <div
      data-slot="semantic-detail-divider"
      className={cn("border-t border-border/40", className)}
      role="separator"
    />
  );
}
