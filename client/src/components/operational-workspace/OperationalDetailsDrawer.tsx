/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1
 * Operational detail Sheet — presentation chrome only (legacy name: Drawer).
 */
import { Button } from "@/components/ui/button";
import {
  SemanticDetailFooter,
  SemanticDetailSection,
  SemanticDetailSheet,
} from "@/design-system/semantic-detail-sheet";
import { OperationalTimeline } from "@/components/operational-workspace/OperationalTimeline";
import type { OperationalAction } from "@/lib/operational-workspace/operationalActions";
import type { ReactNode } from "react";

export function OperationalDetailsSheet({
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
  timeline?: Array<{
    eventId: string;
    fromStatus: string | null;
    toStatus: string;
    occurredAt: string;
  }>;
  language: string;
  actions?: OperationalAction[];
  onAction?: (actionId: OperationalAction["id"]) => void;
  actionPending?: boolean;
}) {
  const isAr = language === "ar";

  const footer =
    actions && actions.length > 0 && onAction ? (
      <SemanticDetailFooter>
        <div className="flex flex-col gap-2">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant={
                action.variant === "destructive"
                  ? "destructive"
                  : action.variant === "secondary"
                    ? "secondary"
                    : "default"
              }
              className="min-h-11 w-full touch-manipulation"
              disabled={actionPending}
              onClick={() => onAction(action.id)}
            >
              {isAr ? action.labelAr : action.labelEn}
            </Button>
          ))}
        </div>
      </SemanticDetailFooter>
    ) : undefined;

  return (
    <SemanticDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={title}
      footer={footer}
    >
      <div className="space-y-6">
        {children}
        {timeline ? (
          <SemanticDetailSection
            title={isAr ? "سجل العمليات" : "Activity timeline"}
          >
            <OperationalTimeline events={timeline} language={language} />
          </SemanticDetailSection>
        ) : null}
      </div>
    </SemanticDetailSheet>
  );
}

/** @deprecated Prefer OperationalDetailsSheet — Drawer was a Sheet. */
export const OperationalDetailsDrawer = OperationalDetailsSheet;
