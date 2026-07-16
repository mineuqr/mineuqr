import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LogIn } from "lucide-react";

/**
 * Platform unauthorized state — authentication required.
 */
export function AppUnauthorizedState({
  title,
  description,
  loginLabel,
  onLogin,
  className,
}: {
  title: string;
  description?: string;
  loginLabel: string;
  onLogin: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 bg-card px-6 py-12 text-center sm:py-16",
        className
      )}
      role="status"
      data-app-state="unauthorized"
    >
      <LogIn className="h-10 w-10 text-primary" aria-hidden />
      <h3 className="text-xl font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      <Button type="button" className="mt-2 w-full max-w-xs" onClick={onLogin}>
        {loginLabel}
      </Button>
    </div>
  );
}
