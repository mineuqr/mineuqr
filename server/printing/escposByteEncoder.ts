/**
 * THERMAL-PRINTING-4C / 13B — re-exports shared ESC/POS encoder (backward compatibility).
 */
export {
  EscPosByteBuilder,
  EscPosEncodingError,
  encodeEscPosCommands,
  encodeEscPosDocument,
} from "../../shared/printing/escpos/escposDocumentRenderer";
