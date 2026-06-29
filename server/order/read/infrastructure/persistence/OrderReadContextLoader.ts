import type { SelectOrder, SelectOrderItem } from "../../../../../drizzle/schema";

export type OrderReadSourceContext = {
  order: SelectOrder;
  lineItems: SelectOrderItem[];
  restaurantSlug: string;
};

export interface OrderReadContextLoader {
  loadByOrderId(orderId: number): Promise<OrderReadSourceContext | null>;
  listOrderIdsForRestaurant(restaurantId: number): Promise<number[]>;
  listRestaurantIds(): Promise<number[]>;
}
