import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminDash } from "@/components/admin/layout";
import { accountClassificationLabel } from "@/lib/admin/accountClassificationDisplay";
import { cn } from "@/lib/utils";
import type { AccountClassification } from "@shared/accountClassification";
import type { SecurityAccountGovernance } from "./useSecurityAccountGovernance";

type SecurityClassificationCellProps = {
  user: {
    id: number;
    accountClassification?: AccountClassification;
  };
  governance: SecurityAccountGovernance;
};

export function SecurityClassificationCell({ user, governance }: SecurityClassificationCellProps) {
  const {
    editingUserId,
    editingClassification,
    setEditingClassification,
    accountClassifications,
    language,
  } = governance;

  if (editingUserId === user.id) {
    return (
      <Select
        value={editingClassification}
        onValueChange={(val: AccountClassification) => setEditingClassification(val)}
      >
        <SelectTrigger className={cn(adminDash.opsSelect, "h-7 w-full border-border bg-background")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {accountClassifications.map((c) => (
            <SelectItem key={c} value={c}>
              {accountClassificationLabel(c, language === "ar" ? "ar" : "en")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Badge variant="outline" className={adminDash.opsBadge}>
      {accountClassificationLabel(
        user.accountClassification ?? "COMMERCIAL",
        language === "ar" ? "ar" : "en"
      )}
    </Badge>
  );
}
