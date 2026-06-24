import { describe, expect, it } from "vitest";
import { AGENT_JOB_MESSAGE_TYPES } from "../../shared/printing/agentJobMessages";
import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { diagnosticWireJobIdFromRunId } from "../../shared/printing/diagnosticPrint";
import {
  mapFetchResponseToAuthoritativePrintJob,
  parseAgentJobFetchResponse,
} from "./parseJobFetchResponse";
import { validateAuthoritativePrintJob } from "./jobTypes";

describe("parseJobFetchResponse diagnostic THERMAL-PRINTING-13I.6C", () => {
  it("accepts diagnostic payloads with sentinel orderId from wire job id", () => {
    const wireJobId = diagnosticWireJobIdFromRunId(42);
    const raw = JSON.stringify({
      type: AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_RESPONSE,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      requestId: "req-diagnostic-1",
      found: true,
      job: {
        jobId: wireJobId,
        restaurantId: 720007,
        printerId: 1,
        orderId: wireJobId,
        ticket: {
          orderId: wireJobId,
          restaurantId: 720007,
          items: [
            { itemName: "MINEUQR DIAGNOSTIC TEST", quantity: 1, notes: null },
            { itemName: "\u200B", quantity: 1, notes: null },
            { itemName: "*** NOT A CUSTOMER ORDER ***", quantity: 1, notes: null },
          ],
        },
      },
    });

    const response = parseAgentJobFetchResponse(raw);
    const job = mapFetchResponseToAuthoritativePrintJob(response);

    expect(job).not.toBeNull();
    expect(() => validateAuthoritativePrintJob(job!)).not.toThrow();
    expect(job!.orderId).toBe(wireJobId);
    expect(job!.ticket.orderId).toBe(wireJobId);
  });

  it("still rejects customer payloads with non-positive orderId", () => {
    const raw = JSON.stringify({
      type: AGENT_JOB_MESSAGE_TYPES.JOB_FETCH_RESPONSE,
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
      requestId: "req-customer-1",
      found: true,
      job: {
        jobId: 420001,
        restaurantId: 720007,
        printerId: 1,
        orderId: 0,
        ticket: {
          orderId: 0,
          restaurantId: 720007,
          items: [{ itemName: "Burger", quantity: 1, notes: null }],
        },
      },
    });

    expect(() => parseAgentJobFetchResponse(raw)).toThrow(/Invalid orderId/);
  });
});
