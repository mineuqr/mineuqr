/** Kitchen read failure codes surfaced to device runtime (operator-safe). */
export const KITCHEN_READ_DATABASE_UNAVAILABLE = "database_unavailable" as const;

export type KitchenReadErrorCode = typeof KITCHEN_READ_DATABASE_UNAVAILABLE;
