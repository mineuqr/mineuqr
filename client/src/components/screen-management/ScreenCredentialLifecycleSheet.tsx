import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import type { FleetScreenManageAction } from "@/components/screen-management/FleetScreenCard";
import { ScreenAccessTabPanel } from "@/components/screen-management/ScreenAccessTabPanel";
import { SemanticDetailSheet } from "@/design-system/semantic-detail-sheet";

/**
 * Legacy access lifecycle sheet — prefer ScreenDetailsSheet (UX-1C).
 * Retained for credential governance guard references.
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1 — chrome via SemanticDetailSheet.
 */
export function ScreenCredentialLifecycleSheet({
  open,
  onOpenChange,
  screenId,
  screen,
  displayName,
  restaurantId,
  language,
  initialFocus = null,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string | null;
  screen?: FleetScreenReadModel | null;
  displayName: string;
  restaurantId: number;
  language: string;
  initialFocus?: FleetScreenManageAction | null;
  onDeleted?: () => void;
}) {
  const isAr = language === "ar";
  const enabled = open && screenId != null;
  void screen;

  return (
    <SemanticDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={isAr ? "الوصول للشاشة" : "Screen Access"}
      subtitle={displayName}
    >
      {screenId ? (
        <ScreenAccessTabPanel
          screenId={screenId}
          displayName={displayName}
          restaurantId={restaurantId}
          language={language}
          enabled={enabled}
          initialFocus={initialFocus}
          onDeleted={() => {
            onOpenChange(false);
            onDeleted?.();
          }}
        />
      ) : null}
    </SemanticDetailSheet>
  );
}
