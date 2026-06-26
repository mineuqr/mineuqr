/**
 * PRINTING-RENDERING-1B — TicketLayoutPlan → Arabic raster ESC/POS bridge.
 */
import { renderRenderableReceiptToBitmap } from "../../arabic/receiptBitmapRenderer";
import { processReceiptLine } from "../../arabic/arabicTextEngine";
import type { RenderableReceipt, RenderableReceiptLine } from "../../arabic/arabicTextEngine";
import { resolveReceiptRasterWidthPx } from "../../arabic/receiptBitmapConstants";
import { receiptBitmapToEscPosDocument } from "../../escpos/receiptRasterEscPosRenderer";
import type { EscPosDocument } from "../../escpos/escposTypes";
import type { TicketLayoutPlan } from "./ticketLayoutTypes";

function ticketLineToRenderableLine(
  plan: TicketLayoutPlan,
  line: TicketLayoutPlan["lines"][number]
): RenderableReceiptLine {
  return processReceiptLine({
    text: line.text,
    alignment: line.alignment,
    textDirection: line.textDirection,
    isSeparator: line.isSeparator,
    locale: plan.document.locale,
  });
}

export function ticketLayoutPlanToRenderableReceipt(plan: TicketLayoutPlan): RenderableReceipt {
  return {
    locale: plan.document.locale,
    lines: plan.lines.map((line) => ticketLineToRenderableLine(plan, line)),
    feedLines: plan.feedLines,
    cut: plan.cut,
  };
}

export function ticketLayoutPlanToArabicRasterEscPosDocument(plan: TicketLayoutPlan): EscPosDocument {
  const renderable = ticketLayoutPlanToRenderableReceipt(plan);
  const widthPx = resolveReceiptRasterWidthPx(plan.document.renderHints?.paperWidthMm);
  const bitmap = renderRenderableReceiptToBitmap(renderable, { widthPx });
  return receiptBitmapToEscPosDocument(bitmap, {
    feedLines: plan.feedLines,
    cut: plan.cut,
  });
}
