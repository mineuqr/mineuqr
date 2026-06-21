/**
 * THERMAL-PRINTING-6D — local file-backed agent identity persistence.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface AgentLocalIdentity {
  agentId: string;
  agentName: string;
  createdAt: string;
}

export interface IdentityStore {
  load(): Promise<AgentLocalIdentity | null>;
  save(identity: AgentLocalIdentity): Promise<void>;
}

export class FileIdentityStore implements IdentityStore {
  constructor(private readonly filePath: string) {}

  async load(): Promise<AgentLocalIdentity | null> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<AgentLocalIdentity>;

      if (
        typeof parsed.agentId !== "string" ||
        !parsed.agentId.trim() ||
        typeof parsed.agentName !== "string" ||
        !parsed.agentName.trim() ||
        typeof parsed.createdAt !== "string" ||
        !parsed.createdAt.trim()
      ) {
        throw new Error("Invalid agent identity file");
      }

      return {
        agentId: parsed.agentId.trim(),
        agentName: parsed.agentName.trim(),
        createdAt: parsed.createdAt.trim(),
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async save(identity: AgentLocalIdentity): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(identity, null, 2)}\n`, "utf8");
  }
}

export class MemoryIdentityStore implements IdentityStore {
  private identity: AgentLocalIdentity | null = null;

  async load(): Promise<AgentLocalIdentity | null> {
    return this.identity ? { ...this.identity } : null;
  }

  async save(identity: AgentLocalIdentity): Promise<void> {
    this.identity = { ...identity };
  }
}
