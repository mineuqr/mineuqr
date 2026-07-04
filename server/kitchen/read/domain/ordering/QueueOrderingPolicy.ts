import type { KitchenTicketDto } from "../../contracts/kitchenQueryContracts";

export type QueueOrderingContext = {
  restaurantId: number;
  now: Date;
};

export type QueueOrderingPolicy = {
  readonly policyId: string;
  sort(tickets: KitchenTicketDto[], context: QueueOrderingContext): KitchenTicketDto[];
};
