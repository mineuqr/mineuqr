/**
 * THERMAL-PRINTING-10B — agent transport delivery dispatch.
 */
import { executeTransportDelivery } from "../../shared/printing/transports/executeTransportDelivery";
import type {
  TransportExecutionRequest,
  TransportExecutionResult,
} from "../../shared/printing/transports/transportContracts";
import { createAgentTransportRegistry } from "../transports/transportRegistry";
import type { TcpSocketClient } from "../transports/tcpSocketClient";

export async function executeAgentTransportDelivery(
  request: TransportExecutionRequest,
  socketClient: TcpSocketClient
): Promise<TransportExecutionResult> {
  return executeTransportDelivery(request, createAgentTransportRegistry(socketClient));
}
