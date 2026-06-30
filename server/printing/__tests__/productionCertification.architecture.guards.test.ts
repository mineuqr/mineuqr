import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { resolvePrintConnectorExecutionMode } from "../resolvePrintConnectorExecutionMode";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("PRINT-PRODUCTION-CERTIFICATION-BLOCKERS-1 architecture guards", () => {
  it("production composition defaults to remote gateway execution", () => {
    const composition = readFileSync(join(root, "printingComposition.ts"), "utf8");
    expect(composition).toContain("resolvePrintConnectorExecutionMode");
    expect(composition).toContain('resolvePrintConnectorExecutionMode() === "remote"');
    expect(composition).toContain("createRemotePrintConnectorPort");
  });

  it("embedded execution requires explicit opt-in outside production", () => {
    const resolver = readFileSync(join(root, "resolvePrintConnectorExecutionMode.ts"), "utf8");
    expect(resolver).toContain('process.env.NODE_ENV === "production"');
    expect(resolver).toContain('configured === "embedded"');
    expect(resolver).not.toMatch(/configured === "remote"/);
  });

  it("remote print connector port uses routeExecutePrint not routePrint", () => {
    const source = readFileSync(
      join(root, "../connector-gateway/adapters/RemotePrintConnectorPort.ts"),
      "utf8"
    );
    expect(source).toContain("routeExecutePrint");
    expect(source).not.toContain("routePrint(");
    expect(source).toContain("routeCancelPrint");
    expect(source).toContain("async cancel(");
  });

  it("printing service routes cancel through PrintConnectorPort", () => {
    const service = readFileSync(join(root, "application/PrintingService.ts"), "utf8");
    expect(service).toContain("this.connector.cancel");
    expect(service).toContain("executionId");
  });

  it("PrintConnectorPort defines submit and cancel", () => {
    const port = readFileSync(join(root, "contracts/ports/PrintConnectorPort.ts"), "utf8");
    expect(port).toContain("submit(submission: PrintConnectorSubmission)");
    expect(port).toContain("cancel(request: PrintConnectorCancelRequest)");
    expect(port).toContain("PrintConnectorSubmissionResult");
  });
});

describe("resolvePrintConnectorExecutionMode", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalMode = process.env.PRINT_CONNECTOR_EXECUTION_MODE;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalMode === undefined) {
      delete process.env.PRINT_CONNECTOR_EXECUTION_MODE;
    } else {
      process.env.PRINT_CONNECTOR_EXECUTION_MODE = originalMode;
    }
  });

  it("returns remote in production regardless of env override", () => {
    process.env.NODE_ENV = "production";
    process.env.PRINT_CONNECTOR_EXECUTION_MODE = "embedded";
    expect(resolvePrintConnectorExecutionMode()).toBe("remote");
  });

  it("returns remote by default outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.PRINT_CONNECTOR_EXECUTION_MODE;
    expect(resolvePrintConnectorExecutionMode()).toBe("remote");
  });

  it("returns embedded only with explicit opt-in outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.PRINT_CONNECTOR_EXECUTION_MODE = "embedded";
    expect(resolvePrintConnectorExecutionMode()).toBe("embedded");
  });
});
