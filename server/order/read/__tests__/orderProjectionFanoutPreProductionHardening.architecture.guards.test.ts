import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../..");

function read(rel: string) {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const FANOUT_PRODUCTION_FILES = [
  "server/order/read/projections/materializers/SharedOrderRematerializationGate.ts",
  "server/order/read/projections/materializers/OrderReadProjectionMaterializer.ts",
  "server/order/read/projections/consumers/createOrderReadProjectionConsumers.ts",
  "server/order/read/readComposition.ts",
  "server/order/read/readPersistenceComposition.ts",
] as const;

const TSC_LINE_RE = /^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/;

describe("ORDER-PROJECTION-FANOUT-PRE-PRODUCTION-HARDENING-1 topology", () => {
  it("keeps live rematerialization on one in-process materializer singleton", () => {
    const persistence = read("server/order/read/readPersistenceComposition.ts");
    const composition = read("server/order/read/readComposition.ts");
    const productionConstructors = persistence.match(/new OrderReadProjectionMaterializer\(/g);

    expect(productionConstructors).toHaveLength(1);
    expect(persistence).toContain("export const orderReadProjectionMaterializer");
    expect(composition).toContain(
      "createOrderReadProjectionConsumers(orderReadProjectionMaterializer)"
    );
    expect(composition).toContain("executionPolicy: \"parallel\"");
  });

  it("keeps projection dispatch in-process and parallel in the same registry", () => {
    const publisher = read(
      "server/order/infrastructure/events/publisher/InProcessEventPublisher.ts"
    );
    const events = read("server/order/eventInfrastructureComposition.ts");
    const registry = read(
      "server/order/read/infrastructure/registry/OrderProjectionConsumerRegistry.ts"
    );
    const composite = read(
      "server/order/read/infrastructure/registry/CompositeEventDispatchDelegate.ts"
    );

    expect(publisher).toContain("export class InProcessEventPublisher");
    expect(events).toContain("new InProcessEventPublisher(");
    expect(events).toContain("createOrderEventDispatchDelegate");
    expect(composite).toContain("projectionRegistry.dispatchProjections(envelope)");
    expect(registry).toContain("await Promise.all(parallel.map((r) => runOne(r)))");
  });

  it("keeps the rematerialization gate process-local and off Redis/Outbox/DB locks", () => {
    const gate = read(
      "server/order/read/projections/materializers/SharedOrderRematerializationGate.ts"
    );

    expect(gate).toContain("process-local");
    expect(gate).toContain("not a cluster-wide lock");
    expect(gate).toContain("InProcessEventPublisher");
    expect(gate).toContain("Promise.all");
    expect(gate).toContain("not SKIP LOCKED");
    expect(gate).not.toContain("getDb");
    expect(gate).not.toContain("ioredis");
    expect(gate).not.toContain("fetchPendingBatch");
    expect(gate).not.toMatch(/\bnew Redis\b/);
  });

  it("does not reopen Outbox, Relay, Cashier, Identity, Check, or Settlement", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const relay = read("server/order/infrastructure/events/relay/OrderEventRelay.ts");
    const outbox = read(
      "server/order/infrastructure/events/outbox/DrizzleOutboxRepository.ts"
    );

    expect(sale).toContain("awaitRelay: false");
    expect(sale).not.toContain("awaitRelay: true");
    expect(relay).toContain("fetchPendingBatch(limit)");
    expect(outbox).not.toContain("SKIP LOCKED");
  });
});

describe("ORDER-PROJECTION-FANOUT-PRE-PRODUCTION-HARDENING-1 typescript", () => {
  it("includes fan-out production files in the tsc noEmit program and excludes tests", () => {
    const tsconfig = read("tsconfig.json");
    expect(tsconfig).toContain('"include": ["client/src/**/*", "shared/**/*", "server/**/*"');
    expect(tsconfig).toContain('"**/*.test.ts"');
    expect(tsconfig).toContain('"noEmit": true');

    for (const rel of FANOUT_PRODUCTION_FILES) {
      expect(rel.endsWith(".test.ts")).toBe(false);
      expect(read(rel).length).toBeGreaterThan(0);
      expect(read(rel)).not.toContain("@ts-ignore");
      expect(read(rel)).not.toContain("@ts-expect-error");
    }
  });

  it.skipIf(process.env.ORDER_PROJECTION_FANOUT_TSC !== "1")(
    "reports zero tsc diagnostics in fan-out production files",
    { timeout: 180_000 },
    () => {
      const result = spawnSync(
        "pnpm",
        ["exec", "tsc", "--noEmit", "--incremental", "false", "--pretty", "false"],
        {
          cwd: repoRoot,
          encoding: "utf8",
          timeout: 170_000,
          shell: true,
        }
      );
      const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
      const hits = output
        .split(/\r?\n/)
        .map((line) => TSC_LINE_RE.exec(line))
        .filter((match): match is RegExpExecArray => Boolean(match))
        .filter((match) => {
          const file = match[1].replace(/\\/g, "/");
          return FANOUT_PRODUCTION_FILES.some(
            (rel) => file === rel || file.endsWith(`/${rel}`)
          );
        });

      expect(hits).toEqual([]);
    }
  );
});
