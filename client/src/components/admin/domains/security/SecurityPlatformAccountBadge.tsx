import { Badge } from "@/components/ui/badge";
import { adminDash } from "@/components/admin/layout";
import { isProtectedPlatformAccountUser } from "@shared/platformAccount";

import type { PlatformAccountProtectable } from "@shared/platformAccount";

type SecurityPlatformAccountBadgeProps = {
  user: PlatformAccountProtectable;
  label: string;
};

export function SecurityPlatformAccountBadge({ user, label }: SecurityPlatformAccountBadgeProps) {
  if (!isProtectedPlatformAccountUser(user)) {
    return null;
  }

  return (
    <Badge variant="secondary" className={adminDash.opsBadge}>
      {label}
    </Badge>
  );
}
