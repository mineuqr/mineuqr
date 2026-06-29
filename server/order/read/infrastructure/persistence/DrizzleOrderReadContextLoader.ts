import { eq } from "drizzle-orm";
import { getDb, getOrderById, getOrderItemsByOrderId } from "../../../../db";
import { orders, restaurants } from "../../../../../drizzle/schema";
import type {
  OrderReadContextLoader,
  OrderReadSourceContext,
} from "./OrderReadContextLoader";

export class DrizzleOrderReadContextLoader implements OrderReadContextLoader {
  async loadByOrderId(orderId: number): Promise<OrderReadSourceContext | null> {
    const order = await getOrderById(orderId);
    if (!order) return null;

    const lineItems = await getOrderItemsByOrderId(orderId);
    const db = await getDb();
    if (!db) return null;

    const [restaurant] = await db
      .select({ slug: restaurants.slug })
      .from(restaurants)
      .where(eq(restaurants.id, order.restaurantId))
      .limit(1);

    if (!restaurant?.slug) return null;

    return { order, lineItems, restaurantSlug: restaurant.slug };
  }

  async listOrderIdsForRestaurant(restaurantId: number): Promise<number[]> {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.restaurantId, restaurantId));
    return rows.map((r) => r.id);
  }

  async listRestaurantIds(): Promise<number[]> {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select({ id: restaurants.id }).from(restaurants);
    return rows.map((r) => r.id);
  }
}
