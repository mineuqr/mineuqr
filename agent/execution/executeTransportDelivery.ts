/**
 * THERMAL-PRINTING-10C — agent transport delivery dispatch.
 */
import { executeTransportDelivery } from "../../shared/printing/transports/executeTransportDelivery";
import type {
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import {
  createAgentTransportRegistry,
  type AgentTransportClients,
} from "../transports/transportRegistry";

export async function executeAgentTransportDelivery(
  request: TransportExecutionRequest,
  clients: AgentTransportClients
): Promise<TransportExecutionResult> {
  return executeTransportDelivery(request, createAgentTransportRegistry(clients));
}
