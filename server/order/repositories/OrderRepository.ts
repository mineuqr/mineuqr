import type { Order } from "../domain/aggregate/Order";

export type SaveOrderResult = {
  order: Order;
};

export interface OrderRepository {
  findById(id: number): Promise<Order | null>;
  save(order: Order, expectedUpdatedAt?: string): Promise<SaveOrderResult>;
}
