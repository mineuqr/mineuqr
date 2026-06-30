import type { ConnectorExecutionPort } from "../contracts/ConnectorExecutionPort";

export function stubConnectorExecutionPort(
  overrides: Partial<ConnectorExecutionPort> = {}
): ConnectorExecutionPort {
  return {
    executePrint: async () => ({ success: true }),
    executeDiscoverPrinters: async () => ({ success: true, printers: [] }),
    executeGetPrinterStatus: async () => ({ success: true, status: null, capabilities: null }),
    executeSelectPrinter: async () => ({ success: true }),
    executeCancelPrint: async () => ({ success: true }),
    ...overrides,
  };
}
