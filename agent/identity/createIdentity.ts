/**
 * THERMAL-PRINTING-6D — first-run identity creation.
 */
import { randomUUID } from "node:crypto";
import type { AgentLocalIdentity } from "./identityStore";

export type CreateIdentityInput = {
  agentName: string;
  createdAt?: string;
  agentId?: string;
};

export function createIdentity(input: CreateIdentityInput): AgentLocalIdentity {
  const agentName = input.agentName.trim();
  if (!agentName) {
    throw new Error("Agent name is required");
  }

  return {
    agentId: input.agentId ?? randomUUID(),
    agentName,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}
