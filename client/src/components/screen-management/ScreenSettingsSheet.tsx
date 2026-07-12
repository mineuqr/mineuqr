import { ScreenDisplayTabPanel } from "@/components/screen-management/ScreenDisplayTabPanel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { screenSettingsSheetDescription } from "@/lib/screen-management/screenSettingsRuntimeMessaging";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

/**
 * Legacy single-purpose settings sheet — prefer ScreenDetailsSheet (UX-1C).
 * Retained for architecture guard references and isolated reuse.
 */
export function ScreenSettingsSheet({
  open,
  onOpenChange,
  screenId,
  restaurantId,
  language,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string | null;
  restaurantId: number;
  language: string;
}) {
  const isAr = language === "ar";

  const fleetQuery = trpc.operationalDevice.fleet.queryScreens.useQuery(
    { restaurantId, limit: 200 },
    { enabled: open && screenId != null && restaurantId > 0 }
  );
  const fleetScreen = fleetQuery.data?.items.find((item) => item.screenId === screenId) ?? null;

  if (!screenId) return null;

  if (fleetQuery.isLoading && !fleetScreen) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="flex items-center justify-center sm:max-w-lg">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </SheetContent>
      </Sheet>
    );
  }

  if (!fleetScreen) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{isAr ? "إعدادات الشاشة" : "Screen Settings"}</SheetTitle>
          <SheetDescription>{screenSettingsSheetDescription(isAr)}</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <ScreenDisplayTabPanel
            screenId={screenId}
            fleetScreen={fleetScreen}
            restaurantId={restaurantId}
            language={language}
            categorySummary={null}
            enabled={open}
            onSaved={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
