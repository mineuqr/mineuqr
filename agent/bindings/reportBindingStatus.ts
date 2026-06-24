/**
 * THERMAL-PRINTING-13I.3A — build and send binding status reports to Print Host.
 */
import type { BindingDiagnosticsReport } from "../../shared/printing/printerBinding";
import type {
  AgentPrinterBindingReportMessage,
  AgentPrinterBindingReportPayload,
} from "../../shared/printing/printerBindingReport";
import {
  AGENT_PRINTER_BINDING_MESSAGE_TYPES,
  DEFAULT_AGENT_PRINTER_BINDING_PROTOCOL_VERSION,
  fingerprintPrinterBindingReportInventory,
  validateAgentPrinterBindingReportPayload,
} from "../../shared/printing/printerBindingReport";
import type { AgentDeploymentConfig } from "../config/types";
import { evaluateBindingDiagnostics } from "./evaluateBindingDiagnostics";
import { loadPrinterBindingsFile, resolvePrinterBindingsPath } from "./printerBindingStore";
import {
  discoverWindowsPrinters,
  type WindowsPrinterDiscoveryClient,
} from "./windowsPrinterDiscovery";

export type BindingStatusReportSender = {
  send(data: string): void;
};

export class BindingStatusReportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BindingStatusReportError";
  }
}

export function bindingReportPayloadFromDiagnostics(input: {
  agentId: string;
  report: BindingDiagnosticsReport;
}): AgentPrinterBindingReportPayload {
  const timestamp = input.report.generatedAt;
  return {
    agentId: input.agentId,
    timestamp,
    bindings: input.report.items.map((item) => ({
      profileId: item.profileId,
      logicalPrinterName: item.logicalPrinterName,
      bindingStatus: item.status,
      windowsPrinterName: item.windowsPrinterName,
      portName: item.portName,
      lastValidatedAt: timestamp,
      ...(item.message ? { message: item.message } : {}),
    })),
  };
}

export async function buildBindingStatusReportPayload(input: {
  config: AgentDeploymentConfig;
  configPath: string;
  discoveryClient?: WindowsPrinterDiscoveryClient;
}): Promise<AgentPrinterBindingReportPayload> {
  const bindingsPath = resolvePrinterBindingsPath(input.configPath);
  const bindingsFile = await loadPrinterBindingsFile(bindingsPath);
  const discoveredPrinters = await discoverWindowsPrinters(input.discoveryClient);
  const report = evaluateBindingDiagnostics({
    config: input.config,
    bindingsFile,
    discoveredPrinters,
    configPath: input.configPath,
    bindingsPath,
  });

  return bindingReportPayloadFromDiagnostics({
    agentId: input.config.agentId,
    report,
  });
}

export function buildBindingStatusReportMessage(
  payload: AgentPrinterBindingReportPayload
): AgentPrinterBindingReportMessage {
  const validated = validateAgentPrinterBindingReportPayload(payload);

  return {
    type: AGENT_PRINTER_BINDING_MESSAGE_TYPES.BINDING_REPORT,
    protocolVersion: DEFAULT_AGENT_PRINTER_BINDING_PROTOCOL_VERSION,
    agentId: validated.agentId,
    timestamp: validated.timestamp,
    bindings: validated.bindings,
  };
}

export class BindingStatusReportTracker {
  private lastFingerprint: string | undefined;

  hasReportedInventory(bindings: AgentPrinterBindingReportPayload["bindings"]): boolean {
    if (!this.lastFingerprint) {
      return false;
    }

    return this.lastFingerprint === fingerprintPrinterBindingReportInventory(bindings);
  }

  markReported(bindings: AgentPrinterBindingReportPayload["bindings"]): void {
    this.lastFingerprint = fingerprintPrinterBindingReportInventory(bindings);
  }

  clear(): void {
    this.lastFingerprint = undefined;
  }
}

export function reportBindingStatus(input: {
  payload: AgentPrinterBindingReportPayload;
  sender: BindingStatusReportSender;
  tracker: BindingStatusReportTracker;
  force?: boolean;
}): boolean {
  if (!input.force && input.tracker.hasReportedInventory(input.payload.bindings)) {
    return false;
  }

  const message = buildBindingStatusReportMessage(input.payload);
  input.sender.send(JSON.stringify(message));
  input.tracker.markReported(message.bindings);
  return true;
}

export type BindingStatusMonitor = {
  stop(): void;
};

export function startBindingStatusMonitor(input: {
  intervalMs?: number;
  provider: () => Promise<AgentPrinterBindingReportPayload | null>;
  sender: BindingStatusReportSender;
  tracker: BindingStatusReportTracker;
}): BindingStatusMonitor {
  const intervalMs = input.intervalMs ?? 60_000;
  const timer = setInterval(() => {
    void (async () => {
      try {
        const payload = await input.provider();
        if (!payload) {
          return;
        }
        reportBindingStatus({
          payload,
          sender: input.sender,
          tracker: input.tracker,
        });
      } catch {
        // Non-fatal: binding monitor must not crash the agent.
      }
    })();
  }, intervalMs);

  if (typeof timer === "object" && "unref" in timer) {
    timer.unref();
  }

  return {
    stop() {
      clearInterval(timer);
    },
  };
}
