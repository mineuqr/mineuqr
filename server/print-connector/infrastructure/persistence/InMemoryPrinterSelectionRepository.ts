import type {
  PrinterSelectionRepository,
  SavePrinterSelectionInput,
} from "../../contracts/PrinterSelectionRepository";
import type { SelectedPrinterDto } from "../../contracts/PrintConnectorApi";

/**
 * Ephemeral RLC / embedded-runtime selection cache — not cloud catalog SSOT (ADR-ARCH-017).
 */
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
