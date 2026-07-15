/**
 * QR-PRESENTATION-BOOTSTRAP-FIX-1 — presentation integrity for MenuTemplates.
 * Guards against orphan lucide JSX identifiers (e.g. Clock after import cleanup).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const src = readFileSync(
  join(__dirname, "../MenuTemplates.tsx"),
  "utf8"
);

function lucideImports(source: string): Set<string> {
  const match = source.match(
    /from\s*["']lucide-react["']/
  );
  if (!match || match.index == null) return new Set();
  const before = source.slice(0, match.index);
  const braceStart = before.lastIndexOf("{");
  const braceEnd = before.lastIndexOf("}");
  if (braceStart < 0 || braceEnd < braceStart) return new Set();
  return new Set(
    before
      .slice(braceStart + 1, braceEnd)
      .split(",")
      .map((s) => s.trim())
      .filter((s) => /^[A-Z][A-Za-z0-9]*$/.test(s))
  );
}

/** Lucide icons referenced as JSX in TemplateHeader / templates (presentation). */
const TEMPLATE_LUCIDE_JSX = [
  "Store",
  "Phone",
  "MapPin",
  "ChevronUp",
  "ChevronDown",
  "Crown",
  "Star",
  "MessageCircle",
  "AlertTriangle",
  "Info",
  "Clock",
  "Calendar",
] as const;

describe("QR-PRESENTATION-BOOTSTRAP-FIX-1 MenuTemplates presentation integrity", () => {
  it("imports Clock and Calendar used by TemplateHeader", () => {
    const imported = lucideImports(src);
    expect(src).toContain("<Clock");
    expect(src).toContain("<Calendar");
    expect(imported.has("Clock")).toBe(true);
    expect(imported.has("Calendar")).toBe(true);
  });

  it("imports every lucide icon used in MenuTemplates JSX", () => {
    const imported = lucideImports(src);
    const missing = TEMPLATE_LUCIDE_JSX.filter((name) => {
      const used = src.includes(`<${name}`);
      return used && !imported.has(name);
    });
    expect(missing).toEqual([]);
  });
});
