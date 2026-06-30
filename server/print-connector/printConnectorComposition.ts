import { DrizzlePrinterSelectionRepository } from "./infrastructure/persistence/DrizzlePrinterSelectionRepository";
import { bootstrapPrintConnector } from "./bootstrap/ConnectorBootstrap";

const printerSelectionRepository = new DrizzlePrinterSelectionRepository();

const bootstrapped = bootstrapPrintConnector(printerSelectionRepository);

export const printConnectorDeploymentRuntime = bootstrapped.deploymentRuntime;
export const printConnectorRuntime = bootstrapped.connectorRuntime;

export { PrintingServicePrintConnectorAdapter } from "./infrastructure/adapters/PrintingServicePrintConnectorAdapter";
