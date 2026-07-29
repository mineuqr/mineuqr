/**
 * PLATFORM-OPERATIONS-UI-FOUNDATION-1
 * Operational table — Semantic Table Platform facade.
 */

import type { ComponentProps, ReactNode } from "react";
import {
  SemanticTable,
  SemanticTableActions,
  SemanticTableBody,
  SemanticTableCell,
  SemanticTableDesktop,
  SemanticTableEmptyState,
  SemanticTableErrorState,
  SemanticTableFrame,
  SemanticTableHead,
  SemanticTableHeader,
  SemanticTableLoadingState,
  SemanticTableMobile,
  SemanticTablePagination,
  SemanticTableRoot,
  SemanticTableRow,
  SemanticTableScroll,
  SemanticTableSkeleton,
  SemanticTableStatusCell,
} from "@/design-system/semantic-table";

export function PlatformOpsTable(props: ComponentProps<typeof SemanticTable>) {
  return <SemanticTable data-slot="platform-ops-table" {...props} />;
}

export function PlatformOpsTableFrame(
  props: ComponentProps<typeof SemanticTableFrame>
) {
  return <SemanticTableFrame {...props} />;
}

export function PlatformOpsTableScroll(
  props: ComponentProps<typeof SemanticTableScroll>
) {
  return <SemanticTableScroll {...props} />;
}

export function PlatformOpsTableDesktop(
  props: ComponentProps<typeof SemanticTableDesktop>
) {
  return <SemanticTableDesktop {...props} />;
}

export function PlatformOpsTableMobile(
  props: ComponentProps<typeof SemanticTableMobile>
) {
  return <SemanticTableMobile {...props} />;
}

export function PlatformOpsTableRoot(
  props: ComponentProps<typeof SemanticTableRoot>
) {
  return <SemanticTableRoot density={props.density ?? "ops"} {...props} />;
}

export function PlatformOpsTableHeader(
  props: ComponentProps<typeof SemanticTableHeader>
) {
  return <SemanticTableHeader density={props.density ?? "ops"} {...props} />;
}

export function PlatformOpsTableBody(
  props: ComponentProps<typeof SemanticTableBody>
) {
  return <SemanticTableBody {...props} />;
}

export function PlatformOpsTableRow(
  props: ComponentProps<typeof SemanticTableRow>
) {
  return <SemanticTableRow density={props.density ?? "ops"} {...props} />;
}

export function PlatformOpsTableHead(
  props: ComponentProps<typeof SemanticTableHead>
) {
  return <SemanticTableHead density={props.density ?? "ops"} {...props} />;
}

export function PlatformOpsTableCell(
  props: ComponentProps<typeof SemanticTableCell>
) {
  return <SemanticTableCell density={props.density ?? "ops"} {...props} />;
}

export function PlatformOpsTableActions(
  props: ComponentProps<typeof SemanticTableActions>
) {
  return <SemanticTableActions {...props} />;
}

export function PlatformOpsTablePagination(
  props: ComponentProps<typeof SemanticTablePagination>
) {
  return <SemanticTablePagination {...props} />;
}

export function PlatformOpsTableEmpty(
  props: ComponentProps<typeof SemanticTableEmptyState>
) {
  return <SemanticTableEmptyState {...props} />;
}

export function PlatformOpsTableLoading(
  props: ComponentProps<typeof SemanticTableLoadingState>
) {
  return <SemanticTableLoadingState {...props} />;
}

export function PlatformOpsTableError(
  props: ComponentProps<typeof SemanticTableErrorState>
) {
  return <SemanticTableErrorState {...props} />;
}

export function PlatformOpsTableSkeleton(
  props: ComponentProps<typeof SemanticTableSkeleton>
) {
  return <SemanticTableSkeleton {...props} />;
}

export function PlatformOpsTableStatusCell(
  props: ComponentProps<typeof SemanticTableStatusCell>
) {
  return <SemanticTableStatusCell {...props} />;
}

/** Convenience: scroll table with sticky ops header. */
export function PlatformOpsDataTable({
  children,
  className,
  empty,
  loading,
  error,
}: {
  children: ReactNode;
  className?: string;
  empty?: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
}) {
  if (error) return <>{error}</>;
  if (loading) return <>{loading}</>;
  if (empty) return <>{empty}</>;
  return (
    <PlatformOpsTable className={className}>
      <PlatformOpsTableScroll>{children}</PlatformOpsTableScroll>
    </PlatformOpsTable>
  );
}
