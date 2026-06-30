import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("PRINT-CONNECTOR-PERSISTENCE-1 architecture guards", () => {
  it("production network composition uses durable connector repositories", () => {
    const source = readFileSync(join(root, "networkComposition.ts"), "utf8");
    expect(source).toContain("DrizzleConnectorCredentialRepository");
    expect(source).toContain("DrizzleConnectorPairingRepository");
    expect(source).toContain("useInMemoryPersistence");
    expect(source).not.toMatch(/export const connectorNetworkComposition = composeConnectorNetwork\(\{[\s\S]*InMemoryConnectorCredentialRepository/);
  });

  it("connector enrollment schema defines pairing and enrollment tables", () => {
    const schema = readFileSync(join(root, "../../drizzle/schema.ts"), "utf8");
    expect(schema).toContain("connector_pairing_tokens");
    expect(schema).toContain("connector_enrollments");
    expect(schema).toContain("lastSeenAt");
    expect(schema).toContain("connectorVersion");
  });

  it("authentication service records last seen without exposing secrets", () => {
    const source = readFileSync(join(root, "services/ConnectorAuthenticationService.ts"), "utf8");
    expect(source).toContain("touchEnrollment");
    expect(source).toContain("verifyConnectorSecret");
    expect(source).toContain("hashConnectorSecret");
    expect(source).toContain("findByConnectorInstanceId");
  });
});
