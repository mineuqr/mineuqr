/**
 * THERMAL-PRINTING-5B — browser print bridge request/response contracts.
 */

export interface BrowserPrintRequest {
  printJobId: number;
  restaurantId: number;
  payloadBase64: string;
}

export interface BrowserPrintResponse {
  accepted: boolean;
}

export const BROWSER_PRINT_BRIDGE_TRANSPORT_ID = "browser-bridge" as const;
