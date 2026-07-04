import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { OperationalTimeline } from "@/components/operational-workspace/OperationalTimeline";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import type { ReactNode } from "react";

export function OperationalDetailsDrawer({
  open,
  onOpenChange,
  title,
  children,
  timeline,
  language,
  actions,
  onAction,
  actionPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  timeline?: Array<{ eventId: string; fromStatus: string | null; toStatus: string; occurredAt: string }>;
  language: string;
  actions?: OperationalAction[];
  onAction?: (actionId: OperationalAction["id"]) => void;
  actionPending?: boolean;
}) {
  const isAr = language === "ar";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          {children}
          {actions && actions.length > 0 && onAction ? (
            <div className="flex flex-col gap-2">
              {actions.map((action) => (
                <Button
                  key={action.id}
                  variant={action.variant === "destructive" ? "destructive" : action.variant === "secondary" ? "secondary" : "default"}
                  className="min-h-11 w-full touch-manipulation"
                  disabled={actionPending}
                  onClick={() => onAction(action.id)}
                >
                  {isAr ? action.labelAr : action.labelEn}
                </Button>
              ))}
            </div>
          ) : null}
          {timeline ? (
            <div>
              <h4 className="mb-3 text-sm font-semibold">
                {isAr ? "سجل العمليات" : "Activity timeline"}
              </h4>
              <OperationalTimeline events={timeline} language={language} />
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
