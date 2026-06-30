import type { PrintResultPort } from "./contracts/ports/PrintResultPort";
import { PrintDispatchCoordinator, PrintingService } from "./application/PrintingService";
import { OrderReadPrintPayloadBuilder } from "./infrastructure/payload/OrderReadPrintPayloadBuilder";
import { OpsPrintStatusPublisher } from "./infrastructure/events/OpsPrintStatusPublisher";
import { DrizzlePrintJobAttemptRepository } from "./infrastructure/persistence/DrizzlePrintJobAttemptRepository";
import { DrizzlePrintJobHistoryRepository } from "./infrastructure/persistence/DrizzlePrintJobHistoryRepository";
import { DrizzlePrintJobRepository } from "./infrastructure/persistence/DrizzlePrintJobRepository";
import { OrderPrintDispatchAdapter } from "./infrastructure/adapters/OrderPrintDispatchAdapter";
import {
  printConnectorRuntime,
  PrintingServicePrintConnectorAdapter,
} from "../print-connector/printConnectorComposition";

const printJobRepository = new DrizzlePrintJobRepository();
const printJobAttemptRepository = new DrizzlePrintJobAttemptRepository();
const printJobHistoryRepository = new DrizzlePrintJobHistoryRepository();
const printPayloadBuilder = new OrderReadPrintPayloadBuilder();
const printStatusPublisher = new OpsPrintStatusPublisher();

let printingService: PrintingService;

const printResultPort: PrintResultPort = {
  reportPrintingStarted: async (input) => {
    await printingService.reportPrintingStarted(input);
  },
  reportPrintSuccess: async (input) => {
    await printingService.reportPrintSuccess(input);
  },
  reportPrintFailure: async (input) => {
    await printingService.reportPrintFailure(input);
  },
};

const printConnectorPort = new PrintingServicePrintConnectorAdapter(
  printConnectorRuntime,
  printResultPort
);

const printDispatchCoordinator = new PrintDispatchCoordinator(
  printJobRepository,
  printJobAttemptRepository,
  printJobHistoryRepository,
  printConnectorPort,
  printStatusPublisher
);

printingService = new PrintingService(
  printJobRepository,
  printJobAttemptRepository,
  printJobHistoryRepository,
  printPayloadBuilder,
  printDispatchCoordinator,
  printStatusPublisher
);

export { printingService };
export const orderPrintDispatchAdapter = new OrderPrintDispatchAdapter(printingService);
export { printResultPort };
