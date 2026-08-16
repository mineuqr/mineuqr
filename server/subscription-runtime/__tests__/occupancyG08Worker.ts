/**
 * COMMERCIAL-LIMIT-OCCUPANCY-DOMAIN-RACE-TESTS-1
 * Independent process worker. Uses G07_DATABASE_URL only.
 */
import "dotenv/config";
import { startOccupancyTestTidb } from "./occupancyTestTidb";
import { createRestaurantLocked } from "./occupancyG08Tidb";

async function main(): Promise<void> {
  const ownerUserId = Number(process.env.G08_WORKER_OWNER);
  const cap = Number(process.env.G08_WORKER_CAP ?? 2);
  const delayMs = Number(process.env.G08_WORKER_DELAY_MS ?? 0);
  const label = process.env.G08_WORKER_LABEL ?? "worker";

  const tidb = await startOccupancyTestTidb();
  const startedAt = Date.now();
  try {
    const result = await createRestaurantLocked({
      db: tidb.db,
      ownerUserId,
      cap,
      delayMs,
    });
    console.log(
      JSON.stringify({
        ok: true,
        label,
        id: result.id,
        elapsedMs: Date.now() - startedAt,
      })
    );
  } catch (error) {
    const err = error as { name?: string; code?: string; message?: string };
    console.log(
      JSON.stringify({
        ok: false,
        label,
        name: err.name ?? "Error",
        code: err.code ?? null,
        message: err.message ?? String(error),
        elapsedMs: Date.now() - startedAt,
      })
    );
    await tidb.stop();
    process.exitCode = 1;
    process.exit();
  }
  await tidb.stop();
}

void main();
