import type { SelectedPrinterDto } from "./PrintConnectorApi";

export type SavePrinterSelectionInput = {
  restaurantId: number;
  printerId: string;
  printerName: string;
  platform: string;
  transport: string;
};

export interface PrinterSelectionRepository {
  getSelected(restaurantId: number): Promise<SelectedPrinterDto | null>;
  saveSelection(input: SavePrinterSelectionInput): Promise<SelectedPrinterDto>;
}
