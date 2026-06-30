import { connectorGatewayComposition } from "../connector-gateway/gatewayComposition";
import { printerManagementService } from "../printer-management/printerManagementComposition";
import { PrintWorkspacePresenceReadService } from "./read/services/PrintWorkspacePresenceReadService";

export const printWorkspacePresenceReadService = new PrintWorkspacePresenceReadService(
  connectorGatewayComposition.directory,
  printerManagementService
);
