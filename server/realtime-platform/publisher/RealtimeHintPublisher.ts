/**
 * REALTIME-PLATFORM-FOUNDATION-1
 * Hint publisher — validate + publish only. No DB / domain logic.
 */

import {
  assertHintIsMetadataOnly,
  createRealtimeHint,
  getRealtimeChannelDefinition,
  isRealtimeChannel,
  type RealtimeHint,
  type RealtimeHintInput,
} from "@shared/realtime-platform";
import type { RealtimePubSub } from "../pubsub/RealtimePubSub";
import {
  incRealtimeMetric,
  noteRealtimeEvent,
} from "../observability/realtimeMetrics";

export class RealtimeHintPublisher {
  constructor(private readonly bus: RealtimePubSub) {}

  async publish(input: RealtimeHintInput): Promise<RealtimeHint> {
    if (!isRealtimeChannel(input.channel)) {
      throw new Error(`Unknown channel: ${input.channel}`);
    }
    // Touch registry for ownership validation (no business rules).
    getRealtimeChannelDefinition(input.channel);

    const hint = createRealtimeHint(input);
    assertHintIsMetadataOnly(hint);

    await this.bus.publish(hint);
    incRealtimeMetric("publishes");
    noteRealtimeEvent("realtime_hint_published", {
      channel: hint.channel,
      restaurantId: hint.restaurantId,
      type: hint.type,
      seq: hint.seq,
      correlationId: hint.correlationId,
    });
    return hint;
  }
}
