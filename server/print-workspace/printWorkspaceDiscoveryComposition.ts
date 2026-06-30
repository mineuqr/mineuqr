import { connectorGateway } from "../connector-gateway/gatewayComposition";
import { PrintWorkspaceDiscoveryReadService } from "./read/services/PrintWorkspaceDiscoveryReadService";

export const printWorkspaceDiscoveryReadService = new PrintWorkspaceDiscoveryReadService(
  connectorGateway
);
