import { printConnectorRuntime } from "../print-connector/printConnectorComposition";
import { DrizzleRestaurantPrinterRepository } from "./infrastructure/DrizzleRestaurantPrinterRepository";
import { PrinterManagementService } from "./services/PrinterManagementService";

const restaurantPrinterRepository = new DrizzleRestaurantPrinterRepository();

export const printerManagementService = new PrinterManagementService(
  restaurantPrinterRepository,
  printConnectorRuntime
);
