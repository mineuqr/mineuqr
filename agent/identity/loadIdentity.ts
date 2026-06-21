/**
 * THERMAL-PRINTING-6D — load or create persistent agent identity.
 */
import { createIdentity } from "./createIdentity";
import type { AgentLocalIdentity, IdentityStore } from "./identityStore";

export type LoadIdentityInput = {
  store: IdentityStore;
  agentName: string;
};

export async function loadIdentity(input: LoadIdentityInput): Promise<AgentLocalIdentity> {
  const existing = await input.store.load();
  if (existing) {
    return existing;
  }

  const identity = createIdentity({ agentName: input.agentName });
  await input.store.save(identity);
  return identity;
}
