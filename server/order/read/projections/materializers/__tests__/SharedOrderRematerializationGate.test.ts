import { describe, expect, it } from "vitest";
import { SharedOrderRematerializationGate } from "../SharedOrderRematerializationGate";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("SharedOrderRematerializationGate", () => {
  it("runs shared work once for concurrent callers of the same eventId", async () => {
    const gate = new SharedOrderRematerializationGate();
    let executions = 0;

    await Promise.all(
      Array.from({ length: 4 }, () =>
        gate.run("evt-1", async () => {
          executions += 1;
          await delay(20);
        })
      )
    );

    expect(executions).toBe(1);
  });

  it("rejects every waiter when shared work fails", async () => {
    const gate = new SharedOrderRematerializationGate();
    const results = await Promise.allSettled(
      Array.from({ length: 4 }, () =>
        gate.run("evt-fail", async () => {
          await delay(10);
          throw new Error("persist failed");
        })
      )
    );

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(
      results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .every((r) => r.reason instanceof Error && r.reason.message === "persist failed")
    ).toBe(true);
  });

  it("runs again for the same eventId after a failure settles", async () => {
    const gate = new SharedOrderRematerializationGate();
    let executions = 0;

    await expect(
      gate.run("evt-retry", async () => {
        executions += 1;
        throw new Error("first");
      })
    ).rejects.toThrow("first");

    await gate.run("evt-retry", async () => {
      executions += 1;
    });

    expect(executions).toBe(2);
  });

  it("does not collapse distinct eventIds", async () => {
    const gate = new SharedOrderRematerializationGate();
    let executions = 0;

    await Promise.all([
      gate.run("evt-a", async () => {
        executions += 1;
        await delay(20);
      }),
      gate.run("evt-b", async () => {
        executions += 1;
        await delay(20);
      }),
    ]);

    expect(executions).toBe(2);
  });
});
