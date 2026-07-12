import type { FleetScreenReadModel } from "@/lib/screen-fleet/fleetReadModel";
import {
  getScreenEntryUrl,
  getScreenLoginUrl,
} from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import {
  presenceLabel,
  screenTypeLabel,
} from "@/lib/operational-screen/screenLabels";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ExternalLink,
  MoreHorizontal,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { screenNeedsAttention } from "@/lib/screen-management/operatorFleetPresentation";

export type FleetScreenManageAction =
  | "show_qr"
  | "copy_link"
  | "copy_setup_link"
  | "regenerate"
  | "delete"
  | "diagnostics";

/**
 * Fleet card — operator-first presentation (SCREEN-MANAGEMENT-UX-1A).
 */
export function FleetScreenCard({
  screen,
  language,
  categorySummary,
  onSettings,
  onManage,
}: {
  screen: FleetScreenReadModel;
  language: string;
  categorySummary?: string | null;
  onSettings: (screenId: string) => void;
  onManage: (screenId: string, action: FleetScreenManageAction) => void;
}) {
  const isAr = language === "ar";
  const { healthSummary } = screen;
  const needsAttention = screenNeedsAttention(screen);
  const isDisabled = screen.canonicalState.maintenanceState === "maintenance";
  const screenEntryUrl = getScreenEntryUrl();
  const screenSetupUrl = getScreenLoginUrl();

  const copyToClipboard = (value: string) => {
    void navigator.clipboard?.writeText(value);
  };

  return (
    <article
      className={cn(
        "flex w-full flex-col rounded-2xl border p-5 shadow-sm min-h-[220px]",
        healthSummary.presence === "online" && "border-emerald-500/40 bg-emerald-500/5",
        needsAttention && healthSummary.presence !== "online" && "border-amber-500/40 bg-amber-500/5",
        isDisabled && "opacity-70"
      )}
      data-screen-id={screen.screenId}
      data-needs-attention={needsAttention ? "true" : "false"}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{screen.displayName}</p>
          <p className="text-sm text-muted-foreground">{screenTypeLabel(screen.role, language)}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
            healthSummary.presence === "online" && "bg-emerald-500/15 text-emerald-700",
            healthSummary.presence === "offline" && "bg-amber-500/15 text-amber-800",
            healthSummary.presence === "never_seen" && "bg-muted text-muted-foreground"
          )}
        >
          {presenceLabel(healthSummary.presence, language)}
        </span>
      </div>

      {needsAttention ? (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{isAr ? "يحتاج انتباه — أكمل الإعداد على الجهاز" : "Needs attention — finish setup on the device"}</span>
        </div>
      ) : null}

      <dl className="mb-4 flex-1 space-y-2 text-sm">
        <div className="flex justify-between gap-2">
          <dt className="text-muted-foreground">{isAr ? "آخر اتصال" : "Last seen"}</dt>
          <dd>
            {screen.lastHeartbeat
              ? new Date(screen.lastHeartbeat).toLocaleString(isAr ? "ar-SA" : "en-US")
              : isAr ? "لم يتصل بعد" : "Not yet connected"}
          </dd>
        </div>
        {categorySummary ? (
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{isAr ? "الأصناف" : "Items"}</dt>
            <dd className="text-end">{categorySummary}</dd>
          </div>
        ) : null}
      </dl>

      <div className="flex flex-wrap gap-2">
        {needsAttention ? (
          <Button
            size="sm"
            variant="default"
            className="min-h-10 flex-1"
            disabled={isDisabled}
            asChild
          >
            <a href={screenSetupUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              {isAr ? "إعداد الشاشة" : "Set up screen"}
            </a>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="default"
            className="min-h-10 flex-1"
            disabled={isDisabled}
            asChild
          >
            <a href={screenEntryUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" />
              {isAr ? "فتح الشاشة" : "Open screen"}
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="min-h-10"
          onClick={() => onSettings(screen.screenId)}
        >
          <Settings2 className="mr-1 h-4 w-4" />
          {isAr ? "الإعدادات" : "Settings"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="min-h-10"
              disabled={isDisabled}
              aria-label={isAr ? "إدارة الشاشة" : "Manage screen"}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[12rem]">
            <DropdownMenuItem onClick={() => onManage(screen.screenId, "show_qr")}>
              {isAr ? "عرض QR" : "Show QR"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                copyToClipboard(screenEntryUrl);
                onManage(screen.screenId, "copy_link");
              }}
            >
              {isAr ? "نسخ الرابط" : "Copy link"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                copyToClipboard(screenSetupUrl);
                onManage(screen.screenId, "copy_setup_link");
              }}
            >
              {isAr ? "نسخ رابط الإعداد" : "Copy setup link"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onManage(screen.screenId, "regenerate")}>
              {isAr ? "إعادة توليد الاعتماد" : "Regenerate Credential"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onManage(screen.screenId, "delete")}
            >
              {isAr ? "حذف الشاشة" : "Delete Screen"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onManage(screen.screenId, "diagnostics")}>
              {isAr ? "التشخيص" : "Diagnostics"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}
