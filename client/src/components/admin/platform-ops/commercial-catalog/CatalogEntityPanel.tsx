/**
 * COMMERCIAL-CATALOG-MANAGEMENT-UI-1 — list toolbar + table chrome.
 */

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlatformOpsEmptyState,
  PlatformOpsSection,
  PlatformOpsTable,
  PlatformOpsTableBody,
  PlatformOpsTableHead,
  PlatformOpsTableHeader,
  PlatformOpsTableRow,
  PlatformOpsToolbar,
} from "@/design-system/platform-ops-ui";

export function CatalogEntityPanel(props: {
  title: string;
  description: string;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActions?: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  isEmpty: boolean;
  headers: string[];
  children: ReactNode;
}) {
  return (
    <PlatformOpsSection title={props.title} description={props.description}>
      <PlatformOpsToolbar
        search={
          <Input
            value={props.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            placeholder={props.searchPlaceholder ?? "Search…"}
            className="max-w-xs"
            aria-label={`Search ${props.title}`}
          />
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {props.secondaryActions}
            {props.onPrimaryAction ? (
              <Button type="button" size="sm" onClick={props.onPrimaryAction}>
                {props.primaryActionLabel ?? "Create"}
              </Button>
            ) : null}
          </div>
        }
      />
      {props.isEmpty ? (
        <PlatformOpsEmptyState
          title={props.emptyTitle}
          description={props.emptyDescription}
        />
      ) : (
        <PlatformOpsTable>
          <PlatformOpsTableHeader>
            <PlatformOpsTableRow>
              {props.headers.map((h) => (
                <PlatformOpsTableHead key={h}>{h}</PlatformOpsTableHead>
              ))}
            </PlatformOpsTableRow>
          </PlatformOpsTableHeader>
          <PlatformOpsTableBody>{props.children}</PlatformOpsTableBody>
        </PlatformOpsTable>
      )}
    </PlatformOpsSection>
  );
}
