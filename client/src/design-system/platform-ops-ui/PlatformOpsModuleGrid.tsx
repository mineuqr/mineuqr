/**
 * PLATFORM-OPERATIONS-UI-ADOPTION-1
 * Module grid + ownership list — remove feature-local layout chrome.
 */

import type { ReactNode } from "react";
import { PLATFORM_OPS_UI } from "./tokens";
import { cn } from "@/lib/utils";

export function PlatformOpsModuleGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-slot="platform-ops-module-grid"
      className={cn(PLATFORM_OPS_UI.moduleGrid, className)}
    >
      {children}
    </div>
  );
}

export function PlatformOpsOwnershipList({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  return (
    <ul
      data-slot="platform-ops-ownership-list"
      className={cn(PLATFORM_OPS_UI.ownershipList, className)}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
