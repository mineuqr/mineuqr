/**
 * THERMAL-PRINTING-6B — correlates PrintAgentRequest/Response by requestId.
 */
import type { PrintAgentResponse } from "../../shared/printing/printAgentProtocol";

export const DEFAULT_PENDING_REQUEST_TIMEOUT_MS = 30_000;

export class PendingRequestAbortedError extends Error {
  readonly requestId: string;

  constructor(requestId: string, message: string) {
    super(message);
    this.name = "PendingRequestAbortedError";
    this.requestId = requestId;
  }
}

export class PendingRequestTimeoutError extends Error {
  readonly requestId: string;

  constructor(requestId: string) {
    super(`Print agent request timed out: ${requestId}`);
    this.name = "PendingRequestTimeoutError";
    this.requestId = requestId;
  }
}

type PendingRequestEntry = {
  requestId: string;
  agentId: string;
  resolve: (response: PrintAgentResponse) => void;
  reject: (error: Error) => void;
  timeoutHandle: ReturnType<typeof setTimeout>;
};

const pendingRequests = new Map<string, PendingRequestEntry>();

export function registerPending(
  requestId: string,
  options: {
    agentId: string;
    timeoutMs?: number;
  }
): Promise<PrintAgentResponse> {
  const normalizedRequestId = requestId.trim();
  if (!normalizedRequestId) {
    return Promise.reject(new Error("Request id is required"));
  }
  if (pendingRequests.has(normalizedRequestId)) {
    return Promise.reject(new Error(`Duplicate pending request id: ${normalizedRequestId}`));
  }

  return new Promise((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_PENDING_REQUEST_TIMEOUT_MS;
    const timeoutHandle = setTimeout(() => {
      timeoutPending(normalizedRequestId);
    }, timeoutMs);

    pendingRequests.set(normalizedRequestId, {
      requestId: normalizedRequestId,
      agentId: options.agentId,
      resolve,
      reject,
      timeoutHandle,
    });
  });
}

export function resolvePending(
  requestId: string,
  response: PrintAgentResponse
): boolean {
  const entry = pendingRequests.get(requestId.trim());
  if (!entry) {
    return false;
  }

  clearTimeout(entry.timeoutHandle);
  pendingRequests.delete(entry.requestId);
  entry.resolve(response);
  return true;
}

export function timeoutPending(requestId: string): boolean {
  const entry = pendingRequests.get(requestId.trim());
  if (!entry) {
    return false;
  }

  clearTimeout(entry.timeoutHandle);
  pendingRequests.delete(entry.requestId);
  entry.reject(new PendingRequestTimeoutError(entry.requestId));
  return true;
}

export function hasPendingRequest(requestId: string): boolean {
  return pendingRequests.has(requestId.trim());
}

export function clearPendingRequestsForAgent(agentId: string): number {
  const normalizedAgentId = agentId.trim();
  let cleared = 0;

  pendingRequests.forEach((entry, requestId) => {
    if (entry.agentId !== normalizedAgentId) {
      return;
    }

    clearTimeout(entry.timeoutHandle);
    pendingRequests.delete(requestId);
    entry.reject(
      new PendingRequestAbortedError(
        entry.requestId,
        `Agent disconnected: ${normalizedAgentId}`
      )
    );
    cleared += 1;
  });

  return cleared;
}

export function clearPendingRequests(): void {
  pendingRequests.forEach((entry) => {
    clearTimeout(entry.timeoutHandle);
  });
  pendingRequests.clear();
}

export function getPendingRequestCount(): number {
  return pendingRequests.size;
}
