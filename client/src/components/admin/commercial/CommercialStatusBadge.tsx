import { Badge } from "@/components/ui/badge";
import { adminSemantic } from "@/components/admin/layout/adminDashStyles";
import { cn } from "@/lib/utils";

/**
 * EXEC-7B — presentation-only commercial status badge.
 * Status determination is external; this component maps a resolved status to visuals.
 */
export type CommercialStatusBadgeState =
  | "trial"
  | "active"
  | "grace"
  | "suspended"
  | "expired"
  | "inactive";

type CommercialStatusBadgeProps = {
  status: CommercialStatusBadgeState;
  label: string;
  className?: string;
  size?: "sm" | "md";
};

const STATUS_STYLES: Record<
  CommercialStatusBadgeState,
  { className: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  trial: {
    variant: "secondary",
    className: cn(adminSemantic.statusTrial, "hover:bg-cyan-500"),
  },
  active: {
    variant: "default",
    className: "bg-green-600/90 text-white border-transparent hover:bg-green-600/90",
  },
  grace: {
    variant: "secondary",
    className: cn(adminSemantic.statusWarning, "hover:bg-orange-500/90"),
  },
  suspended: {
    variant: "destructive",
    className: "bg-orange-600/90 text-white border-transparent hover:bg-orange-600/90",
  },
  expired: {
    variant: "destructive",
    className: "bg-red-600/90 text-white border-transparent hover:bg-red-600/90",
  },
  inactive: {
    variant: "outline",
    className: "text-muted-foreground",
  },
};

export function CommercialStatusBadge({
  status,
  label,
  className,
  size = "sm",
}: CommercialStatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <Badge
      variant={style.variant}
      className={cn(
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        style.className,
        className
      )}
    >
      {label}
    </Badge>
  );
}
