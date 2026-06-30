import { describe, expect, it } from "vitest";
import { bootstrapPrintConnector } from "../ConnectorBootstrap";
import {
  DEPLOYMENT_RUNTIME_FACTORIES,
  EmbeddedDeploymentRuntime,
} from "../../deployment/DeploymentRuntimes";
import {
  DEFAULT_DEPLOYMENT_TARGET,
  resolveDeploymentTarget,
} from "../../deployment/resolveDeploymentTarget";
import type { PrinterSelectionRepository } from "../contracts/PrinterSelectionRepository";

const stubSelectionRepo: PrinterSelectionRepository = {
  getSelected: async () => null,
  saveSelection: async (input) => ({
    ...input,
    selectedAt: new Date().toISOString(),
  }),
};

describe("ConnectorBootstrap", () => {
  it("composes connector with embedded deployment by default", () => {
    const result = bootstrapPrintConnector(stubSelectionRepo, {
      deploymentTarget: "embedded",
    });

    expect(result.deploymentRuntime.descriptor.identity.target).toBe("embedded");
    expect(result.connectorRuntime.discoverPrinters).toBeTypeOf("function");
  });

  it("resolves all deployment targets without throwing", () => {
    for (const target of Object.keys(DEPLOYMENT_RUNTIME_FACTORIES) as Array<
      keyof typeof DEPLOYMENT_RUNTIME_FACTORIES
    >) {
      const runtime = DEPLOYMENT_RUNTIME_FACTORIES[target]();
      expect(runtime.getPlatformAdapter()).toBeDefined();
      expect(runtime.getTransportAdapters().length).toBe(4);
    }
  });
});

describe("resolveDeploymentTarget", () => {
  it("defaults to embedded", () => {
    const previous = process.env.PRINT_CONNECTOR_DEPLOYMENT;
    delete process.env.PRINT_CONNECTOR_DEPLOYMENT;
    expect(resolveDeploymentTarget()).toBe(DEFAULT_DEPLOYMENT_TARGET);
    expect(DEFAULT_DEPLOYMENT_TARGET).toBe("embedded");
    if (previous !== undefined) process.env.PRINT_CONNECTOR_DEPLOYMENT = previous;
  });

  it("embedded runtime exposes in-process capabilities", () => {
    const runtime = new EmbeddedDeploymentRuntime();
    expect(runtime.descriptor.capabilities.supportsInProcessExecution).toBe(true);
  });
});
