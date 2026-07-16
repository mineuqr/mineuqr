import { cn } from "@/lib/utils";
import { ShieldOff } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Platform forbidden state — authenticated but not authorized.
 */
export function AppForbiddenState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-6 py-12 text-center sm:py-16",
        className
      )}
      role="alert"
      data-app-state="forbidden"
    >
      <ShieldOff className="h-8 w-8 text-amber-500" aria-hidden />
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
