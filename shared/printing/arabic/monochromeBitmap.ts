/**
 * THERMAL-PRINTING-13D.3 — monochrome bitmap model.
 */
export type MonochromeBitmap = {
  width: number;
  height: number;
  /** Row-major 1bpp packed data (MSB = leftmost pixel). */
  data: Uint8Array;
};

export function bytesPerRow(width: number): number {
  return Math.ceil(width / 8);
}

export function createMonochromeBitmap(width: number, height: number): MonochromeBitmap {
  return {
    width,
    height,
    data: new Uint8Array(bytesPerRow(width) * height),
  };
}

export function setMonochromePixel(bitmap: MonochromeBitmap, x: number, y: number): void {
  if (x < 0 || y < 0 || x >= bitmap.width || y >= bitmap.height) {
    return;
  }
  const rowBytes = bytesPerRow(bitmap.width);
  const byteIndex = y * rowBytes + Math.floor(x / 8);
  const bitIndex = 7 - (x % 8);
  bitmap.data[byteIndex] |= 1 << bitIndex;
}

export type RasterImageData = {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array;
};

export function rasterImageDataToMonochrome(
  imageData: RasterImageData,
  width: number,
  height: number
): MonochromeBitmap {
  const bitmap = createMonochromeBitmap(width, height);
  const { data } = imageData;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3] ?? 0;
      const luminance =
        0.299 * (data[index] ?? 0) +
        0.587 * (data[index + 1] ?? 0) +
        0.114 * (data[index + 2] ?? 0);
      if (alpha > 64 && luminance < 200) {
        setMonochromePixel(bitmap, x, y);
      }
    }
  }

  return bitmap;
}
