/** Load Cairo font bytes for PDF Arabic/Latin rendering. */

export async function loadExportFontBytes(): Promise<ArrayBuffer | null> {
  // Browser / Vite public
  try {
    const res = await fetch("/fonts/Cairo-Variable.ttf");
    if (res.ok) return await res.arrayBuffer();
  } catch {
    /* continue */
  }

  // Node / vitest
  try {
    const { readFileSync, existsSync } = await import("node:fs");
    const { join } = await import("node:path");
    const candidates = [
      join(process.cwd(), "client/public/fonts/Cairo-Variable.ttf"),
      join(process.cwd(), "server/assets/Cairo-Variable.ttf"),
    ];
    for (const path of candidates) {
      if (!existsSync(path)) continue;
      const buf = readFileSync(path);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
  } catch {
    /* ignore */
  }
  return null;
}
