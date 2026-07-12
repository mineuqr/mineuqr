import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import type { FleetScreenManageAction } from "@/components/screen-management/FleetScreenCard";
import { ScreenAccessTabPanel } from "@/components/screen-management/ScreenAccessTabPanel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/**
 * Legacy access lifecycle sheet — prefer ScreenDetailsSheet (UX-1C).
 * Retained for credential governance guard references.
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{isAr ? "الوصول للشاشة" : "Screen Access"}</SheetTitle>
          <SheetDescription>{displayName}</SheetDescription>
        </SheetHeader>
        {screenId ? (
          <div className="mt-6">
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
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
