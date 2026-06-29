import { describe, expect, it } from "vitest";
import { createOrderEventDispatchDelegate } from "../readComposition";
import { orderEventConsumerRegistry } from "../../consumerComposition";
import { CompositeEventDispatchDelegate } from "../infrastructure/registry/CompositeEventDispatchDelegate";
import { ENV } from "../../../_core/env";

describe("readComposition", () => {
  it("defaults to integration-only dispatch when projections disabled", () => {
    const previous = ENV.orderReadProjectionsEnabled;
    ENV.orderReadProjectionsEnabled = false;
    try {
      const delegate = createOrderEventDispatchDelegate();
      expect(delegate).toBe(orderEventConsumerRegistry);
    } finally {
      ENV.orderReadProjectionsEnabled = previous;
    }
  });

  it("returns composite delegate when projections flag enabled", () => {
    const previous = ENV.orderReadProjectionsEnabled;
    ENV.orderReadProjectionsEnabled = true;
    try {
      const delegate = createOrderEventDispatchDelegate();
      expect(delegate).toBeInstanceOf(CompositeEventDispatchDelegate);
    } finally {
      ENV.orderReadProjectionsEnabled = previous;
    }
  });
});
