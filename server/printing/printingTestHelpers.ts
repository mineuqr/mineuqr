import { SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION } from "../../shared/printing/printAgentProtocol";
import { registerAgent } from "./agentRegistry";
import { replaceAgentPrinterInventory } from "./printerProfileStore";
import { registerDbPrinterProfileMapping } from "./printerResolutionRegistry";

export const TEST_DB_PRINTER_ID = 10;
export const TEST_PROFILE_PRINTER_ID = "kitchen-printer-10";

export const sampleProfile = {
  printerId: TEST_PROFILE_PRINTER_ID,
  printerName: "Kitchen",
  transport: "usb" as const,
  capabilities: {
    escpos: true,
    cutter: false,
    cashDrawer: false,
    qrCode: true,
    imagePrinting: false,
  },
  executionCapabilities: {
    airprint: false,
    vendorSdk: false,
  },
  paperWidth: 80 as const,
};

export function registerOnlineAgent(agentId: string): void {
  registerAgent({
    identity: {
      agentId,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: new Date().toISOString(),
  });
}

export function registerOfflineAgent(agentId: string): void {
  registerAgent({
    identity: {
      agentId,
      platform: "windows",
      protocolVersion: SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION,
    },
    connectedAt: "2020-01-01T00:00:00.000Z",
  });
}

export function seedPrinterProfile(
  agentId: string,
  profilePrinterId = TEST_PROFILE_PRINTER_ID
): void {
  replaceAgentPrinterInventory({
    agentId,
    timestamp: new Date().toISOString(),
    profiles: [{ ...sampleProfile, printerId: profilePrinterId }],
  });
}

export function seedPrinterResolution(input: {
  agentId: string;
  dbPrinterId?: number;
  profilePrinterId?: string;
}): void {
  const dbPrinterId = input.dbPrinterId ?? TEST_DB_PRINTER_ID;
  const profilePrinterId = input.profilePrinterId ?? TEST_PROFILE_PRINTER_ID;

  registerDbPrinterProfileMapping({ dbPrinterId, profilePrinterId });
  seedPrinterProfile(input.agentId, profilePrinterId);
}

export function seedConflictingPrinterOwnership(agentIds: string[]): void {
  registerDbPrinterProfileMapping({
    dbPrinterId: TEST_DB_PRINTER_ID,
    profilePrinterId: TEST_PROFILE_PRINTER_ID,
  });
  for (const agentId of agentIds) {
    seedPrinterProfile(agentId);
  }
}
