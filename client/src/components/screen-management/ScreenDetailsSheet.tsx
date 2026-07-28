import type { FleetScreenManageAction } from "@/components/screen-management/FleetScreenCard";
import { ScreenAccessTabPanel } from "@/components/screen-management/ScreenAccessTabPanel";
import { ScreenDiagnosticsTabPanel } from "@/components/screen-management/ScreenDiagnosticsTabPanel";
import { ScreenDisplayTabPanel } from "@/components/screen-management/ScreenDisplayTabPanel";
import { SemanticDetailSheet } from "@/design-system/semantic-detail-sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import {
  type ScreenDetailsTab,
  screenDetailsTabLabel,
} from "@/lib/screen-management/screenDetailsPresentation";
import { useEffect, useState } from "react";

/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1 — Screen details chrome.
 * Tab panels remain feature-owned (display / access / diagnostics).
 */
export function ScreenDetailsSheet({
  open,
  onOpenChange,
  screenId,
  screen,
  restaurantId,
  language,
  initialTab = "display",
  accessFocus = null,
  categorySummary,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string | null;
  screen: FleetScreenReadModel | null;
  restaurantId: number;
  language: string;
  initialTab?: ScreenDetailsTab;
  accessFocus?: FleetScreenManageAction | null;
  categorySummary: string | null;
  onDeleted?: () => void;
}) {
  const isAr = language === "ar";
  const [activeTab, setActiveTab] = useState<ScreenDetailsTab>(initialTab);

  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab, screenId]);

  if (!screenId || !screen) return null;

  const displayName = screen.displayName;

  return (
    <SemanticDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      title={isAr ? "تفاصيل الشاشة" : "Screen details"}
      subtitle={displayName}
      scrollBody={false}
      bodyClassName="flex min-h-0 flex-1 flex-col overflow-hidden py-0"
    >
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as ScreenDetailsTab)}
        className="mt-0 flex min-h-0 flex-1 flex-col gap-0 pb-4"
      >
        <TabsList
          className="grid h-auto w-full shrink-0 grid-cols-3"
          aria-label={isAr ? "تبويبات تفاصيل الشاشة" : "Screen details tabs"}
        >
          <TabsTrigger value="display">
            {screenDetailsTabLabel("display", language)}
          </TabsTrigger>
          <TabsTrigger value="access">
            {screenDetailsTabLabel("access", language)}
          </TabsTrigger>
          <TabsTrigger value="diagnostics">
            {screenDetailsTabLabel("diagnostics", language)}
          </TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto pt-4">
          <TabsContent
            value="display"
            className="mt-0 focus-visible:outline-none transition-opacity duration-150 data-[state=inactive]:hidden"
          >
            {activeTab === "display" ? (
              <ScreenDisplayTabPanel
                screenId={screenId}
                fleetScreen={screen}
                restaurantId={restaurantId}
                language={language}
                categorySummary={categorySummary}
                enabled={open}
              />
            ) : null}
          </TabsContent>

          <TabsContent
            value="access"
            className="mt-0 focus-visible:outline-none transition-opacity duration-150 data-[state=inactive]:hidden"
          >
            {activeTab === "access" ? (
              <ScreenAccessTabPanel
                screenId={screenId}
                displayName={displayName}
                restaurantId={restaurantId}
                language={language}
                enabled={open}
                initialFocus={accessFocus}
                onDeleted={() => {
                  onOpenChange(false);
                  onDeleted?.();
                }}
              />
            ) : null}
          </TabsContent>

          <TabsContent
            value="diagnostics"
            className="mt-0 focus-visible:outline-none transition-opacity duration-150 data-[state=inactive]:hidden"
          >
            {activeTab === "diagnostics" ? (
              <ScreenDiagnosticsTabPanel
                screenId={screenId}
                fleetScreen={screen}
                restaurantId={restaurantId}
                language={language}
                enabled={open}
              />
            ) : null}
          </TabsContent>
        </div>
      </Tabs>
    </SemanticDetailSheet>
  );
}
