/**
 * THERMAL-PRINTING-13D.3 — receipt render plan → monochrome bitmap.
 */
import { createCanvas } from "@napi-rs/canvas";
import type { RenderableReceipt, RenderableReceiptLine } from "./arabicTextEngine";
import { rasterImageDataToMonochrome, type MonochromeBitmap } from "./monochromeBitmap";
import {
  RECEIPT_RASTER_FONT_SIZE_PX,
  RECEIPT_RASTER_LINE_HEIGHT_PX,
  RECEIPT_RASTER_PADDING_X_PX,
  RECEIPT_RASTER_PADDING_Y_PX,
} from "./receiptBitmapConstants";
import { ensureReceiptFontRegistered } from "./receiptFont";

export type ReceiptBitmapRenderOptions = {
  widthPx: number;
};

function resolveLineX(
  line: RenderableReceiptLine,
  textWidth: number,
  widthPx: number
): number {
  switch (line.alignment) {
    case "center":
      return Math.max(RECEIPT_RASTER_PADDING_X_PX, (widthPx - textWidth) / 2);
    case "right":
      return Math.max(RECEIPT_RASTER_PADDING_X_PX, widthPx - RECEIPT_RASTER_PADDING_X_PX - textWidth);
    case "left":
    default:
      return RECEIPT_RASTER_PADDING_X_PX;
  }
}

function estimateReceiptHeight(lineCount: number): number {
  return RECEIPT_RASTER_PADDING_Y_PX * 2 + lineCount * RECEIPT_RASTER_LINE_HEIGHT_PX;
}

export function renderRenderableReceiptToBitmap(
  receipt: RenderableReceipt,
  options: ReceiptBitmapRenderOptions
): MonochromeBitmap {
  const fontFamily = ensureReceiptFontRegistered();
  const widthPx = options.widthPx;
  const heightPx = estimateReceiptHeight(receipt.lines.length);
  const canvas = createCanvas(widthPx, heightPx);
  const context = canvas.getContext("2d");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, widthPx, heightPx);
  context.fillStyle = "#000000";
  context.font = `${RECEIPT_RASTER_FONT_SIZE_PX}px "${fontFamily}"`;
  context.textBaseline = "top";

  let y = RECEIPT_RASTER_PADDING_Y_PX;
  for (const line of receipt.lines) {
    if (line.isSeparator) {
      const separatorY = y + Math.floor(RECEIPT_RASTER_LINE_HEIGHT_PX / 2);
      context.fillRect(
        RECEIPT_RASTER_PADDING_X_PX,
        separatorY,
        widthPx - RECEIPT_RASTER_PADDING_X_PX * 2,
        1
      );
      y += RECEIPT_RASTER_LINE_HEIGHT_PX;
      continue;
    }

    const textWidth = context.measureText(line.visualText).width;
    const x = resolveLineX(line, textWidth, widthPx);
    context.fillText(line.visualText, x, y);
    y += RECEIPT_RASTER_LINE_HEIGHT_PX;
  }

  const imageData = context.getImageData(0, 0, widthPx, heightPx);
  return rasterImageDataToMonochrome(imageData, widthPx, heightPx);
}
