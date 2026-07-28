/**
 * SEMANTIC-DETAIL-SHEET-PLATFORM-1
 * Official MineuQR Semantic Detail Sheet Platform — public barrel.
 *
 * Read-oriented Sheet chrome only. Features own content and workflows.
 */
export {
  SemanticDetailSheet,
  type SemanticDetailSheetProps,
} from "./components/SemanticDetailSheet";

export {
  SemanticDetailHeader,
  SemanticDetailFooter,
  SemanticDetailLoading,
  SemanticDetailEmpty,
  SemanticDetailError,
} from "./components/SemanticDetailChrome";

export { SemanticDetailFact } from "./components/SemanticDetailFact";

export {
  SemanticDetailSection,
  SemanticDetailGroup,
  SemanticDetailDivider,
} from "./components/SemanticDetailSection";

export {
  SEMANTIC_DETAIL_SHEET_SIZE_CLASS,
  type SemanticDetailSheetSize,
} from "./tokens/size";
