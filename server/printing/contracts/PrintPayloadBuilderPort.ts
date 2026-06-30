import type { PrintPayload, PrintPayloadTrigger } from "../domain/PrintPayload";

export type BuildPrintPayloadInput = {
  restaurantId: number;
  orderId: number;
  trigger: PrintPayloadTrigger;
  requestedAt?: string;
};

export interface PrintPayloadBuilderPort {
  build(input: BuildPrintPayloadInput): Promise<PrintPayload | null>;
}
