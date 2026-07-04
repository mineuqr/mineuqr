import { KITCHEN_ORDERING_POLICY_FIFO } from "../../contracts/kitchenQueryContracts";
import type { KitchenTicketDto } from "../../contracts/kitchenQueryContracts";
import type { QueueOrderingContext, QueueOrderingPolicy } from "./QueueOrderingPolicy";

export class FifoByCreatedAtPolicy implements QueueOrderingPolicy {
  readonly policyId = KITCHEN_ORDERING_POLICY_FIFO;

  sort(tickets: KitchenTicketDto[], _context: QueueOrderingContext): KitchenTicketDto[] {
    return [...tickets].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export const fifoByCreatedAtPolicy = new FifoByCreatedAtPolicy();
