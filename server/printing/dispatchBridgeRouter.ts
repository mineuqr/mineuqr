/**
 * THERMAL-PRINTING-13H.2 — Print Host dispatch bridge tRPC surface.
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { PRINT_HOST_ENV } from "../print-host/printHostEnv";
import { executePrintHostDispatch } from "./dispatchBridgeService";
import { executePrintHostDiagnosticTestPrint } from "./diagnosticPrintDispatchService";
import { createPrintHostApiKeyProcedure } from "./printHostDispatchAuth";

const dispatchJobInputSchema = z.object({
  jobId: z.number().int().positive(),
});

const testPrintInputSchema = z.object({
  wireJobId: z.number().int().positive(),
  diagnosticId: z.string().min(8).max(64),
  diagnosticRunId: z.number().int().positive(),
  restaurantId: z.number().int().positive(),
  printerId: z.number().int().positive(),
  printerName: z.string().min(1).max(128),
  triggeredByLabel: z.string().min(1).max(256),
  triggeredAt: z.string().min(1).max(64),
});

const dispatchJobProcedure = createPrintHostApiKeyProcedure(PRINT_HOST_ENV.apiKey)
  .input(dispatchJobInputSchema)
  .mutation(async ({ input, ctx }) => {
    return executePrintHostDispatch({
      jobId: input.jobId,
      correlationId: ctx.correlationId,
    });
  });

const testPrintProcedure = createPrintHostApiKeyProcedure(PRINT_HOST_ENV.apiKey)
  .input(testPrintInputSchema)
  .mutation(async ({ input, ctx }) => {
    return executePrintHostDiagnosticTestPrint({
      ...input,
      correlationId: ctx.correlationId,
    });
  });

export const dispatchBridgeRouter = router({
  dispatchJob: dispatchJobProcedure,
  testPrint: testPrintProcedure,
});

export type DispatchBridgeRouter = typeof dispatchBridgeRouter;
