/**
 * THERMAL-PRINTING-10A — production WebSocket job fetch client.
 */
import { randomUUID } from "node:crypto";
import type { AgentWebSocketClient } from "../transport/websocketClient";
import { serializeJobFetchRequest } from "./jobWire";
import {
  mapFetchResponseToAuthoritativePrintJob,
  tryParseAgentJobFetchResponse,
} from "./parseJobFetchResponse";
import type { AgentJobClient, FetchPrintJobInput } from "./jobClient";
import type { AuthoritativePrintJob } from "./jobTypes";

export const DEFAULT_JOB_FETCH_TIMEOUT_MS = 30_000;

export class AgentJobFetchTimeoutError extends Error {
  constructor(requestId: string) {
    super(`Job fetch timed out: ${requestId}`);
    this.name = "AgentJobFetchTimeoutError";
  }
}

type PendingFetch = {
  resolve: (job: AuthoritativePrintJob | null) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};

export type WebSocketAgentJobClientOptions = {
  agentId: string;
  sender: AgentWebSocketClient;
  timeoutMs?: number;
  createRequestId?: () => string;
};

export class WebSocketAgentJobClient implements AgentJobClient {
  private readonly pending = new Map<string, PendingFetch>();
  private readonly timeoutMs: number;
  private readonly createRequestId: () => string;

  constructor(private readonly options: WebSocketAgentJobClientOptions) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_JOB_FETCH_TIMEOUT_MS;
    this.createRequestId = options.createRequestId ?? (() => randomUUID());
  }

  handleTransportMessage(rawMessage: string): boolean {
    const response = tryParseAgentJobFetchResponse(rawMessage);
    if (!response) {
      return false;
    }

    const pending = this.pending.get(response.requestId);
    if (!pending) {
      return false;
    }

    clearTimeout(pending.timeoutHandle);
    this.pending.delete(response.requestId);
    pending.resolve(mapFetchResponseToAuthoritativePrintJob(response));
    return true;
  }

  async fetchPrintJob(input: FetchPrintJobInput): Promise<AuthoritativePrintJob | null> {
    const requestId = this.createRequestId();

    return new Promise<AuthoritativePrintJob | null>((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new AgentJobFetchTimeoutError(requestId));
      }, this.timeoutMs);

      this.pending.set(requestId, { resolve, reject, timeoutHandle });

      this.options.sender.send(
        serializeJobFetchRequest({
          agentId: input.agentId,
          jobId: input.jobId,
          requestId,
        })
      );
    });
  }

  clearPendingRequests(): void {
    this.pending.forEach((entry) => {
      clearTimeout(entry.timeoutHandle);
      entry.reject(new Error("Job fetch client cleared"));
    });
    this.pending.clear();
  }
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
