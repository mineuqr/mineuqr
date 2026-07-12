import {
  getScreenEntryUrl,
  getScreenLoginUrl,
} from "@/lib/screen-credential-lifecycle/screenEntryUrl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export type FleetScreenManageAction =
  | "show_qr"
  | "copy_link"
  | "copy_setup_link"
  | "regenerate"
  | "delete"
  | "diagnostics";

/**
 * SCREEN-MANAGEMENT-UX-1B — shared manage menu for card and table rows.
 * Presentation only; actions are dispatched to the parent.
 */
export function FleetScreenManageMenu({
  screenId,
  language,
  disabled = false,
  onManage,
  compact = false,
}: {
  screenId: string;
  language: string;
  disabled?: boolean;
  onManage: (screenId: string, action: FleetScreenManageAction) => void;
  compact?: boolean;
}) {
  const isAr = language === "ar";
  const screenEntryUrl = getScreenEntryUrl();
  const screenSetupUrl = getScreenLoginUrl();

  const copyToClipboard = (value: string) => {
    void navigator.clipboard?.writeText(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={compact ? "h-8 w-8 p-0" : "min-h-9"}
          disabled={disabled}
          aria-label={isAr ? "إدارة الشاشة" : "Manage screen"}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13.5rem]">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {isAr ? "الوصول" : "Access"}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onManage(screenId, "show_qr")}>
          {isAr ? "عرض QR" : "Show QR"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            copyToClipboard(screenEntryUrl);
            onManage(screenId, "copy_link");
          }}
        >
          {isAr ? "نسخ الرابط" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            copyToClipboard(screenSetupUrl);
            onManage(screenId, "copy_setup_link");
          }}
        >
          {isAr ? "نسخ رابط الإعداد" : "Copy setup link"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {isAr ? "الدعم" : "Support"}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onManage(screenId, "diagnostics")}>
          {isAr ? "التشخيص" : "Diagnostics"}
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          {isAr ? "خطر" : "Danger zone"}
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onManage(screenId, "regenerate")}>
          {isAr ? "إعادة توليد الاعتماد" : "Regenerate Credential"}
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onManage(screenId, "delete")}
        >
          {isAr ? "حذف الشاشة" : "Delete Screen"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
