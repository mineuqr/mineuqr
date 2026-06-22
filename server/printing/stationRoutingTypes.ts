/**
 * THERMAL-PRINTING-12A — station routing domain types.
 */

export const STATION_ROUTING_REASONS = {
  STATION_PRINTER: "station-printer",
  DEFAULT_PRINTER: "default-printer",
  LEGACY_SINGLE_TARGET: "legacy-single-target",
} as const;

export type StationRoutingReason =
  (typeof STATION_ROUTING_REASONS)[keyof typeof STATION_ROUTING_REASONS];

export type StationPrintTarget = {
  stationId: number | null;
  stationName: string | null;
  printerId: number;
  orderItemIds: number[];
  idempotencyKey: string;
  selectionReason: StationRoutingReason;
};

export type SkippedStationPrintTarget = {
  stationId: number | null;
  stationName: string | null;
  orderItemIds: number[];
  reason: string;
};

export type ResolveStationPrintTargetsResult = {
  targets: StationPrintTarget[];
  skipped: SkippedStationPrintTarget[];
};

export class StationRoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StationRoutingError";
  }
}
