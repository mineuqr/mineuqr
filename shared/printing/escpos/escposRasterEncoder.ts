/**
 * THERMAL-PRINTING-13D.4 — ESC/POS raster encoder (GS v 0).
 */
import { ESC_POS_BYTES } from "../escpos/escposConstants";
import { bytesPerRow, type MonochromeBitmap } from "../arabic/monochromeBitmap";

const GS_V0_MODE_NORMAL = 0x00;

export function encodeMonochromeBitmapToGsV0(bitmap: MonochromeBitmap): Uint8Array {
  const rowBytes = bytesPerRow(bitmap.width);
  const header = [
    ESC_POS_BYTES.GS,
    0x76,
    0x30,
    GS_V0_MODE_NORMAL,
    rowBytes & 0xff,
    (rowBytes >> 8) & 0xff,
    bitmap.height & 0xff,
    (bitmap.height >> 8) & 0xff,
  ];

  const output = new Uint8Array(header.length + bitmap.data.length);
  output.set(header, 0);
  output.set(bitmap.data, header.length);
  return output;
}

export function bitmapContainsInk(bitmap: MonochromeBitmap): boolean {
  return bitmap.data.some((byte) => byte !== 0);
}
