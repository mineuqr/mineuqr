/**
 * SEMANTIC-CARD-DESIGN-SYSTEM-1
 * Value typography tokens for KPI / executive / summary cards.
 */
export const SEMANTIC_VALUE = {
  operational: "text-white",
  revenue:
    "bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 bg-clip-text text-transparent",
  revenuePrimary:
    "bg-gradient-to-b from-amber-300 via-orange-400 to-orange-500 bg-clip-text text-transparent text-2xl sm:text-3xl lg:text-4xl font-bold tabular-nums",
} as const;

export type SemanticValueVariant = "operational" | "revenue";
