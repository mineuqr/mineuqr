/**
 * THERMAL-PRINTING-12E.1B — print host tRPC surface (connectivity bridge API).
 */
import { router } from "../_core/trpc";
import { endpointOperationsRouter } from "../printing/endpointOperationsRouter";
import { printOperationsRouter } from "../printing/printOperationsRouter";

export const printHostRouter = router({
  printOps: printOperationsRouter,
  endpointOps: endpointOperationsRouter,
});

export type PrintHostRouter = typeof printHostRouter;
