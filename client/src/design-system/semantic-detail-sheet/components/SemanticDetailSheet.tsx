/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1
 * Canonical read-oriented detail Sheet shell — presentation only.
 *
 * Features own queries, content, and actions. Platform owns chrome,
 * scroll, width, header/footer slots, and state layouts.
 */
import type { ReactNode } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  SEMANTIC_DETAIL_SHEET_SIZE_CLASS,
  type SemanticDetailSheetSize,
} from "../tokens/size";
import { SemanticDetailHeader } from "./SemanticDetailChrome";

export type SemanticDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  status?: ReactNode;
  size?: SemanticDetailSheetSize;
  side?: "right" | "left" | "bottom" | "top";
  dir?: "ltr" | "rtl";
  headerClassName?: string;
  /** Extra classes on SheetContent (border/bg overrides). */
  className?: string;
  /** Extra classes on the scroll/body region. */
  bodyClassName?: string;
  /** Body content — feature-owned. */
  children: ReactNode;
  footer?: ReactNode;
  /** When true, body uses flex-1 overflow scroll (default true). */
  scrollBody?: boolean;
};

export function SemanticDetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  icon,
  status,
  size = "md",
  side = "right",
  dir,
  headerClassName,
  className,
  bodyClassName,
  children,
  footer,
  scrollBody = true,
}: SemanticDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        dir={dir}
        data-slot="semantic-detail-sheet"
        data-size={size}
        className={cn(
          "flex w-full flex-col gap-0 overflow-hidden bg-card p-0",
          SEMANTIC_DETAIL_SHEET_SIZE_CLASS[size],
          side === "bottom" && "max-h-[92vh]",
          className
        )}
      >
        <div className="px-4 pt-6 sm:px-6">
          <SemanticDetailHeader
            title={title}
            subtitle={subtitle}
            icon={icon}
            status={status}
            className={headerClassName}
          />
        </div>

        <div
          data-slot="semantic-detail-body"
          className={cn(
            "px-4 py-4 sm:px-6",
            scrollBody && "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            bodyClassName
          )}
        >
          {children}
        </div>

        {footer ? (
          <div
            data-slot="semantic-detail-footer-slot"
            className="px-4 pb-4 sm:px-6"
          >
            {footer}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
