/**
 * THERMAL-PRINTING-13H.2 — Print Host dispatch bridge tRPC surface.
 */
import { z } from "zod";
import { router } from "../_core/trpc";
import { PRINT_HOST_ENV } from "../print-host/printHostEnv";
import { executePrintHostDispatch } from "./dispatchBridgeService";
import { createPrintHostApiKeyProcedure } from "./printHostDispatchAuth";

const dispatchJobInputSchema = z.object({
  jobId: z.number().int().positive(),
});

const dispatchJobProcedure = createPrintHostApiKeyProcedure(PRINT_HOST_ENV.apiKey)
  .input(dispatchJobInputSchema)
  .mutation(async ({ input, ctx }) => {
    return executePrintHostDispatch({
      jobId: input.jobId,
      correlationId: ctx.correlationId,
    });
  });

export const dispatchBridgeRouter = router({
  dispatchJob: dispatchJobProcedure,
});

export type DispatchBridgeRouter = typeof dispatchBridgeRouter;
