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
} as const;

export const ESC_POS_ALIGN_VALUE = {
  left: 0x00,
  center: 0x01,
  right: 0x02,
} as const;

export const ESC_POS_CUT_PARTIAL = 0x00;
