export type OrderPrintDispatchRequest = {
  orderId: number;
  restaurantId: number;
  eventType: string;
  eventId: string;
  orderNumber?: string | null;
};

export interface OrderPrintDispatchPort {
  dispatchPrintRequest(request: OrderPrintDispatchRequest): Promise<void>;
}

export class LogOrderPrintDispatchPort implements OrderPrintDispatchPort {
  constructor(
    private readonly log: (request: OrderPrintDispatchRequest) => void = () => undefined
  ) {}

  async dispatchPrintRequest(request: OrderPrintDispatchRequest): Promise<void> {
    this.log(request);
  }
}
