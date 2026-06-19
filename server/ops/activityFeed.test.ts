import { describe, expect, it } from "vitest";
import { TABLE_EVENT_TYPES } from "../diningSession/sessionTypes";
import {
  ACTIVITY_FEED_TABLE_EVENT_TYPES,
  buildTableEventFeedCopy,
  mapOrderStatusRowToFeedEvent,
  mapTableEventRowToFeedEvent,
  mapTableEventTypeToFeedType,
  mergeActivityFeedEvents,
  normalizeActivityFeedLimit,
  parseFeedTimestampMs,
  type ActivityFeedEvent,
} from "./activityFeed";
import { ACTIVITY_FEED_DEFAULT_LIMIT, ACTIVITY_FEED_MAX_LIMIT } from "./operationalConstants";

describe("activityFeed OPS-DASHBOARD-2E.1", () => {
  describe("parseFeedTimestampMs", () => {
    it("parses MySQL datetime strings", () => {
      expect(parseFeedTimestampMs("2026-06-18 21:30:00")).toBe(
        Date.parse("2026-06-18T21:30:00Z")
      );
    });
  });

  describe("mapTableEventTypeToFeedType", () => {
    it("maps all V1 table event types", () => {
      expect(mapTableEventTypeToFeedType(TABLE_EVENT_TYPES.SESSION_OPENED)).toBe(
        "session_opened"
      );
      expect(mapTableEventTypeToFeedType(TABLE_EVENT_TYPES.ORDER_CREATED)).toBe(
        "order_created"
      );
      expect(mapTableEventTypeToFeedType(TABLE_EVENT_TYPES.SESSION_PAID)).toBe(
        "session_paid"
      );
      expect(mapTableEventTypeToFeedType(TABLE_EVENT_TYPES.SESSION_COMPLIMENTARY)).toBe(
        "session_complimentary"
      );
      expect(mapTableEventTypeToFeedType(TABLE_EVENT_TYPES.SESSION_CLOSED)).toBe(
        "session_closed"
      );
    });

    it("returns null for unsupported event types", () => {
      expect(mapTableEventTypeToFeedType("UNKNOWN")).toBeNull();
    });

    it("covers ACTIVITY_FEED_TABLE_EVENT_TYPES exactly", () => {
      for (const eventType of ACTIVITY_FEED_TABLE_EVENT_TYPES) {
        expect(mapTableEventTypeToFeedType(eventType)).not.toBeNull();
      }
    });
  });

  describe("mapTableEventRowToFeedEvent", () => {
    it("normalizes SESSION_OPENED with table context", () => {
      const event = mapTableEventRowToFeedEvent({
        eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
        occurredAt: "2026-06-18 21:00:00",
        sessionId: 10,
        tableId: 1,
        tableNumber: 5,
        nameAr: null,
        nameEn: "Table 5",
        metadata: { source: "get_or_create" },
      });

      expect(event).toEqual({
        eventType: "session_opened",
        occurredAt: "2026-06-18 21:00:00",
        sessionId: "10",
        tableId: 1,
        tableName: "Table 5",
        title: "Session opened",
        subtitle: "Table 5",
      });
    });

    it("normalizes ORDER_CREATED with order metadata", () => {
      const event = mapTableEventRowToFeedEvent({
        eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
        occurredAt: "2026-06-18 21:05:00",
        sessionId: 10,
        tableId: 1,
        tableNumber: 5,
        nameAr: null,
        nameEn: "Table 5",
        metadata: { orderNumber: "ORD-42", totalAmount: "50.00" },
      });

      expect(event?.title).toBe("Order created");
      expect(event?.subtitle).toBe("#ORD-42 · Table 5");
    });
  });

  describe("mapOrderStatusRowToFeedEvent", () => {
    it("normalizes order status change rows", () => {
      const event = mapOrderStatusRowToFeedEvent({
        occurredAt: "2026-06-18 21:10:00",
        sessionId: 10,
        tableId: 1,
        tableNumber: 5,
        nameAr: null,
        nameEn: "Table 5",
        orderNumber: "ORD-42",
        status: "preparing",
      });

      expect(event).toEqual({
        eventType: "order_status_changed",
        occurredAt: "2026-06-18 21:10:00",
        sessionId: "10",
        tableId: 1,
        tableName: "Table 5",
        title: "Order status updated",
        subtitle: "#ORD-42 · preparing · Table 5",
      });
    });
  });

  describe("mergeActivityFeedEvents", () => {
    const events: ActivityFeedEvent[] = [
      {
        eventType: "session_opened",
        occurredAt: "2026-06-18 20:00:00",
        sessionId: "1",
        tableId: 1,
        tableName: "Table 1",
        title: "Session opened",
        subtitle: "Table 1",
      },
      {
        eventType: "order_created",
        occurredAt: "2026-06-18 21:00:00",
        sessionId: "1",
        tableId: 1,
        tableName: "Table 1",
        title: "Order created",
        subtitle: "#ORD-1 · Table 1",
      },
      {
        eventType: "order_status_changed",
        occurredAt: "2026-06-18 21:30:00",
        sessionId: "1",
        tableId: 1,
        tableName: "Table 1",
        title: "Order status updated",
        subtitle: "#ORD-1 · ready · Table 1",
      },
    ];

    it("sorts DESC by occurredAt", () => {
      const shuffled = [events[0]!, events[2]!, events[1]!];
      const merged = mergeActivityFeedEvents(shuffled, 25);

      expect(merged.map((event) => event.occurredAt)).toEqual([
        "2026-06-18 21:30:00",
        "2026-06-18 21:00:00",
        "2026-06-18 20:00:00",
      ]);
    });

    it("applies limit after merge", () => {
      const merged = mergeActivityFeedEvents(events, 2);
      expect(merged).toHaveLength(2);
      expect(merged[0]?.eventType).toBe("order_status_changed");
      expect(merged[1]?.eventType).toBe("order_created");
    });

    it("caps limit at ACTIVITY_FEED_MAX_LIMIT", () => {
      const many = Array.from({ length: ACTIVITY_FEED_MAX_LIMIT + 5 }, (_, index) => ({
        eventType: "session_opened" as const,
        occurredAt: `2026-06-18 ${String(index).padStart(2, "0")}:00:00`,
        sessionId: String(index),
        tableId: 1,
        tableName: "Table 1",
        title: "Session opened",
        subtitle: "Table 1",
      }));

      expect(mergeActivityFeedEvents(many, ACTIVITY_FEED_MAX_LIMIT + 10)).toHaveLength(
        ACTIVITY_FEED_MAX_LIMIT
      );
    });
  });

  describe("normalizeActivityFeedLimit", () => {
    it("defaults to ACTIVITY_FEED_DEFAULT_LIMIT", () => {
      expect(normalizeActivityFeedLimit()).toBe(ACTIVITY_FEED_DEFAULT_LIMIT);
      expect(normalizeActivityFeedLimit(undefined)).toBe(ACTIVITY_FEED_DEFAULT_LIMIT);
    });

    it("clamps invalid and oversized values", () => {
      expect(normalizeActivityFeedLimit(0)).toBe(ACTIVITY_FEED_DEFAULT_LIMIT);
      expect(normalizeActivityFeedLimit(500)).toBe(ACTIVITY_FEED_MAX_LIMIT);
    });
  });

  describe("buildTableEventFeedCopy", () => {
    it("uses table name for lifecycle events", () => {
      expect(buildTableEventFeedCopy("session_paid", "Table 3", {})).toEqual({
        title: "Session paid",
        subtitle: "Table 3",
      });
    });
  });
});
