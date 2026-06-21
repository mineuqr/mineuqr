import { describe, expect, it } from "vitest";
import { buildEscPosPayloadFromAgentTicket } from "../../shared/printing/escposPayloadBuilder";
import { executeExecutionPlan } from "../../shared/printing/executeExecutionPlan";
import { createExecutionExecutorRegistry } from "../../shared/printing/executionExecutorRegistry";
import type { ExecutionExecutionResult, ExecutionExecutorInput, ExecutionResult } from "../../shared/printing/executionExecutor";
import { createRawEscPosExecutor } from "./executors/rawEscPosExecutor";
import {
  createServerExecutorRegistry,
  getServerExecutorRegistry,
  resetServerExecutorRegistryForTests,
} from "./executors/executorRegistry";
import { executeExecutionPlan as executeServerExecutionPlan } from "./executeExecutionPlan";

const sampleJob = {
  jobId: 100,
  restaurantId: 7,
  printerId: 10,
  orderId: 500,
  ticket: {
    orderId: 500,
    restaurantId: 7,
    items: [{ itemName: "Burger", quantity: 2, notes: "No onions" }],
  },
};

const resolvedPlan = {
  platform: "windows" as const,
  contextBuilt: true,
  strategyResolved: true,
  method: "raw-escpos" as const,
};

function buildInput(
  overrides: Partial<ExecutionExecutorInput> = {}
): ExecutionExecutorInput {
  return {
    executionPlan: resolvedPlan,
    job: sampleJob,
    ...overrides,
  };
}

describe("executionExecutor THERMAL-PRINTING-10A / 10B", () => {
  it("A — ExecutionResult is authoritative and legacy alias remains compatible", () => {
    const current: ExecutionResult = {
      status: "completed",
      method: "raw-escpos",
    };
    const legacy: ExecutionExecutionResult = current;
    expect(legacy.status).toBe("completed");
  });

  it("A2 — executor registry lookup returns raw-escpos and lists unsupported methods", () => {
    resetServerExecutorRegistryForTests();
    const registry = getServerExecutorRegistry();

    expect(registry.listSupported()).toEqual(["raw-escpos"]);
    expect(registry.listNotImplemented()).toEqual([
      "spooler",
      "airprint",
      "vendor-sdk",
      "bridge-agent",
    ]);
    expect(registry.get("raw-escpos")?.method).toBe("raw-escpos");
    expect(registry.get("airprint")?.execute(buildInput({
      executionPlan: { ...resolvedPlan, method: "airprint" },
    })).status).toBe("not-implemented");
  });

  it("B — executeExecutionPlan dispatches by executionPlan.method", () => {
    const registry = createServerExecutorRegistry();
    const result = executeExecutionPlan(buildInput(), registry);

    expect(result.status).toBe("completed");
    expect(result.method).toBe("raw-escpos");
    expect(result.artifact?.kind).toBe("escpos-bytes");
  });

  it("C — raw-escpos executor is selected for resolved raw-escpos plans", () => {
    const result = executeServerExecutionPlan(buildInput());
    expect(result.method).toBe("raw-escpos");
    expect(result.status).toBe("completed");
  });

  it("D — ESC/POS payload generation produces deterministic bytes", () => {
    const first = buildEscPosPayloadFromAgentTicket({
      ticket: sampleJob.ticket,
      createdAt: new Date("2026-06-18T10:00:00.000Z"),
    });
    const second = buildEscPosPayloadFromAgentTicket({
      ticket: sampleJob.ticket,
      createdAt: new Date("2026-06-18T10:00:00.000Z"),
    });

    expect(first.byteLength).toBeGreaterThan(0);
    expect(Array.from(first.bytes)).toEqual(Array.from(second.bytes));
    expect(Array.from(first.bytes).slice(0, 3)).toEqual([0x1b, 0x40, 0x1b]);
  });

  it("I — unsupported executor rejection returns not-implemented", () => {
    const result = executeServerExecutionPlan(
      buildInput({
        executionPlan: {
          ...resolvedPlan,
          method: "vendor-sdk",
        },
      })
    );

    expect(result.status).toBe("not-implemented");
    expect(result.method).toBe("vendor-sdk");
  });

  it("J — rejects unresolved plans without re-evaluating strategy", () => {
    const registry = createExecutionExecutorRegistry([createRawEscPosExecutor()]);
    const result = executeExecutionPlan(
      buildInput({
        executionPlan: {
          platform: "windows",
          contextBuilt: true,
          strategyResolved: false,
          message: "capability-rejected",
        },
      }),
      registry
    );

    expect(result.status).toBe("rejected");
    expect(result.message).toBe("capability-rejected");
  });

  it("K — raw-escpos executor performs no device I/O", () => {
    const executor = createRawEscPosExecutor();
    const result = executor.execute(buildInput());

    expect(result.status).toBe("completed");
    expect(result.artifact?.bytes).toBeInstanceOf(Uint8Array);
    expect(result.message).toBeUndefined();
  });

  it("L — payload generation remains deterministic across repeated execution", () => {
    const registry = createServerExecutorRegistry();
    const first = executeExecutionPlan(buildInput(), registry);
    const second = executeExecutionPlan(buildInput(), registry);

    expect(first.status).toBe("completed");
    expect(second.status).toBe("completed");
    expect(Array.from(first.artifact!.bytes)).toEqual(Array.from(second.artifact!.bytes));
  });
});
