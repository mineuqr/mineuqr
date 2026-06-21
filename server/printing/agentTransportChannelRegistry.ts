/**
 * THERMAL-PRINTING-5D — agent transport channel registration and resolution.
 */
import {
  NULL_AGENT_TRANSPORT_CHANNEL_ID,
  type AgentTransportChannel,
} from "./agentTransportChannelTypes";
import { nullAgentTransportChannel } from "./nullAgentTransportChannel";

const channels = new Map<string, AgentTransportChannel>();

function normalizeChannelId(channelId: string): string {
  const normalized = channelId.trim();
  if (!normalized) {
    throw new Error("Agent transport channel id is required");
  }
  return normalized;
}

export function registerAgentTransportChannel(channel: AgentTransportChannel): void {
  const channelId = normalizeChannelId(channel.channelId);
  channels.set(channelId, channel);
}

export function getAgentTransportChannel(
  channelId: string
): AgentTransportChannel | undefined {
  return channels.get(normalizeChannelId(channelId));
}

export function listAgentTransportChannels(): string[] {
  return Array.from(channels.keys()).sort();
}

export function clearRegisteredAgentTransportChannels(): void {
  channels.clear();
}

export function registerDefaultAgentTransportChannels(): void {
  registerAgentTransportChannel(nullAgentTransportChannel);
}

registerDefaultAgentTransportChannels();
