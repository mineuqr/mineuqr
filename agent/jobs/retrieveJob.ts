/**
 * THERMAL-PRINTING-6D Phase-2 — authoritative job retrieval after notification.
 */
import type { AgentJobClient, FetchPrintJobInput } from "./jobClient";
import {
  AgentJobValidationError,
  normalizeAuthoritativePrintJob,
  type AuthoritativePrintJob,
} from "./jobTypes";

export class JobRetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobRetrievalError";
  }
}

export async function retrieveAuthoritativePrintJob(
  client: AgentJobClient,
  input: FetchPrintJobInput
): Promise<AuthoritativePrintJob> {
  const job = await client.fetchPrintJob(input);
  if (!job) {
    throw new JobRetrievalError(`Print job not found: ${input.jobId}`);
  }

  try {
    return normalizeAuthoritativePrintJob(job);
  } catch (error) {
    if (error instanceof AgentJobValidationError) {
      throw new JobRetrievalError(error.message);
    }
    throw error;
  }
}
