import { InMemoryPrinterSelectionRepository } from "./infrastructure/persistence/InMemoryPrinterSelectionRepository";
import { bootstrapPrintConnector } from "./bootstrap/ConnectorBootstrap";

const printerSelectionRepository = new InMemoryPrinterSelectionRepository();

const bootstrapped = bootstrapPrintConnector(printerSelectionRepository);

export const printConnectorDeploymentRuntime = bootstrapped.deploymentRuntime;
export const printConnectorRuntime = bootstrapped.connectorRuntime;

export { PrintingServicePrintConnectorAdapter } from "./infrastructure/adapters/PrintingServicePrintConnectorAdapter";
