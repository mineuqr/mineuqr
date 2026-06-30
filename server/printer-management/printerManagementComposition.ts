import { connectorGateway } from "../connector-gateway/gatewayComposition";
import { GatewayRoutedPrintConnectorApi } from "../connector-gateway/adapters/GatewayRoutedPrintConnectorApi";
import { DrizzleRestaurantPrinterRepository } from "./infrastructure/DrizzleRestaurantPrinterRepository";
import { PrinterManagementService } from "./services/PrinterManagementService";

const restaurantPrinterRepository = new DrizzleRestaurantPrinterRepository();

export const printerManagementService = new PrinterManagementService(
  restaurantPrinterRepository,
  new GatewayRoutedPrintConnectorApi(connectorGateway)
);
