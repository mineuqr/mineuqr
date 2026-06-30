import type {
  PrinterSelectionRepository,
  SavePrinterSelectionInput,
} from "../../print-connector/contracts/PrinterSelectionRepository";
import type { SelectedPrinterDto } from "../../print-connector/contracts/PrintConnectorApi";

export class InMemoryPrinterSelectionRepository implements PrinterSelectionRepository {
  private readonly byRestaurant = new Map<number, SelectedPrinterDto>();

  async saveSelection(input: SavePrinterSelectionInput): Promise<SelectedPrinterDto> {
    const record: SelectedPrinterDto = {
      ...input,
      selectedAt: new Date().toISOString(),
    };
    this.byRestaurant.set(input.restaurantId, record);
    return record;
  }

  async getSelected(restaurantId: number): Promise<SelectedPrinterDto | null> {
    return this.byRestaurant.get(restaurantId) ?? null;
  }
}
