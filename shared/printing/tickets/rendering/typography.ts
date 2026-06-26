/**
 * PRINTING-RENDERING-1B — semantic typography (platform-neutral).
 *
 * Renderers interpret typography presets; business code must not emit raw ESC/POS.
 */
export const TEXT_TYPOGRAPHY = {
  NORMAL: "normal",
  EMPHASIS: "emphasis",
  IDENTITY: "identity",
  METADATA: "metadata",
  ITEM_QUANTITY: "item-quantity",
  ITEM_NAME: "item-name",
  MODIFIER: "modifier",
  NOTE: "note",
  TOTAL_LABEL: "total-label",
  TOTAL_AMOUNT: "total-amount",
} as const;

export type TextTypography = (typeof TEXT_TYPOGRAPHY)[keyof typeof TEXT_TYPOGRAPHY];

export type TextAlignment = "left" | "center" | "right";

export type SemanticTextStyle = {
  bold: boolean;
  doubleWidth: boolean;
  doubleHeight: boolean;
};

export const TYPOGRAPHY_STYLE_MAP: Record<TextTypography, SemanticTextStyle> = {
  [TEXT_TYPOGRAPHY.NORMAL]: { bold: false, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.EMPHASIS]: { bold: true, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.IDENTITY]: { bold: true, doubleWidth: true, doubleHeight: true },
  [TEXT_TYPOGRAPHY.METADATA]: { bold: false, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.ITEM_QUANTITY]: { bold: false, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.ITEM_NAME]: { bold: false, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.MODIFIER]: { bold: false, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.NOTE]: { bold: false, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.TOTAL_LABEL]: { bold: false, doubleWidth: false, doubleHeight: false },
  [TEXT_TYPOGRAPHY.TOTAL_AMOUNT]: { bold: true, doubleWidth: false, doubleHeight: false },
};

export function resolveSemanticTextStyle(typography: TextTypography): SemanticTextStyle {
  return TYPOGRAPHY_STYLE_MAP[typography];
}

export function formatOrderIdentityLine(orderNumber: string): string {
  const trimmed = orderNumber.trim();
  if (/^order\s*#/i.test(trimmed)) {
    return trimmed.toUpperCase().startsWith("ORDER") ? trimmed : `ORDER #${trimmed}`;
  }
  return `ORDER #${trimmed}`;
}
