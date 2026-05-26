import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { adminDash } from "../layout/adminDashStyles";

type AdminIconButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "outline" | "default" | "destructive" | "ghost";
  className?: string;
  children: ReactNode;
  type?: "button" | "submit";
};

/** Accessible icon button with tooltip + aria-label (ADM-1C). */
export function AdminIconButton({
  label,
  onClick,
  disabled,
  variant = "outline",
  className,
  children,
  type = "button",
}: AdminIconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type={type}
          size="sm"
          variant={variant}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          className={cn(adminDash.opBtn, "px-2.5", className)}
        >
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
