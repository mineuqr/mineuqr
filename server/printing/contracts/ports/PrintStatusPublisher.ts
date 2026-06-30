import type { PrintOperationalEvent } from "../../domain/PrintOperationalEvent";

/**
 * Publishes operational print events (not Order domain events).
 */
export interface PrintStatusPublisher {
  publish(event: PrintOperationalEvent): Promise<void>;
}
