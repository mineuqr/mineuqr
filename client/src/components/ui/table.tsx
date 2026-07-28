/**
 * TABLE-PLATFORM-ADOPTION-1
 * Backward-compat aliases — prefer @/design-system/semantic-table for new code.
 */
import * as React from "react";

import { cn } from "@/lib/utils";
import {
  SemanticTableRoot,
  SemanticTableHeader,
  SemanticTableBody,
  SemanticTableRow,
  SemanticTableHead,
  SemanticTableCell,
} from "@/design-system/semantic-table";

const Table = SemanticTableRoot;
const TableHeader = SemanticTableHeader;
const TableBody = SemanticTableBody;
const TableRow = SemanticTableRow;
const TableHead = SemanticTableHead;
const TableCell = SemanticTableCell;

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-muted/50 border-t font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  );
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("text-muted-foreground mt-4 text-sm", className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
