/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1 — fact row primitive.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SemanticDetailFact({
  label,
  value,
  icon,
  badge,
  dir = "auto",
  className,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
  dir?: "ltr" | "rtl" | "auto";
  className?: string;
}) {
  return (
    <div
      data-slot="semantic-detail-fact"
      className={cn(
        "rounded-md border border-cyan-500/15 bg-slate-900/30 px-2.5 py-1.5",
        className
      )}
    >
      <dt className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-slate-500">
        {icon}
        <span>{label}</span>
      </dt>
      <dd dir={dir} className="mt-0.5 text-xs font-medium text-white break-words">
        {badge ?? value}
      </dd>
    </div>
  );
}
