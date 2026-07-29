/**
 * COMMERCIAL-CATALOG-ADMIN-EXPERIENCE-1 — pure version comparison helpers.
 */

export type DiffKind = "added" | "removed" | "modified" | "unchanged";

export type FieldDiff = {
  field: string;
  kind: DiffKind;
  left: string;
  right: string;
};

function str(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function diffScalar(
  field: string,
  left: unknown,
  right: unknown
): FieldDiff {
  const l = str(left);
  const r = str(right);
  if (l === r) return { field, kind: "unchanged", left: l, right: r };
  if (l === "—" && r !== "—") return { field, kind: "added", left: l, right: r };
  if (l !== "—" && r === "—") return { field, kind: "removed", left: l, right: r };
  return { field, kind: "modified", left: l, right: r };
}

export function diffFeatureSets(
  leftKeys: string[],
  rightKeys: string[]
): FieldDiff[] {
  const L = new Set(leftKeys);
  const R = new Set(rightKeys);
  const all = [...new Set([...leftKeys, ...rightKeys])].sort();
  return all.map((key) => {
    const inL = L.has(key);
    const inR = R.has(key);
    if (inL && inR) return { field: key, kind: "unchanged" as const, left: "on", right: "on" };
    if (!inL && inR) return { field: key, kind: "added" as const, left: "off", right: "on" };
    if (inL && !inR) return { field: key, kind: "removed" as const, left: "on", right: "off" };
    return { field: key, kind: "unchanged" as const, left: "off", right: "off" };
  });
}

export function diffLimitMaps(
  left: Record<string, number | null>,
  right: Record<string, number | null>
): FieldDiff[] {
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.map((k) => diffScalar(k, left[k], right[k]));
}

export type VersionCompareInput = {
  leftLabel: string;
  rightLabel: string;
  leftReady: boolean;
  rightReady: boolean;
  pricing: FieldDiff[];
  billing: FieldDiff[];
  features: FieldDiff[];
  limits: FieldDiff[];
  trial: FieldDiff[];
  regional: FieldDiff[];
  promotions: FieldDiff[];
  migration: FieldDiff[];
  retirement: FieldDiff[];
};

export function summarizeDiffs(diffs: FieldDiff[]) {
  return {
    added: diffs.filter((d) => d.kind === "added").length,
    removed: diffs.filter((d) => d.kind === "removed").length,
    modified: diffs.filter((d) => d.kind === "modified").length,
  };
}
