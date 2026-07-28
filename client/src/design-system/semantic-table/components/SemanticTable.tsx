/**
 * TABLE-PLATFORM-ADOPTION-1
 * Canonical table presentation components.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  SEMANTIC_TABLE,
  semanticTableCellClass,
  semanticTableClass,
  semanticTableHeadClass,
  semanticTableRowClass,
  type SemanticTableDensity,
  type SemanticTableResponsive,
} from "../tokens/tableSurface";

type DensityProps = { density?: SemanticTableDensity };

export function SemanticTable({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table"
      className={cn(SEMANTIC_TABLE.root, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SemanticTableToolbar({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table-toolbar"
      role="search"
      className={cn(SEMANTIC_TABLE.toolbar, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SemanticTableFilters({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table-filters"
      className={cn(SEMANTIC_TABLE.filters, className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Desktop pane — dual responsive */
export function SemanticTableDesktop({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table-desktop"
      className={cn(SEMANTIC_TABLE.desktop, className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Mobile pane — dual responsive (feature supplies list/cards) */
export function SemanticTableMobile({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table-mobile"
      className={cn(SEMANTIC_TABLE.mobile, className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Scroll frame — scroll responsive / ledger */
export function SemanticTableScroll({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table-scroll"
      className={cn(SEMANTIC_TABLE.scroll, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SemanticTableRoot({
  density = "ops",
  className,
  ...props
}: React.ComponentProps<"table"> & DensityProps) {
  return (
    <table
      data-slot="semantic-table-root"
      data-density={density}
      className={cn(semanticTableClass(density), className)}
      {...props}
    />
  );
}

export function SemanticTableHeader({
  density = "ops",
  className,
  ...props
}: React.ComponentProps<"thead"> & DensityProps) {
  return (
    <thead
      data-slot="semantic-table-header"
      className={cn(
        density === "ledger" && SEMANTIC_TABLE.ledgerHead,
        density === "comfortable" && SEMANTIC_TABLE.comfortableHead,
        className
      )}
      {...props}
    />
  );
}

export function SemanticTableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody data-slot="semantic-table-body" className={className} {...props} />
  );
}

export function SemanticTableRow({
  density = "ops",
  className,
  ...props
}: React.ComponentProps<"tr"> & DensityProps) {
  return (
    <tr
      data-slot="semantic-table-row"
      className={cn(semanticTableRowClass(density), className)}
      {...props}
    />
  );
}

export function SemanticTableHead({
  density = "ops",
  className,
  ...props
}: React.ComponentProps<"th"> & DensityProps) {
  return (
    <th
      scope="col"
      data-slot="semantic-table-head"
      className={cn(semanticTableHeadClass(density), className)}
      {...props}
    />
  );
}

export function SemanticTableCell({
  density = "ops",
  truncate = false,
  actions = false,
  className,
  ...props
}: React.ComponentProps<"td"> &
  DensityProps & { truncate?: boolean; actions?: boolean }) {
  return (
    <td
      data-slot="semantic-table-cell"
      className={cn(
        actions ? SEMANTIC_TABLE.opsActions : semanticTableCellClass(density),
        truncate && SEMANTIC_TABLE.opsTruncate,
        className
      )}
      {...props}
    />
  );
}

export function SemanticTableActions({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table-actions"
      className={cn(SEMANTIC_TABLE.actions, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function SemanticTablePagination({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="semantic-table-pagination"
      className={cn(SEMANTIC_TABLE.pagination, className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Convenience: dual layout shell */
export function SemanticTableFrame({
  responsive = "dual",
  desktop,
  mobile,
  className,
}: {
  responsive?: SemanticTableResponsive;
  desktop: React.ReactNode;
  mobile?: React.ReactNode;
  className?: string;
}) {
  if (responsive === "scroll") {
    return (
      <SemanticTable className={className}>
        <SemanticTableScroll>{desktop}</SemanticTableScroll>
      </SemanticTable>
    );
  }
  return (
    <SemanticTable className={className}>
      <SemanticTableDesktop>{desktop}</SemanticTableDesktop>
      {mobile ? <SemanticTableMobile>{mobile}</SemanticTableMobile> : null}
    </SemanticTable>
  );
}
