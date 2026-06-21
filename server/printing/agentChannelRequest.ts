/**
 * THERMAL-PRINTING-5D — maps browser bridge payloads to print agent protocol requests.
 */
import type { BrowserPrintRequest } from "../../shared/printing/browserBridgeTypes";
import type { PrintAgentRequest } from "../../shared/printing/printAgentProtocol";
import {
  createPrintAgentRequest,
  type CreatePrintAgentRequestInput,
} from "./printAgentProtocol";

export function createAgentChannelRequest(
  input: BrowserPrintRequest | CreatePrintAgentRequestInput
): PrintAgentRequest {
  return createPrintAgentRequest(input);
}
