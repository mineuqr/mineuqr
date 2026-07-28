/**
 * TABLE-PLATFORM-ADOPTION-1
 * Official MineuQR Table Platform — public barrel.
 */
export {
  SEMANTIC_TABLE,
  semanticTableClass,
  semanticTableHeadClass,
  semanticTableCellClass,
  semanticTableRowClass,
  semanticTableScrollClass,
  type SemanticTableResponsive,
  type SemanticTableDensity,
} from "./tokens/tableSurface";

export {
  SemanticTable,
  SemanticTableToolbar,
  SemanticTableFilters,
  SemanticTableDesktop,
  SemanticTableMobile,
  SemanticTableScroll,
  SemanticTableRoot,
  SemanticTableHeader,
  SemanticTableBody,
  SemanticTableRow,
  SemanticTableHead,
  SemanticTableCell,
  SemanticTableActions,
  SemanticTablePagination,
  SemanticTableFrame,
} from "./components/SemanticTable";

export {
  SemanticTableEmptyState,
  SemanticTableLoadingState,
  SemanticTableErrorState,
  SemanticTableSkeleton,
  SemanticTableStatusCell,
} from "./components/SemanticTableStates";
