import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { createIdentity } from "./createIdentity";
import { loadIdentity } from "./loadIdentity";
import { FileIdentityStore, MemoryIdentityStore } from "./identityStore";

describe("agent identity THERMAL-PRINTING-6D", () => {
  it("creates identity with uuid and timestamp", () => {
    const identity = createIdentity({
      agentId: "fixed-id",
      agentName: "Kitchen Printer",
      createdAt: "2026-06-18T10:00:00.000Z",
    });

    expect(identity).toEqual({
      agentId: "fixed-id",
      agentName: "Kitchen Printer",
      createdAt: "2026-06-18T10:00:00.000Z",
    });
  });

  it("loads existing identity without regeneration", async () => {
    const store = new MemoryIdentityStore();
    const first = await loadIdentity({ store, agentName: "Kitchen Printer" });
    const second = await loadIdentity({ store, agentName: "Different Name" });

    expect(second).toEqual(first);
    expect(second.agentName).toBe("Kitchen Printer");
  });

  it("persists identity to local file storage", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mineuqr-agent-"));
    const store = new FileIdentityStore(join(dir, "identity.json"));

    const identity = await loadIdentity({ store, agentName: "Kitchen Printer" });
    const raw = await readFile(join(dir, "identity.json"), "utf8");

    expect(JSON.parse(raw)).toEqual(identity);
  });
});
