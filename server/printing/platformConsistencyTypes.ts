/**
 * THERMAL-PRINTING-8D.1 — platform identity consistency contracts.
 *
 * Agent Registry hello platform is authoritative; capability store is informational.
 */
import type { AgentPlatform } from "../../shared/printing/agentTypes";

export type PlatformConsistencyState = {
  agentId: string;
  helloPlatform: AgentPlatform;
  capabilityPlatform: AgentPlatform | undefined;
  consistent: boolean;
};

export type PlatformConsistencyValidationInput = {
  agentId: string;
  helloPlatform: AgentPlatform;
  capabilityPlatform: AgentPlatform;
};

export type PlatformConsistencyValidationResult = {
  agentId: string;
  helloPlatform: AgentPlatform;
  capabilityPlatform: AgentPlatform;
  consistent: boolean;
  reason?: string;
};
