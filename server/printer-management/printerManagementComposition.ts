import { connectorGateway } from "../connector-gateway/gatewayComposition";
import { GatewayRoutedPrintConnectorApi } from "../connector-gateway/adapters/GatewayRoutedPrintConnectorApi";
import { DrizzlePrinterSelectionRepository } from "../print-connector/infrastructure/persistence/DrizzlePrinterSelectionRepository";
import { DrizzleRestaurantPrinterRepository } from "./infrastructure/DrizzleRestaurantPrinterRepository";
import { PrinterManagementService } from "./services/PrinterManagementService";

const restaurantPrinterRepository = new DrizzleRestaurantPrinterRepository();
const printerSelectionRepository = new DrizzlePrinterSelectionRepository();

export const printerManagementService = new PrinterManagementService(
  restaurantPrinterRepository,
  new GatewayRoutedPrintConnectorApi(connectorGateway, printerSelectionRepository)
);
