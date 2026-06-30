/**
 * PRINTING-1 — callback port for PRINT-CONNECTOR-1 to report execution outcomes.
 */
export interface PrintResultPort {
  reportPrintingStarted(input: {
    jobId: number;
    restaurantId: number;
  }): Promise<void>;

  reportPrintSuccess(input: {
    jobId: number;
    restaurantId: number;
  }): Promise<void>;

  reportPrintFailure(input: {
    jobId: number;
    restaurantId: number;
    error: string;
  }): Promise<void>;
}
