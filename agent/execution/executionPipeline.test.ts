import { describe, expect, it } from "vitest";
import { ExecutionPipeline, ExecutionPipelineError } from "./executionPipeline";
import { LocalJobStateError } from "./stateMachine";

function sampleJob(jobId = 100) {
  return {
    jobId,
    restaurantId: 1,
    printerId: 10,
    orderId: 500,
    ticket: {
      orderId: 500,
      restaurantId: 1,
      items: [{ itemName: "Burger", quantity: 1 }],
    },
  };
}

describe("executionPipeline THERMAL-PRINTING-6D Phase-2", () => {
  it("runs received → validated → prepared", () => {
    const pipeline = new ExecutionPipeline({
      now: () => new Date("2026-06-18T10:00:00.000Z"),
    });

    const received = pipeline.receive(sampleJob());
    expect(received.state).toBe("received");

    const validated = pipeline.validate(100);
    expect(validated.state).toBe("validated");

    const prepared = pipeline.prepare(100);
    expect(prepared.state).toBe("prepared");
    expect(prepared.prepareContext?.ticketItemCount).toBe(1);
  });

  it("rejects invalid state transitions", () => {
    const pipeline = new ExecutionPipeline();
    pipeline.receive(sampleJob());

    expect(() => pipeline.prepare(100)).toThrow(LocalJobStateError);
  });

  it("does not print or interact with printers", () => {
    const pipeline = new ExecutionPipeline();
    const prepared = pipeline.runThroughPrepare(sampleJob());
    expect(prepared.state).toBe("prepared");
    expect(prepared.prepareContext?.printerId).toBe(10);
  });

  it("tracks acknowledged state separately from preparation", () => {
    const pipeline = new ExecutionPipeline();
    pipeline.runThroughPrepare(sampleJob());
    const acknowledged = pipeline.markAcknowledged(100);
    expect(acknowledged.state).toBe("acknowledged");
  });

  it("rejects missing local jobs", () => {
    const pipeline = new ExecutionPipeline();
    expect(() => pipeline.validate(999)).toThrow(ExecutionPipelineError);
  });
});
