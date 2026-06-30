/**
 * Future host for PlatformAdapter instances — no OS printing in PRINT-CONNECTOR-LOCAL-1.
 */
export class PlatformAdapterHost {
  private ready = false;

  initialize(): void {
    this.ready = true;
  }

  isAvailable(): boolean {
    return this.ready;
  }

  shutdown(): void {
    this.ready = false;
  }
}
