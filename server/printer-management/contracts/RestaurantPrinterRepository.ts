import type { RestaurantPrinterDto } from "./printerManagementContracts";
import type { PrinterCapability } from "../../print-connector/domain/PrinterCapability";

export type SaveRestaurantPrinterInput = {
  restaurantId: number;
  printerId: string;
  displayName: string;
  platform: string;
  transport: string;
  isDefault?: boolean;
  capabilities?: PrinterCapability | null;
  lastValidatedAt?: string | null;
};

export interface RestaurantPrinterRepository {
  listByRestaurant(restaurantId: number): Promise<RestaurantPrinterDto[]>;
  findByPrinterId(restaurantId: number, printerId: string): Promise<RestaurantPrinterDto | null>;
  getDefault(restaurantId: number): Promise<RestaurantPrinterDto | null>;
  save(input: SaveRestaurantPrinterInput): Promise<RestaurantPrinterDto>;
  rename(restaurantId: number, printerId: string, displayName: string): Promise<RestaurantPrinterDto | null>;
  remove(restaurantId: number, printerId: string): Promise<boolean>;
  setDefault(restaurantId: number, printerId: string): Promise<RestaurantPrinterDto | null>;
  markValidated(restaurantId: number, printerId: string, validatedAt: string): Promise<void>;
}
