/**
 * THERMAL-PRINTING-13B — ESC/POS byte constants (shared single source of truth).
 */

/** Legacy V1 separator width — preserved for production byte compatibility. */
export const DEFAULT_SEPARATOR_LENGTH = 32;

export const ESC_POS_BYTES = {
  ESC: 0x1b,
  GS: 0x1d,
  LF: 0x0a,
  INIT: 0x40,
  ALIGN: 0x61,
  FEED: 0x64,
  CUT: 0x56,
  EMPHASIZE_ON: 0x45,
  EMPHASIZE_OFF: 0x46,
  CHAR_SIZE: 0x21,
} as const;

export const ESC_POS_EMPHASIZE = {
  on: 0x01,
  off: 0x00,
} as const;

export function resolveEscPosCharacterSizeMask(style?: {
  doubleWidth?: boolean;
  doubleHeight?: boolean;
}): number {
  let mask = 0x00;
  if (style?.doubleHeight) {
    mask |= 0x01;
  }
  if (style?.doubleWidth) {
    mask |= 0x10;
  }
  return mask;
}

export const ESC_POS_ALIGN_VALUE = {
  left: 0x00,
  center: 0x01,
  right: 0x02,
} as const;

export const ESC_POS_CUT_PARTIAL = 0x00;
