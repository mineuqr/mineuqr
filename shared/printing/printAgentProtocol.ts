/**
 * THERMAL-PRINTING-5C — versioned print agent protocol contracts (platform-neutral).
 */

export const SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION = "1.0" as const;

export type PrintAgentProtocolVersion = typeof SUPPORTED_PRINT_AGENT_PROTOCOL_VERSION;

export interface PrintAgentRequest {
  protocolVersion: string;
  requestId: string;
  printJobId: number;
  restaurantId: number;
  payloadBase64: string;
}

export interface PrintAgentResponse {
  protocolVersion: string;
  requestId: string;
  accepted: boolean;
  error?: string;
}

export type PrintAgentPlatform = "windows" | "android" | "ios";

export interface PrintAgentCapabilities {
  protocolVersion: string;
  platform: PrintAgentPlatform;
  transports: string[];
  printers: number;
}
