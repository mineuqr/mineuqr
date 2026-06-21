/**
 * THERMAL-PRINTING-6D Phase-2 — authoritative job fetch client (no queue mutation).
 */
import type { AuthoritativePrintJob } from "./jobTypes";

export type FetchPrintJobInput = {
  agentId: string;
  jobId: number;
};

export interface AgentJobClient {
  fetchPrintJob(input: FetchPrintJobInput): Promise<AuthoritativePrintJob | null>;
}

export class MemoryAgentJobClient implements AgentJobClient {
  private readonly jobs = new Map<number, AuthoritativePrintJob>();

  seed(job: AuthoritativePrintJob): void {
    this.jobs.set(job.jobId, job);
  }

  remove(jobId: number): void {
    this.jobs.delete(jobId);
  }

  async fetchPrintJob(input: FetchPrintJobInput): Promise<AuthoritativePrintJob | null> {
    const job = this.jobs.get(input.jobId);
    return job ? { ...job, ticket: { ...job.ticket, items: [...job.ticket.items] } } : null;
  }
}
