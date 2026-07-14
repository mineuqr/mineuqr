/**
 * OPERATIONAL-FULFILMENT-PRESENTATION-1 — single presentation renderer for
 * projected fulfilment fields from Operational DTOs.
 *
 * Presentation formats DTO values only. It must not call Session, Runtime,
 * Business Identity, or projection resolution helpers.
 */

import type { LocalizedLabel } from "./orderPresentationModel";

export type ProjectedFulfilmentPresentationSource = Readonly<{
  fulfilmentLabel: string;
  fulfilmentAnchorType: string;
  serviceMode: string;
}>;

export type FormatProjectedFulfilmentOptions = Readonly<{
  isAr: boolean;
  /** Product table/room wording — only applies when anchorType === "table". */
  tableUnit?: "table" | "room";
}>;

function localizeTakeAway(label: string, isAr: boolean): string {
  if (!isAr) return label;
  if (label === "Take Away" || label === "Takeaway") return "سفري";
  return label;
}

/**
 * Display string for a projected fulfilment slice.
 * Table anchors get a localized Table/Room prefix; other anchors use the
 * projected label as stamped (with takeaway Arabic localization only).
 */
export function formatProjectedFulfilmentLabel(
  source: ProjectedFulfilmentPresentationSource,
  options: FormatProjectedFulfilmentOptions
): string {
  const label = source.fulfilmentLabel.trim();
  const anchor = source.fulfilmentAnchorType.trim();
  const mode = source.serviceMode.trim();
  const isAr = options.isAr;
  const tableUnit = options.tableUnit ?? "table";

  if (!label) {
    return "";
  }

  if (anchor === "table") {
    const enUnit = tableUnit === "room" ? "Room" : "Table";
    const arUnit = tableUnit === "room" ? "غرفة" : "طاولة";
    return isAr ? `${arUnit} ${label}` : `${enUnit} ${label}`;
  }

  if (mode === "take_away" || label === "Take Away" || label === "Takeaway") {
    return localizeTakeAway(label === "Takeaway" ? "Take Away" : label, isAr);
  }

  return label;
}

export function localizedProjectedFulfilmentLabel(
  source: ProjectedFulfilmentPresentationSource,
  tableUnit: "table" | "room" = "table"
): LocalizedLabel {
  return {
    en: formatProjectedFulfilmentLabel(source, { isAr: false, tableUnit }),
    ar: formatProjectedFulfilmentLabel(source, { isAr: true, tableUnit }),
  };
}

/** True when the Operational DTO carries a complete projected fulfilment slice. */
export function hasProjectedFulfilment(
  source: Partial<ProjectedFulfilmentPresentationSource> | null | undefined
): source is ProjectedFulfilmentPresentationSource {
  return Boolean(
    source?.fulfilmentLabel?.trim() &&
      source?.fulfilmentAnchorType?.trim() &&
      source?.serviceMode?.trim()
  );
}
