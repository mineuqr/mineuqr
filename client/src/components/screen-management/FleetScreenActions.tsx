import {
  FleetScreenManageMenu,
  type FleetScreenManageAction,
} from "@/components/screen-management/FleetScreenManageMenu";
import { Button } from "@/components/ui/button";
import {
  getScreenEntryUrl,
  getScreenLoginUrl,
} from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import { fleetScreenActionLabels } from "@/lib/screen-management/fleetScreenActionsPresentation";
import { ExternalLink, Settings2 } from "lucide-react";

/**
 * SCREEN-MANAGEMENT-UX-1E — shared primary / secondary / manage actions for card and table.
 */
export function FleetScreenActions({
  screenId,
  language,
  needsAttention,
  disabled = false,
  density,
  onSettings,
  onManage,
}: {
  screenId: string;
  language: string;
  needsAttention: boolean;
  disabled?: boolean;
  density: "card" | "table";
  onSettings: (screenId: string) => void;
  onManage: (screenId: string, action: FleetScreenManageAction) => void;
}) {
  const labels = fleetScreenActionLabels(language);
  const primaryHref = needsAttention ? getScreenLoginUrl() : getScreenEntryUrl();
  const primaryLabel = needsAttention ? labels.setUpScreen : labels.openScreen;
  const groupLabel = language === "ar" ? "إجراءات الشاشة" : "Screen actions";

  if (density === "table") {
    return (
      <div className="flex items-center justify-end gap-1" role="group" aria-label={groupLabel}>
        <Button size="sm" variant="default" className="h-8 shrink-0 px-2.5" disabled={disabled} asChild>
          <a href={primaryHref} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
            {primaryLabel}
          </a>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 shrink-0 px-2.5"
          disabled={disabled}
          onClick={() => onSettings(screenId)}
          aria-label={labels.settings}
        >
          <Settings2 className="h-3.5 w-3.5" aria-hidden />
          <span className="ml-1 hidden xl:inline">{labels.settings}</span>
        </Button>
        <FleetScreenManageMenu
          screenId={screenId}
          language={language}
          disabled={disabled}
          onManage={onManage}
          compact
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={groupLabel}>
      <Button size="sm" variant="default" className="min-h-9 flex-1" disabled={disabled} asChild>
        <a href={primaryHref} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
          {primaryLabel}
        </a>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="min-h-9"
        disabled={disabled}
        onClick={() => onSettings(screenId)}
      >
        <Settings2 className="mr-1 h-3.5 w-3.5" aria-hidden />
        {labels.settings}
      </Button>
      <FleetScreenManageMenu
        screenId={screenId}
        language={language}
        disabled={disabled}
        onManage={onManage}
      />
    </div>
  );
}
